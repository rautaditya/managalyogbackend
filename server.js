const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

require('dotenv').config({ path: '.env' });

const { connectDB } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const authRoutes        = require('./routes/authRoutes');
const siteRoutes        = require('./routes/siteRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const invoiceRoutes     = require('./routes/invoiceRoutes');
const quotationRoutes   = require('./routes/quotationRoutes');

// Connect to MySQL
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: [
   
    "https://www.mangalyogenterprise.com",  
    "mangalyogenterprise.com",
    "http://localhost:3000"
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) =>
  res.json({ status: 'OK', app: 'Mangalyog Enterprise', db: 'MySQL' })
);
app.get("/", (req, res) => {
  return res.redirect(301, "https://www.mangalyogenterprise.com");
});

// API Routes
app.use('/api/auth',         authRoutes);
app.use('/api/sites',        siteRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/invoices',     invoiceRoutes);
app.use('/api/quotations',   quotationRoutes);

// Error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Mangalyog Enterprise (MySQL) running on port ${PORT}`);
  console.log(`   ENV : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   DB  : ${process.env.DB_NAME}@${process.env.DB_HOST}\n`);
});

module.exports = app;
