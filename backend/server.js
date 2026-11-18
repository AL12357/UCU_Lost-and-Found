const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const db = require('./db');
const { authenticateToken, requireAdmin } = require('./middleware/auth');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage });

// 1. AUTHENTICATION ENDPOINTS
app.post('/api/register', async (req, res) => {
  try {
    const { full_name, reg_no, email, password } = req.body;
    if (!full_name || !reg_no || !email || !password || password.length < 6) {
      return res.status(400).json({ error: 'All fields are required and password must be at least 6 characters.' });
    }
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (full_name, reg_no, email, password_hash, role) VALUES (?, ?, ?, ?, "STUDENT")',
      [full_name.trim(), reg_no.trim(), email.trim(), hash]
    );
    res.status(201).json({ message: 'Registration successful. You may now log in.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Registration number or email already exists.' });
    }
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password.' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign(
      { user_id: user.user_id, full_name: user.full_name, role: user.role, reg_no: user.reg_no },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, user: { user_id: user.user_id, full_name: user.full_name, role: user.role, reg_no: user.reg_no } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed due to server error.' });
  }
});

// 2. ITEMS & SEARCH ENDPOINTS
app.get('/api/items', authenticateToken, async (req, res) => {
  try {
    const { keyword, category, location, date, type } = req.query;
    let sql = `
      SELECT i.item_id, i.reporter_id, i.report_type, i.title, i.category, 
             i.public_description, i.campus_location, i.incident_date, i.image_url, i.status,
             u.full_name AS reporter_name,
             CASE WHEN ? = 'ADMIN' OR i.reporter_id = ? THEN i.private_details ELSE NULL END AS private_details
      FROM items i
      JOIN users u ON i.reporter_id = u.user_id
      WHERE 1=1
    `;
    const params = [req.user.role, req.user.user_id];

    if (keyword) {
      sql += ' AND (i.title LIKE ? OR i.public_description LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (category) { sql += ' AND i.category = ?'; params.push(category); }
    if (location) { sql += ' AND i.campus_location LIKE ?'; params.push(`%${location}%`); }
    if (date) { sql += ' AND i.incident_date = ?'; params.push(date); }
    if (type) { sql += ' AND i.report_type = ?'; params.push(type); }

    sql += ' ORDER BY i.created_at DESC';
    const [items] = await db.query(sql, params);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve items.' });
  }
});

app.post('/api/items', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { report_type, title, category, public_description, private_details, campus_location, incident_date } = req.body;
    if (!report_type || !title || !category || !public_description || !campus_location || !incident_date) {
      return res.status(400).json({ error: 'All required fields must be filled.' });
    }
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    await db.query(
      `INSERT INTO items (reporter_id, report_type, title, category, public_description, private_details, campus_location, incident_date, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.user_id, report_type, title, category, public_description, private_details || null, campus_location, incident_date, image_url]
    );
    res.status(201).json({ message: 'Report submitted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Error creating item report.' });
  }
});

app.put('/api/items/:id', authenticateToken, async (req, res) => {
  try {
    const [existing] = await db.query('SELECT * FROM items WHERE item_id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Item not found.' });
    if (existing[0].reporter_id !== req.user.user_id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You may only edit your own reports.' });
    }
    const { title, category, public_description, private_details, campus_location, incident_date } = req.body;
    await db.query(
      `UPDATE items SET title=?, category=?, public_description=?, private_details=?, campus_location=?, incident_date=? WHERE item_id=?`,
      [title, category, public_description, private_details, campus_location, incident_date, req.params.id]
    );
    res.json({ message: 'Report updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update report.' });
  }
});

// 3. CLAIMS & ADMIN WORKFLOW ENDPOINTS
app.post('/api/claims', authenticateToken, async (req, res) => {
  try {
    const { item_id, evidence_text } = req.body;
    if (!item_id || !evidence_text || evidence_text.trim().length < 5) {
      return res.status(400).json({ error: 'Please provide clear private ownership evidence.' });
    }
    const [items] = await db.query('SELECT * FROM items WHERE item_id = ?', [item_id]);
    if (items.length === 0) return res.status(404).json({ error: 'Item not found.' });

    const item = items[0];
    if (item.report_type !== 'FOUND') return res.status(400).json({ error: 'Claims can only be submitted on FOUND items.' });
    if (item.reporter_id === req.user.user_id) return res.status(403).json({ error: 'You cannot claim an item you reported as found.' });
    if (item.status !== 'OPEN') return res.status(400).json({ error: 'This item already has an approved claim or has been returned.' });

    await db.query(
      'INSERT INTO claims (item_id, claimant_id, evidence_text) VALUES (?, ?, ?)',
      [item_id, req.user.user_id, evidence_text.trim()]
    );
    res.status(201).json({ message: 'Ownership claim submitted privately for administrator review.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit claim.' });
  }
});

app.get('/api/claims', authenticateToken, async (req, res) => {
  try {
    let sql = `
      SELECT c.*, i.title AS item_title, i.campus_location, i.status AS item_status,
             i.private_details AS item_private_details, u.full_name AS claimant_name, u.reg_no AS claimant_reg
      FROM claims c
      JOIN items i ON c.item_id = i.item_id
      JOIN users u ON c.claimant_id = u.user_id
    `;
    const params = [];
    if (req.user.role !== 'ADMIN') {
      sql += ' WHERE c.claimant_id = ?';
      params.push(req.user.user_id);
    }
    sql += ' ORDER BY c.created_at DESC';
    const [claims] = await db.query(sql, params);
    res.json(claims);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claims.' });
  }
});

app.patch('/api/claims/:id/review', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { decision, admin_reason } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(decision) || !admin_reason) {
      return res.status(400).json({ error: 'Decision and reason are required.' });
    }
    const [claims] = await db.query('SELECT * FROM claims WHERE claim_id = ?', [req.params.id]);
    if (claims.length === 0) return res.status(404).json({ error: 'Claim not found.' });

    const claim = claims[0];
    if (decision === 'APPROVED') {
      const [approved] = await db.query(
        'SELECT * FROM claims WHERE item_id = ? AND status = "APPROVED"', [claim.item_id]
      );
      if (approved.length > 0) {
        return res.status(400).json({ error: 'Another claim has already been approved for this item.' });
      }
      await db.query('UPDATE items SET status = "CLAIM_APPROVED" WHERE item_id = ?', [claim.item_id]);
    }

    await db.query(
      'UPDATE claims SET status = ?, admin_reason = ?, reviewed_by = ? WHERE claim_id = ?',
      [decision, admin_reason, req.user.user_id, req.params.id]
    );
    res.json({ message: `Claim ${decision.toLowerCase()} successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Error reviewing claim.' });
  }
});

app.patch('/api/items/:id/return', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.query('UPDATE items SET status = "RETURNED" WHERE item_id = ?', [req.params.id]);
    res.json({ message: 'Item officially marked as RETURNED.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark item as returned.' });
  }
});

app.post('/api/seed-passwords', async (req, res) => {
  const hash = await bcrypt.hash('Password123!', 10);
  await db.query('UPDATE users SET password_hash = ?', [hash]);
  res.json({ message: 'All demo account passwords set to: Password123!' });
});

app.listen(process.env.PORT, () => console.log(`UCU Lost & Found API running on port ${process.env.PORT}`));
