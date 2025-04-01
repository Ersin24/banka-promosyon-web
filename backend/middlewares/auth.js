// middlewares/auth.js
const jwt = require('jsonwebtoken');
const pool = require('../db.js');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET || "secretkey", (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });
    req.userId = decoded.userId;
    next();
  });
};

const verifyAdmin = async (req, res, next) => {
  try {
    const result = await pool.query("SELECT is_admin FROM admins WHERE id = $1", [req.userId]);
    const adminData = result.rows[0];
    if (!adminData || !adminData.is_admin) {
      return res.status(403).json({ error: "Admin privileges required" });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { verifyToken, verifyAdmin };
