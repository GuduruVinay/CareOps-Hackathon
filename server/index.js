require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

// --- 1. EMAIL & SMS CONFIGURATION ---
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn("⚠️  Missing SENDGRID_API_KEY. Emails will not be sent.");
}

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

async function runAutomation(triggerType, data) {
  console.log(`[AUTOMATION TRIGGERED] Type: ${triggerType}`, data);
}

// --- ROUTES ---

// 1. GET Dashboard Stats (UPDATED)
app.get('/api/dashboard/:workspaceId', async (req, res) => {
  const { workspaceId } = req.params;
  try {
    // 1. Confirmed Upcoming
    const bookingsQuery = pool.query(
      "SELECT COUNT(*) FROM bookings WHERE workspace_id = $1 AND start_time > NOW() AND status = 'CONFIRMED'", 
      [workspaceId]
    );
    // 2. Pending/Unconfirmed
    const pendingBookingsQuery = pool.query(
      "SELECT COUNT(*) FROM bookings WHERE workspace_id = $1 AND status = 'PENDING'", 
      [workspaceId]
    );
    // 3. Low Stock
    const lowStockQuery = pool.query(
      'SELECT COUNT(*) FROM inventory WHERE workspace_id = $1 AND quantity < low_stock_threshold', 
      [workspaceId]
    );
    // 4. Inbound Messages
    const messagesQuery = pool.query(
      "SELECT COUNT(*) FROM messages WHERE direction = $1", 
      ['INBOUND']
    );
    // 5. Incomplete Forms (Upcoming only)
    const formsQuery = pool.query(
      "SELECT COUNT(*) FROM bookings WHERE workspace_id = $1 AND intake_status != 'COMPLETED' AND start_time > NOW()", 
      [workspaceId]
    );
    // 6. Staff
    const staffQuery = pool.query(
      "SELECT COUNT(*) FROM staff WHERE workspace_id = $1 AND status = 'Active'", 
      [workspaceId]
    );

    const [bookings, pendingBookings, lowStock, messages, forms, staff] = await Promise.all([
        bookingsQuery, pendingBookingsQuery, lowStockQuery, messagesQuery, formsQuery, staffQuery
    ]);

    res.json({
      upcoming_bookings: parseInt(bookings.rows[0].count),
      pending_bookings: parseInt(pendingBookings.rows[0].count), // NEW
      low_stock_items: parseInt(lowStock.rows[0].count),
      unread_messages: parseInt(messages.rows[0].count),
      pending_forms: parseInt(forms.rows[0].count), // NEW
      active_staff: parseInt(staff.rows[0].count)
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
      `SELECT b.id, b.service_type, b.start_time, b.status, b.intake_status, c.name, c.email, c.phone 
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

// 8. POST Trigger Reminder (UPDATED EMAIL TEMPLATE)
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

    if (bookingRes.rows.length === 0) return res.status(404).json({ error: "Booking not found" });

    const booking = bookingRes.rows[0];
    const dbDate = new Date(booking.start_time);
    const istOffset = 19800000; 
    const istDate = new Date(dbDate.getTime() + istOffset);
    
    const dateStr = istDate.toLocaleString('en-US', { 
        timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
        hour: 'numeric', minute: '2-digit', hour12: true 
    });

    const intakeFormUrl = `http://localhost:3000/form/${booking.id}`;
    
    // Calendar Logic
    const startTime = new Date(booking.start_time);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); 
    const formatGCalTime = (date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(booking.service_type)}&dates=${formatGCalTime(startTime)}/${formatGCalTime(endTime)}&details=${encodeURIComponent("Intake Form: " + intakeFormUrl)}`;

    if (type === 'email' && process.env.SENDGRID_API_KEY) {
        const msg = {
          to: booking.email,
          from: process.env.SENDGRID_FROM_EMAIL,
          subject: `✅ Confirmed: ${booking.service_type} on ${dateStr}`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
              
              <div style="background-color: #2563eb; padding: 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Booking Confirmed!</h1>
              </div>

              <div style="padding: 32px 24px;">
                <p style="font-size: 16px; color: #374151; margin-top: 0;">Hi <strong>${booking.name}</strong>,</p>
                <p style="font-size: 16px; color: #374151;">Your appointment is officially scheduled.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 24px 0; text-align: center; border: 1px solid #e5e7eb;">
                  <p style="margin: 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Date & Time</p>
                  <p style="margin: 8px 0 4px 0; font-size: 20px; color: #111827; font-weight: bold;">${dateStr}</p>
                  <p style="margin: 0; color: #2563eb; font-weight: 500;">${booking.service_type}</p>
                </div>

                <div style="margin-bottom: 20px; text-align: center;">
                  <p style="color: #dc2626; font-weight: bold; font-size: 14px; margin-bottom: 12px;">Action Required:</p>
                  <a href="${intakeFormUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Complete Intake Form
                  </a>
                </div>

                <div style="text-align: center;">
                  <a href="${gCalUrl}" style="display: inline-block; background-color: #ffffff; color: #374151; padding: 12px 24px; text-decoration: none; border: 2px solid #e5e7eb; border-radius: 8px; font-weight: 600; font-size: 14px;">
                    📅 Add to Google Calendar
                  </a>
                </div>
              </div>
              
              <div style="background-color: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0;">Need to reschedule? Reply to this email.</p>
              </div>
            </div>
          `,
        };
        await sgMail.send(msg);
    } 
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// 9. AI ASSISTANT ENDPOINT
app.get('/api/assistant', async (req, res) => {
  const { query, context, workspaceId = 1 } = req.query; 
  const lowerQuery = query.toLowerCase();
  
  let responseText = "I'm not sure how to help with that. Try one of the options below.";
  let suggestions = [];

  const adminSuggestions = ["Show today's bookings", "Check low stock items", "System status"];
  const customerSuggestions = ["Book an appointment", "Check pricing", "Available slots?", "Reschedule booking", "Contact Support"];

  try {
    if (context === 'admin') {
      suggestions = adminSuggestions; 
      if (lowerQuery.includes('today') || lowerQuery.includes('booking')) {
        const result = await pool.query(
          `SELECT c.name, b.start_time, b.service_type FROM bookings b JOIN contacts c ON b.contact_id = c.id WHERE b.workspace_id = $1 AND b.start_time::date = CURRENT_DATE ORDER BY b.start_time ASC`, [workspaceId]
        );
        if (result.rows.length > 0) {
          const list = result.rows.map(r => `• ${new Date(r.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}: ${r.name} (${r.service_type})`).join('\n');
          responseText = `📅 **Today's Schedule:**\n${list}`;
        } else {
          responseText = "📅 You have no bookings scheduled for today.";
        }
      } 
      else if (lowerQuery.includes('stock') || lowerQuery.includes('low')) {
        const result = await pool.query(`SELECT item_name, quantity FROM inventory WHERE workspace_id = $1 AND quantity < low_stock_threshold`, [workspaceId]);
        if (result.rows.length > 0) {
          const list = result.rows.map(i => `• ${i.item_name}: ${i.quantity} left`).join('\n');
          responseText = `⚠️ **Low Stock Alert:**\n${list}`;
        } else {
          responseText = "✅ All inventory levels are healthy.";
        }
      } 
      else if (lowerQuery.includes('status')) {
        responseText = "✅ **System Online**\nDatabase: Connected\nTimezone: UTC (Auto-converted to IST)";
      }
      else {
        responseText = "Hello Admin! I can help you monitor your clinic operations. Select an option below:";
      }
    } 
    else if (context === 'customer') {
      suggestions = customerSuggestions;
      if (lowerQuery.includes('price') || lowerQuery.includes('cost')) {
        responseText = "💰 **Our Pricing:**\n• General Checkup: $50\n• Specialist Consultation: $120\n• Follow-up Visit: $30";
      }
      else if (lowerQuery.includes('book') || lowerQuery.includes('appointment')) {
        responseText = "🗓️ **To book:**\nSimply select a service from the list on the left, choose a date, and pick a time slot.";
      }
      else if (lowerQuery.includes('slot') || lowerQuery.includes('avail')) {
        responseText = "🕒 **Availability:**\nYou can see real-time availability on the calendar.";
      }
      else if (lowerQuery.includes('reschedule') || lowerQuery.includes('cancel')) {
        responseText = "🔄 **Rescheduling:**\nPlease check your confirmation email for a reschedule link.";
      }
      else if (lowerQuery.includes('support') || lowerQuery.includes('help')) {
        responseText = "📞 **Support:**\nYou can reach us at support@careops.com.";
      }
      else {
        responseText = "👋 I am the CareOps virtual assistant. I can help you with pricing, scheduling, and general questions.";
      }
    }
    res.json({ reply: responseText, suggestions: suggestions, action: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Server error.", suggestions: [] });
  }
});

// 10. LOGIN
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (email === (process.env.ADMIN_EMAIL || 'admin@careops.com') && password === (process.env.ADMIN_PASSWORD || 'admin123')) {
    res.json({ success: true, token: 'mock-admin-token-123', user: { name: 'Admin User', email } });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// 11. CANCEL BOOKING
app.put('/api/bookings/:id/cancel', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`UPDATE bookings SET status = 'CANCELLED' WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Booking not found" });

    const booking = result.rows[0];
    const contactRes = await pool.query(`SELECT * FROM contacts WHERE id = $1`, [booking.contact_id]);
    const contact = contactRes.rows[0];
    
    const dbDate = new Date(booking.start_time);
    const istOffset = 19800000;
    const istDate = new Date(dbDate.getTime() + istOffset);
    const bookingDate = istDate.toLocaleString('en-US', { timeZone: 'UTC', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

    if (process.env.SENDGRID_API_KEY) {
        const msg = {
          to: contact.email,
          from: process.env.SENDGRID_FROM_EMAIL,
          subject: `❌ Cancelled: ${booking.service_type}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
              <h2 style="color: #dc2626; text-align: center;">Appointment Cancelled</h2>
              <p style="text-align: center; color: #4b5563;">Hi <strong>${contact.name}</strong>,</p>
              <p style="text-align: center; color: #4b5563;">
                Your appointment for <strong>${booking.service_type}</strong> on <strong>${bookingDate}</strong> has been cancelled.
              </p>
              <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; margin: 24px 0; border: 1px solid #fecaca; text-align: center;">
                <p style="margin: 0; color: #991b1b; font-weight: bold;">If this was a mistake, please contact us.</p>
              </div>
              <p style="text-align: center; color: #9ca3af; font-size: 14px;">Regards,<br/>CareOps Team</p>
            </div>
          `
        };
        await sgMail.send(msg);
    }
    res.json({ success: true, booking: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// 12. WORKSPACE SETTINGS
app.get('/api/workspace/:id', (req, res) => res.json({ name: "CareOps", business_hours_start: "09:00", business_hours_end: "17:00" }));
app.put('/api/workspace/:id', (req, res) => res.json({ success: true }));

// 13. INTAKE FORM
app.get('/api/booking/:id', async (req, res) => {
  try {
    const result = await pool.query(`SELECT b.id, b.service_type, b.start_time, c.name, c.email FROM bookings b JOIN contacts c ON b.contact_id = c.id WHERE b.id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send("Server Error"); }
});

app.post('/api/bookings/:id/intake', async (req, res) => {
  const { id } = req.params;
  const formData = req.body;
  try {
    await pool.query(`UPDATE bookings SET intake_status = 'COMPLETED' WHERE id = $1`, [id]);
    console.log(`📝 Intake Received for Booking ${id}:`, formData);
    runAutomation('INTAKE_SUBMITTED', { bookingId: id, data: formData });
    res.json({ success: true, message: "Intake saved" });
  } catch (err) { res.status(500).send("Failed to save intake"); }
});

// 14. INVENTORY ITEM DETAILS
app.get('/api/inventory/item/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM inventory WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    const item = result.rows[0];
    const mockMonthlyUsage = 50 + ((item.id * 17) % 400); 
    let status = item.quantity === 0 ? 'Out of Stock' : (item.quantity < item.low_stock_threshold ? 'Low Stock' : 'In Stock');
    res.json({ ...item, status, monthly_usage: mockMonthlyUsage, last_restock: new Date(Date.now() - (item.id * 86400000)).toLocaleDateString() });
  } catch (err) { res.status(500).send("Server Error"); }
});

// 15. UPDATE BOOKING STATUS
app.put('/api/bookings/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; 
  try {
    const result = await pool.query(`UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *`, [status, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Booking not found" });
    res.json({ success: true, booking: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// 16. GET STAFF LIST
app.get('/api/staff/:workspaceId', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM staff WHERE workspace_id = $1 ORDER BY id ASC', [req.params.workspaceId]);
    res.json(result.rows);
  } catch (err) { res.status(500).send("Server Error"); }
});

// 17. INVITE STAFF
app.post('/api/staff', async (req, res) => {
  const { workspace_id, name, email, role, permissions } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO staff (workspace_id, name, email, role, permissions, status) VALUES ($1, $2, $3, $4, $5, 'Invited') RETURNING *`,
      [workspace_id, name, email, role, permissions]
    );
    // Send Invitation Email Logic Here (Mocked)
    console.log(`📧 Invitation sent to ${email}`);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send("Failed to invite staff"); }
});

// 18. UPDATE STAFF PERMISSIONS
app.put('/api/staff/:id', async (req, res) => {
  const { permissions, role } = req.body;
  try {
    const result = await pool.query(
      `UPDATE staff SET permissions = $1, role = COALESCE($2, role) WHERE id = $3 RETURNING *`,
      [permissions, role, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send("Failed to update staff"); }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});