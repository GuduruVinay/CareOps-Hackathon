require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URI,
  ssl: {
    rejectUnauthorized: false // Required for Supabase/Neon/Heroku
  }
});

// --- HELPER: Mock Automation Logic ---
async function runAutomation(triggerType, data) {
  console.log(`[AUTOMATION TRIGGERED] Type: ${triggerType}`);
  
  if (triggerType === 'NEW_BOOKING') {
    console.log(` -> Sending Confirmation Email to: ${data.email}`);
    console.log(` -> Sending Intake Forms to: ${data.email}`);
    console.log(` -> Alerting Staff: New Booking for ${data.service_type}`);
  }
  
  if (triggerType === 'LOW_STOCK') {
    console.log(` -> ALERT: Inventory item ${data.item_name} is below threshold!`);
  }
}

// --- ROUTES ---

// 1. GET Dashboard Stats (Calculated on Server)
app.get('/api/dashboard/:workspaceId', async (req, res) => {
  const { workspaceId } = req.params;
  
  try {
    const bookingsQuery = pool.query(
      'SELECT COUNT(*) FROM bookings WHERE workspace_id = $1 AND start_time > NOW()', 
      [workspaceId]
    );
    const lowStockQuery = pool.query(
      'SELECT COUNT(*) FROM inventory WHERE workspace_id = $1 AND quantity < low_stock_threshold', 
      [workspaceId]
    );
    const messagesQuery = pool.query(
        'SELECT COUNT(*) FROM messages WHERE direction = $1',
        ['INBOUND']
    )

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
      `SELECT b.id, b.service_type, b.start_time, b.status, c.name, c.email 
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

// 3. GET Inventory List (UPDATED TO FIX 404)
// Now accepts calls with OR without the ID (defaults to 1)
app.get(['/api/inventory', '/api/inventory/:workspaceId'], async (req, res) => {
  const workspaceId = req.params.workspaceId || 1; // Default to 1 if missing
  try {
    const result = await pool.query(
      'SELECT * FROM inventory WHERE workspace_id = $1 ORDER BY item_name ASC', 
      [workspaceId]
    );
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

    // A. Create/Find Contact
    let contactRes = await pool.query(
      'SELECT id FROM contacts WHERE email = $1 AND workspace_id = $2',
      [email, workspace_id]
    );
    
    let contact_id;
    if (contactRes.rows.length > 0) {
      contact_id = contactRes.rows[0].id;
    } else {
      const newContact = await pool.query(
        'INSERT INTO contacts (workspace_id, name, email) VALUES ($1, $2, $3) RETURNING id',
        [workspace_id, name, email]
      );
      contact_id = newContact.rows[0].id;
    }

    // B. Create Booking
    const newBooking = await pool.query(
      'INSERT INTO bookings (workspace_id, contact_id, service_type, start_time, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [workspace_id, contact_id, service_type, start_time, 'CONFIRMED']
    );

    // C. Update Inventory
    const invUpdate = await pool.query(
        'UPDATE inventory SET quantity = quantity - 1 WHERE workspace_id = $1 AND item_name = $2 RETURNING *',
        [workspace_id, 'Gloves']
    );

    // D. Check for Low Stock
    if (invUpdate.rows.length > 0 && invUpdate.rows[0].quantity < invUpdate.rows[0].low_stock_threshold) {
        runAutomation('LOW_STOCK', invUpdate.rows[0]);
    }

    await pool.query('COMMIT');

    // E. Run Booking Automation
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
      `SELECT DISTINCT ON (c.id) 
          c.id as contact_id, 
          c.name, 
          c.email, 
          m.content as last_message, 
          m.created_at, 
          m.direction
       FROM contacts c
       JOIN messages m ON c.id = m.contact_id
       WHERE c.workspace_id = $1
       ORDER BY c.id, m.created_at DESC`,
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
      `UPDATE inventory 
       SET low_stock_threshold = COALESCE($1, low_stock_threshold),
           target_capacity = COALESCE($2, target_capacity)
       WHERE id = $3`,
      [low_stock_threshold, target_capacity, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 8. POST Trigger Reminder (Email/SMS)
app.post('/api/bookings/:id/remind', async (req, res) => {
  const { type } = req.body; // 'email' or 'sms'
  try {
    const bookingRes = await pool.query(
      `SELECT b.*, c.name, c.email 
       FROM bookings b 
       JOIN contacts c ON b.contact_id = c.id 
       WHERE b.id = $1`,
      [req.params.id]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = bookingRes.rows[0];

    // --- REAL WORLD INTEGRATION POINT ---
    // Here you would call Twilio or SendGrid
    // Example: await sendgrid.send({ to: booking.email, ... })
    
    // For now, we simulate it:
    console.log(`[REMINDER SENT] Type: ${type}`);
    console.log(` -> To: ${booking.name} (${booking.email})`);
    console.log(` -> Message: Don't forget your ${booking.service_type} on ${new Date(booking.start_time).toLocaleString()}`);

    res.json({ success: true, message: `${type.toUpperCase()} reminder sent to ${booking.name}` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});