// middlewares/xssClean.js
const xss = require('xss-clean');

const sanitizeInput = xss();

module.exports = sanitizeInput;
