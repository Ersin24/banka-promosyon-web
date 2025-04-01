// routes/comments.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const {verifyToken} = require('../middlewares/auth.js')
const pool = require('../db');

// GET /api/comments?post_id=... - Belirli bir posta ait yorumları, token varsa liked bilgisini ekleyerek çek
router.get('/', async (req, res) => {
  const { post_id } = req.query;
  if (!post_id) {
    return res.status(400).json({ error: 'post_id query parameter is required' });
  }
  
  // Eğer istek header'ında token varsa, decode edip currentUserId'yi alıyoruz.
  let currentUserId = null;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
      currentUserId = decoded.userId;
    } catch (err) {
      // Geçersiz token varsa currentUserId null kalır.
    }
  }

  try {
    const query = `
      SELECT c.*, u.username,
        (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) AS like_count,
        CASE 
          WHEN $2::int IS NOT NULL AND EXISTS (
            SELECT 1 FROM comment_likes cl2 
            WHERE cl2.comment_id = c.id AND cl2.user_id = $2
          ) THEN true 
          ELSE false 
        END AS liked
      FROM comments c
      LEFT JOIN usernames u ON c.user_id = u.user_id
      WHERE c.post_id = $1
      ORDER BY c.created_at DESC
    `;
    const values = [post_id, currentUserId];
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/comments - Yeni yorum ekle (sadece giriş yapmış kullanıcılar)
router.post('/', verifyToken, async (req, res) => {
  const { post_id, content } = req.body;
  if (!post_id || !content) {
    return res.status(400).json({ error: 'post_id and content are required' });
  }
  try {
    // INSERT işlemi sonrası, usernames tablosu ile birleştirip username bilgisini ekliyoruz, like_count başlangıçta 0.
    const result = await pool.query(
      `WITH inserted AS (
         INSERT INTO comments (post_id, user_id, content) 
         VALUES ($1, $2, $3)
         RETURNING *
       )
       SELECT inserted.*, u.username, 0 AS like_count
       FROM inserted
       LEFT JOIN usernames u ON inserted.user_id = u.user_id;`,
      [post_id, req.userId, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/comments/:id - Yorum güncelle (sadece yorum sahibi)
router.put('/:id', verifyToken, async (req, res) => {
  const commentId = req.params.id;
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  try {
    const result = await pool.query(
      `UPDATE comments 
       SET content = $1 
       WHERE id = $2 AND user_id = $3 
       RETURNING *`,
      [content, commentId, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found or not authorized' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/comments/:id - Yorum sil (sadece yorum sahibi)
router.delete('/:id', verifyToken, async (req, res) => {
  const commentId = req.params.id;
  try {
    const result = await pool.query(
      `DELETE FROM comments 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [commentId, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found or not authorized' });
    }
    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
