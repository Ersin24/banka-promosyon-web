// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const commentsRoutes = require('./routes/comments');
const likesRoutes = require('./routes/likes');
const complaintsRoutes = require('./routes/complaints');
const moderationRoutes = require('./routes/moderation');
const commentLikesRoutes = require('./routes/comment-likes');

const {authLimiter} = require('./middlewares/rateLimiter.js')
const sanitizeInput = require('./middlewares/xssClean.js')

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = [
  "https://banka-promosyon-web.vercel.app",
  "http://localhost:3000"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));


app.use(express.json());

// XSS temizleyici (her request için global uygulanabilir)
app.use(sanitizeInput);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/likes', likesRoutes);
app.use('/api/comment-likes', commentLikesRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/moderation', moderationRoutes);

app.get('/', (req, res) => {
  res.send('Banka Promosyon Backend is running!');
});

// Tüm tanımsız rotalar için 404 middleware'i
app.use((req, res) => {
  res.status(404).json({ error: "404 - Aradığınız sayfa bulunamadı!" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
