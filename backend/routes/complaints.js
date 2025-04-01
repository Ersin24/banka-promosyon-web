// routes/complaints.js
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const {verifyToken, verifyAdmin} = require('../middlewares/auth.js')
const router = express.Router();


// POST /api/complaints - Şikayet oluştur (giriş yapmış kullanıcılar)
router.post('/', verifyToken, async (req, res) => {
  const { comment_id, reason } = req.body;
  if (!comment_id || !reason) return res.status(400).json({ error: 'comment_id and reason are required' });
  try {
    const result = await pool.query(
      'INSERT INTO complaints (comment_id, user_id, reason) VALUES ($1, $2, $3) RETURNING *',
      [comment_id, req.userId, reason]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/complaints - Tüm şikayetleri getir (Admin only)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM complaints ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/complaints/:id - Şikayeti sil (Admin only)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  const complaintId = req.params.id;
  try {
    const result = await pool.query('DELETE FROM complaints WHERE id = $1 RETURNING *', [complaintId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
