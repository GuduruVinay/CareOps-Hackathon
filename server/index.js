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
  // You can expand this to send real emails too
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

// 8. POST Trigger Reminder (Email with Calendar Link)
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

    // --- GENERATE GOOGLE CALENDAR LINK ---
    const startTime = new Date(booking.start_time);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Default: 1 Hour duration

    // Helper to format date as YYYYMMDDTHHmmssZ
    const formatGCalTime = (date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");

    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(booking.service_type + " Appointment")}&dates=${formatGCalTime(startTime)}/${formatGCalTime(endTime)}&details=${encodeURIComponent("Appointment with CareOps for " + booking.service_type)}`;

    // --- EMAIL HANDLER (SendGrid) ---
    if (type === 'email') {
      if (process.env.SENDGRID_API_KEY) {
        const msg = {
          to: booking.email,
          from: process.env.SENDGRID_FROM_EMAIL,
          subject: `Reminder: ${booking.service_type} on ${dateStr}`,
          text: `Hi ${booking.name}, don't forget your ${booking.service_type} on ${dateStr}.`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #2563eb;">Appointment Reminder</h2>
              <p>Hi <strong>${booking.name}</strong>,</p>
              <p>This is a friendly reminder for your upcoming appointment:</p>
              
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Service:</strong> ${booking.service_type}</p>
                <p style="margin: 5px 0;"><strong>Time:</strong> ${dateStr}</p>
              </div>

              <a href="${gCalUrl}" style="background-color: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                📅 Add to Google Calendar
              </a>
              
              <p style="margin-top: 30px; font-size: 12px; color: #888;">
                If you need to reschedule, please contact us.
              </p>
            </div>
          `,
        };
        await sgMail.send(msg);
        console.log(`[SendGrid] Email sent to ${booking.email} with Calendar Link`);
      } else {
        console.warn("[SendGrid] Missing API Key - Mocking Email");
      }
    } 
    
    // Skip SMS logic since you don't have a number yet
    
    res.json({ success: true, message: `Email sent to ${booking.name}` });
  } catch (err) {
    console.error("Reminder Error:", err.message);
    res.status(500).send("Server Error");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});