// routes/posts.js
const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const {verifyToken, verifyAdmin} = require('../middlewares/auth.js')
const router = express.Router();

// GET /api/posts - Tüm geçerli postları filtrele (sadece arama, banka, kategori filtreleri)
// GET /api/posts - Filtre uygulandığında yalnızca aktif postları, filtre yoksa aktif ve süresi dolmuş postları sıralı getir
router.get('/', async (req, res) => {
  const { bank, category, search, limit = 10, offset = 0 } = req.query;
  const hasFilters = bank || category || search;

  if (hasFilters) {
    // Filtre uygulanıyorsa yalnızca aktif (end_date >= CURRENT_DATE) postlar alınacak.
    const conditions = [];
    const values = [];

    if (bank) {
      values.push(bank);
      conditions.push(`bank_name = ANY(string_to_array($${values.length}, ','))`);
    }
    if (category) {
      values.push(category);
      conditions.push(`category = ANY(string_to_array($${values.length}, ','))`);
    }
    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(title ILIKE $${values.length} OR content ILIKE $${values.length})`);
    }
    // Sadece aktif postlar
    conditions.push(`end_date >= CURRENT_DATE`);

    const query = `
      SELECT *, (end_date - CURRENT_DATE) AS remaining_days
      FROM posts
      WHERE ${conditions.join(' AND ')}
      ORDER BY remaining_days ASC
      LIMIT $${values.length + 1}::int OFFSET $${values.length + 2}::int
    `;
    values.push(limit, offset);

    console.log("Oluşturulan Query:", query);
    console.log("Query Değerleri:", values);

    try {
      const result = await pool.query(query, values);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    // Filtre uygulanmamışsa: aktif ve süresi dolmuş postlar alınır.
    // Aktif postlar için: remaining_days hesaplanır ve artan sırada (en az kalan gün önde) sıralanır.
    // Süresi dolmuş postlar: aktif postlardan sonra, end_date DESC (yani en yeni expired postlar önce) sıralanır.
    const query = `
      SELECT *
      FROM (
        SELECT id, title, content, image_url, bank_name, category, start_date, end_date, created_at,
               (end_date - CURRENT_DATE) AS remaining_days,
               0 AS expired_flag
        FROM posts
        WHERE end_date >= CURRENT_DATE
        UNION ALL
        SELECT id, title, content, image_url, bank_name, category, start_date, end_date, created_at,
               NULL AS remaining_days,
               1 AS expired_flag
        FROM posts
        WHERE end_date < CURRENT_DATE
      ) AS combined
      ORDER BY expired_flag ASC,
               remaining_days ASC NULLS LAST,
               end_date DESC NULLS LAST
      LIMIT $1::int OFFSET $2::int
    `;
    try {
      const result = await pool.query(query, [limit, offset]);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
});

// GET /api/posts/:id - Belirli bir postu getir (herkese açık)
router.get("/:id", async (req, res) => {
  const postId = req.params.id;
  try {
    const result = await pool.query("SELECT * FROM posts WHERE id = $1", [postId]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Post not found" });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/posts/:id - Belirli bir postu getir (herkese açık)
router.get("/:id", async (req, res) => {
  const postId = req.params.id;
  try {
    const result = await pool.query("SELECT * FROM posts WHERE id = $1", [
      postId,
    ]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Post not found" });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/posts - Yeni post ekle (Admin only)
router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  const {
    title,
    content,
    image_url,
    bank_name,
    category,
    start_date,
    end_date,
  } = req.body;
  if (!title || !content || !start_date || !end_date)
    return res
      .status(400)
      .json({ error: "Title, content, start_date and end_date are required" });
  try {
    const result = await pool.query(
      `INSERT INTO posts 
       (title, content, image_url, bank_name, category, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, content, image_url, bank_name, category, start_date, end_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/posts/:id - Post güncelle (Admin only)
router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
  const postId = req.params.id;
  const { title, content, image_url, bank_name, category } = req.body;
  try {
    const result = await pool.query(
      "UPDATE posts SET title = $1, content = $2, image_url = $3, bank_name = $4, category = $5 WHERE id = $6 RETURNING *",
      [title, content, image_url, bank_name, category, postId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Post not found" });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/posts/:id - Post sil (Admin only)
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  const postId = req.params.id;
  try {
    const result = await pool.query(
      "DELETE FROM posts WHERE id = $1 RETURNING *",
      [postId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Post not found" });
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
