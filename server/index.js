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
    rejectUnauthorized: false // Required for Supabase
  }
});

// --- HELPER: Mock Automation Logic ---
// In a real app, this would send an email via SendGrid/Resend
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

// 1. GET Dashboard Stats (For the Admin Dashboard)
app.get('/api/dashboard/:workspaceId', async (req, res) => {
  const { workspaceId } = req.params;
  
  try {
    // Run 3 queries in parallel for speed
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
      unread_messages: parseInt(messages.rows[0].count) // Mocking unread as total inbound for now
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// 2. GET All Bookings (For the Calendar/List View)
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

// 3. POST New Booking (Public facing - Triggers Automation)
app.post('/api/bookings', async (req, res) => {
  const { workspace_id, name, email, service_type, start_time } = req.body;
  
  try {
    // Start a transaction so we do everything or nothing
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
      'INSERT INTO bookings (workspace_id, contact_id, service_type, start_time) VALUES ($1, $2, $3, $4) RETURNING *',
      [workspace_id, contact_id, service_type, start_time]
    );

    // C. Update Inventory (Example: Reduce "Gloves" by 1 pair per booking)
    // In a real app, you'd link services to specific items.
    const invUpdate = await pool.query(
        'UPDATE inventory SET quantity = quantity - 1 WHERE workspace_id = $1 AND item_name = $2 RETURNING *',
        [workspace_id, 'Gloves']
    );

    // D. Check for Low Stock (Automation Trigger)
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

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});