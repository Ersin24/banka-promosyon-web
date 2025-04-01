// routes/likes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const {verifyToken} = require('../middlewares/auth.js')
const router = express.Router();

// POST /api/likes - Bir post için beğeni ekle (aynı kullanıcı aynı postu birden beğenemesin)
router.post('/', verifyToken, async (req, res) => {
  const { post_id } = req.body;
  if (!post_id) return res.status(400).json({ error: 'post_id is required' });
  try {
    // Aynı kullanıcının aynı postu daha önce beğenip beğenmediğini kontrol et
    const existing = await pool.query(
      'SELECT * FROM likes WHERE post_id = $1 AND user_id = $2',
      [post_id, req.userId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already liked' });
    }
    const result = await pool.query(
      'INSERT INTO likes (post_id, user_id) VALUES ($1, $2) RETURNING *',
      [post_id, req.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/likes - Kullanıcının bir post için beğenisini kaldır (query param: post_id)
router.delete('/', verifyToken, async (req, res) => {
  const { post_id } = req.query;
  if (!post_id) return res.status(400).json({ error: 'post_id is required' });
  try {
    const result = await pool.query(
      'DELETE FROM likes WHERE post_id = $1 AND user_id = $2 RETURNING *',
      [post_id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Like not found' });
    }
    res.json({ message: 'Like removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/likes?post_id=... - Belirli bir postun beğeni sayısını döndür
router.get('/', async (req, res) => {
  const { post_id } = req.query;
  if (!post_id) return res.status(400).json({ error: 'post_id is required' });
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM likes WHERE post_id = $1',
      [post_id]
    );
    res.json({ likes: result.rows[0].count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
