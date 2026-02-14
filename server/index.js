require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

// --- 1. EMAIL & SMS CONFIGURATION ---
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn("⚠️  Missing SENDGRID_API_KEY. Emails will not be sent.");
}

// Initialize Twilio
let twilioClient;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URI,
  ssl: { rejectUnauthorized: false }
});

// --- HELPER: Mock Automation Logic ---
async function runAutomation(triggerType, data) {
  console.log(`[AUTOMATION TRIGGERED] Type: ${triggerType}`);
}

// --- ROUTES ---

// 1. GET Dashboard Stats
app.get('/api/dashboard/:workspaceId', async (req, res) => {
  const { workspaceId } = req.params;
  try {
    const bookingsQuery = pool.query('SELECT COUNT(*) FROM bookings WHERE workspace_id = $1 AND start_time > NOW()', [workspaceId]);
    const lowStockQuery = pool.query('SELECT COUNT(*) FROM inventory WHERE workspace_id = $1 AND quantity < low_stock_threshold', [workspaceId]);
    const messagesQuery = pool.query('SELECT COUNT(*) FROM messages WHERE direction = $1', ['INBOUND']);
    const [bookings, lowStock, messages] = await Promise.all([bookingsQuery, lowStockQuery, messagesQuery]);

    res.json({
      upcoming_bookings: parseInt(bookings.rows[0].count),
      low_stock_items: parseInt(lowStock.rows[0].count),
      unread_messages: parseInt(messages.rows[0].count)
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// 2. GET All Bookings
app.get('/api/bookings/:workspaceId', async (req, res) => {
  const { workspaceId } = req.params;
  try {
    const allBookings = await pool.query(
      `SELECT b.id, b.service_type, b.start_time, b.status, c.name, c.email, c.phone 
       FROM bookings b 
       JOIN contacts c ON b.contact_id = c.id 
       WHERE b.workspace_id = $1 
       ORDER BY b.start_time ASC`,
      [workspaceId]
    );
    res.json(allBookings.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// 3. GET Inventory List
app.get(['/api/inventory', '/api/inventory/:workspaceId'], async (req, res) => {
  const workspaceId = req.params.workspaceId || 1;
  try {
    const result = await pool.query('SELECT * FROM inventory WHERE workspace_id = $1 ORDER BY item_name ASC', [workspaceId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 4. POST New Booking
app.post('/api/bookings', async (req, res) => {
  const { workspace_id, name, email, service_type, start_time } = req.body;
  try {
    await pool.query('BEGIN');
    let contactRes = await pool.query('SELECT id FROM contacts WHERE email = $1 AND workspace_id = $2', [email, workspace_id]);
    let contact_id;
    if (contactRes.rows.length > 0) {
      contact_id = contactRes.rows[0].id;
    } else {
      const newContact = await pool.query('INSERT INTO contacts (workspace_id, name, email) VALUES ($1, $2, $3) RETURNING id', [workspace_id, name, email]);
      contact_id = newContact.rows[0].id;
    }
    const newBooking = await pool.query(
      'INSERT INTO bookings (workspace_id, contact_id, service_type, start_time, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [workspace_id, contact_id, service_type, start_time, 'CONFIRMED']
    );
    const invUpdate = await pool.query('UPDATE inventory SET quantity = quantity - 1 WHERE workspace_id = $1 AND item_name = $2 RETURNING *', [workspace_id, 'Gloves']);
    if (invUpdate.rows.length > 0 && invUpdate.rows[0].quantity < invUpdate.rows[0].low_stock_threshold) {
        runAutomation('LOW_STOCK', invUpdate.rows[0]);
    }
    await pool.query('COMMIT');
    runAutomation('NEW_BOOKING', { email, service_type });
    res.json(newBooking.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// 5. GET Inbox Messages
app.get('/api/inbox/:workspaceId', async (req, res) => {
  const { workspaceId } = req.params;
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (c.id) c.id as contact_id, c.name, c.email, m.content as last_message, m.created_at, m.direction
       FROM contacts c JOIN messages m ON c.id = m.contact_id WHERE c.workspace_id = $1 ORDER BY c.id, m.created_at DESC`,
      [workspaceId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// 6. POST Restock Item
app.post('/api/inventory/:itemId/restock', async (req, res) => {
  const { amount } = req.body;
  try {
    await pool.query('UPDATE inventory SET quantity = quantity + $1 WHERE id = $2', [amount, req.params.itemId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 7. PUT Update Inventory Item
app.put('/api/inventory/:id', async (req, res) => {
  const { low_stock_threshold, target_capacity } = req.body;
  try {
    await pool.query(
      `UPDATE inventory SET low_stock_threshold = COALESCE($1, low_stock_threshold), target_capacity = COALESCE($2, target_capacity) WHERE id = $3`,
      [low_stock_threshold, target_capacity, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 8. POST Trigger Reminder (Email with Intake Form + Calendar)
// FIXED: Uses sgMail and includes Form Link
app.post('/api/bookings/:id/remind', async (req, res) => {
  const { type } = req.body; 
  
  try {
    const bookingRes = await pool.query(
      `SELECT b.*, c.name, c.email, c.phone 
       FROM bookings b 
       JOIN contacts c ON b.contact_id = c.id 
       WHERE b.id = $1`,
      [req.params.id]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = bookingRes.rows[0];
    const dateObj = new Date(booking.start_time);
    const dateStr = dateObj.toLocaleString();

    // Generate Links
    // NOTE: In production, change localhost:3000 to your real frontend URL
    const intakeFormUrl = `http://localhost:3000/form/${booking.id}`;
    const startTime = new Date(booking.start_time);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); 
    const formatGCalTime = (date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(booking.service_type)}&dates=${formatGCalTime(startTime)}/${formatGCalTime(endTime)}&details=${encodeURIComponent("Intake Form: " + intakeFormUrl)}`;

    if (type === 'email') {
      if (process.env.SENDGRID_API_KEY) {
        const msg = {
          to: booking.email,
          from: process.env.SENDGRID_FROM_EMAIL, // Must be verified sender
          subject: `✅ Confirmed: ${booking.service_type} on ${dateStr}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #2563eb;">Booking Confirmed!</h2>
              <p>Hi <strong>${booking.name}</strong>,</p>
              <p>Your appointment for <strong>${booking.service_type}</strong> is confirmed.</p>
              
              <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>📅 Date:</strong> ${dateStr}</p>
              </div>

              <p style="color: #dc2626; font-weight: bold;">Action Required:</p>
              <p>Please complete your intake form before arriving:</p>
              <a href="${intakeFormUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Complete Intake Form &rarr;
              </a>

              <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
              
              <p>
                <a href="${gCalUrl}" style="color: #2563eb; text-decoration: none;">Add to Google Calendar</a>
              </p>
            </div>
          `,
        };
        await sgMail.send(msg);
        console.log(`[SendGrid] Reminder sent to ${booking.email}`);
      } else {
        console.warn("[SendGrid] Missing API Key - Mocking Email");
      }
    } 
    
    res.json({ success: true, message: `Email sent to ${booking.name}` });
  } catch (err) {
    console.error("Reminder Error:", err.message);
    res.status(500).send("Server Error");
  }
});

// 9. AI ASSISTANT ENDPOINT
app.get('/api/assistant', async (req, res) => {
  const { query, context, workspaceId = 1 } = req.query; 
  const lowerQuery = query.toLowerCase();
  let responseText = "I'm not sure how to help with that.";

  try {
    if (context === 'admin') {
      if (lowerQuery.includes('today') || lowerQuery.includes('booking')) {
        const result = await pool.query(
          `SELECT c.name, b.start_time, b.service_type FROM bookings b JOIN contacts c ON b.contact_id = c.id WHERE b.workspace_id = $1 AND b.start_time::date = CURRENT_DATE ORDER BY b.start_time ASC`, [workspaceId]
        );
        if (result.rows.length > 0) {
          const list = result.rows.map(r => `• ${new Date(r.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}: ${r.name} (${r.service_type})`).join('\n');
          responseText = `You have ${result.rows.length} booking(s) today:\n${list}`;
        } else {
          responseText = "You have no bookings scheduled for today.";
        }
      } else if (lowerQuery.includes('stock') || lowerQuery.includes('low')) {
        const result = await pool.query(`SELECT item_name, quantity FROM inventory WHERE workspace_id = $1 AND quantity < low_stock_threshold`, [workspaceId]);
        if (result.rows.length > 0) {
          const list = result.rows.map(i => `• ${i.item_name}: ${i.quantity}`).join('\n');
          responseText = `⚠️ Low stock alert:\n${list}`;
        } else {
          responseText = "✅ All inventory levels are healthy.";
        }
      } else if (lowerQuery.includes('status')) {
        responseText = "✅ System Online. Database connected.";
      }
    }
    res.json({ reply: responseText, action: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Server error." });
  }
});

// 10. LOGIN ENDPOINT
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@careops.com';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    res.json({ success: true, token: 'mock-admin-token-123', user: { name: 'Admin User', email: ADMIN_EMAIL } });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// 11. CANCEL BOOKING ENDPOINT
// FIXED: Uses sgMail instead of transporter
app.put('/api/bookings/:id/cancel', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Update Status in DB
    const result = await pool.query(
      `UPDATE bookings SET status = 'CANCELLED' WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // 2. Fetch Contact Details
    const booking = result.rows[0];
    const contactRes = await pool.query(`SELECT * FROM contacts WHERE id = $1`, [booking.contact_id]);
    const contact = contactRes.rows[0];
    const bookingDate = new Date(booking.start_time).toLocaleString();

    // 3. Send Cancellation Email (Using SendGrid)
    if (process.env.SENDGRID_API_KEY) {
        const msg = {
          to: contact.email,
          from: process.env.SENDGRID_FROM_EMAIL, // Must be verified sender
          subject: `❌ Cancelled: ${booking.service_type} on ${bookingDate}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
              <h2 style="color: #dc2626;">Appointment Cancelled</h2>
              <p>Hi <strong>${contact.name}</strong>,</p>
              <p>Your appointment for <strong>${booking.service_type}</strong> scheduled for <strong>${bookingDate}</strong> has been cancelled.</p>
              <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
                <p style="margin: 0; color: #991b1b;">If this was a mistake, please contact us or reply to this email.</p>
              </div>
              <p>Regards,<br/>CareOps Team</p>
            </div>
          `
        };
        await sgMail.send(msg);
        console.log(`Cancellation email sent to ${contact.email}`);
    } else {
        console.log("SendGrid Key missing. Email skipped.");
    }

    res.json({ success: true, booking: result.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// 12. GET/PUT Settings
app.get('/api/workspace/:id', (req, res) => {
    res.json({ name: "Demo Clinic", business_hours_start: "09:00", business_hours_end: "17:00" });
});
app.put('/api/workspace/:id', (req, res) => {
    res.json({ success: true });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});