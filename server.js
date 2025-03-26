require('dotenv').config();
const express = require('express');
const cors = require('cors'); 
const db = require('./models'); 
const userRoutes = require('./routes/user.routes');
const jobRoutes = require('./routes/job.routes');
const bidRoutes = require('./routes/bid.routes');
const contactRoutes = require('./routes/contact.routes');
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://levkonnects.vercel.app',
      'https://levkonnects-wu7678r5z-rshafii106s-projects-10744910.vercel.app/',
      'http://localhost:5000',
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Test route to confirm server is working
app.get('/test', (req, res) => {
  res.status(200).send({ message: 'Server is running!' });
});

// Global error-handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});