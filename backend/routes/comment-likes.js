// routes/comment-likes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const {verifyToken} = require('../middlewares/auth.js')
const router = express.Router();

// POST /api/comment-likes - Bir yorum için beğeni ekle
router.post('/', verifyToken, async (req, res) => {
  const { comment_id } = req.body;
  if (!comment_id)
    return res.status(400).json({ error: 'comment_id is required' });
  try {
    // Aynı kullanıcının aynı yorumu daha önce beğenip beğenmediğini kontrol et
    const existing = await pool.query(
      'SELECT * FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
      [comment_id, req.userId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already liked' });
    }
    const result = await pool.query(
      'INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2) RETURNING *',
      [comment_id, req.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/comment-likes - Kullanıcının yorum beğenisini kaldır (query param: comment_id)
router.delete('/', verifyToken, async (req, res) => {
  const { comment_id } = req.query;
  if (!comment_id)
    return res.status(400).json({ error: 'comment_id query parameter is required' });
  try {
    const result = await pool.query(
      'DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2 RETURNING *',
      [comment_id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Like not found' });
    }
    res.json({ message: 'Like removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
