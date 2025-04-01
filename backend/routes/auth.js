// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const {verifyToken} = require('..//middlewares/auth.js')
const router = express.Router();

// Kayıt endpoint'i (önceden yazdığımız)
router.post('/register', async (req, res) => {
  const { email, password, username } = req.body;
  
  if (!email || !password || !username) {
    return res.status(400).json({ error: "Email, şifre ve kullanıcı adı boş bırakılamaz" });
  }
   // Basit bir e-posta doğrulaması için regex
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   if (!emailRegex.test(email)) {
     return res.status(400).json({ error: "Lütfen geçerli bir e-posta adresi giriniz." });
   }
 

  try {
    const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: "Bu e-posta ile kayıtlı kullanıcı bulunmaktadır." });
    }

    // Kullanıcı adı kontrolü
    const usernameCheck = await pool.query("SELECT * FROM usernames WHERE username = $1", [username]);
    if (usernameCheck.rows.length > 0) {
      return res.status(400).json({ error: "Bu kullanıcı adı zaten kullanılıyor." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at",
      [email, hashedPassword]
    );
    const user = userResult.rows[0];

    const usernameResult = await pool.query(
      "INSERT INTO usernames (user_id, username) VALUES ($1, $2) RETURNING username",
      [user.id, username]
    );

    res.status(201).json({
      message: "Kullanıcı başarıyla kayıt oldu",
      user: { id: user.id, email: user.email, username: usernameResult.rows[0].username }
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    // Kullanıcının temel bilgilerini çekelim
    const result = await pool.query("SELECT id, email, created_at FROM users WHERE id = $1", [req.userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    
    // Kullanıcı adını usernames tablosundan alalım
    const usernameResult = await pool.query("SELECT username FROM usernames WHERE user_id = $1", [req.userId]);
    user.username = usernameResult.rows[0] ? usernameResult.rows[0].username : null;
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Giriş (login) endpoint'i
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email ve şifre gerekli." });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'Geçersiz kullanıcı' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Geçersiz şifre' });

    // Admin olup olmadığını admins tablosundan kontrol ediyoruz.
    const adminResult = await pool.query("SELECT is_admin FROM admins WHERE id = $1", [user.id]);
    const isAdmin = adminResult.rows.length > 0 && adminResult.rows[0].is_admin;

      // Token payload'una isAdmin bilgisini ekliyoruz.
      const token = jwt.sign(
        { userId: user.id, isAdmin },
        process.env.JWT_SECRET || 'secretkey',
        { expiresIn: '1h' }
      );
      
  
    res.json({ token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
