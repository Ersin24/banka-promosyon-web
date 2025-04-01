// routes/moderation.js
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = express.Router();

// JWT doğrulama middleware'i (verifyToken) - auth.js ile aynı
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET || 'secretkey', (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.userId = decoded.userId;
    next();
  });
};

// Admin kontrolü middleware'i (verifyAdmin) - auth.js ile aynı
const verifyAdmin = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT is_admin FROM admins WHERE id = $1', [req.userId]);
    const adminData = result.rows[0];
    if (!adminData || !adminData.is_admin) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/moderation/users/:id/block - Kullanıcıyı engelle (örneğin, yorum yapmasını kısıtlamak için)
router.put('/users/:id/block', verifyToken, verifyAdmin, async (req, res) => {
  const userId = req.params.id;
  try {
    const result = await pool.query(
      'UPDATE users SET is_blocked = true WHERE id = $1 RETURNING *',
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User blocked successfully', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/moderation/users/:id/unblock - Kullanıcının engelini kaldır
router.put('/users/:id/unblock', verifyToken, verifyAdmin, async (req, res) => {
  const userId = req.params.id;
  try {
    const result = await pool.query(
      'UPDATE users SET is_blocked = false WHERE id = $1 RETURNING *',
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User unblocked successfully', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ek olarak, admin şikayetleri görebilir, yorumları kaldırabilir veya ilgili işlemleri yapabilir.
// Örneğin: DELETE /api/moderation/comments/:id - Admin, bir yorumu kaldırabilir.
router.delete('/comments/:id', verifyToken, verifyAdmin, async (req, res) => {
  const commentId = req.params.id;
  try {
    const result = await pool.query('DELETE FROM comments WHERE id = $1 RETURNING *', [commentId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Comment not found' });
    res.json({ message: 'Comment deleted successfully', comment: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
