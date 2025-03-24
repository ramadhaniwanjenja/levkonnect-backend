require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./models'); // Load models/index.js
const userRoutes = require('./routes/user.routes');
const jobRoutes = require('./routes/job.routes');
const bidRoutes = require('./routes/bid.routes');
const contactRoutes = require('./routes/contact.routes');
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard'); // Add this line to import dashboard routes

const app = express();

// Allow requests from your frontend domain
app.use(cors({
  origin: 'https://levkonnects-97xrguzu2-rshafii106s-projects-10744910.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes); // Add this line to mount dashboard routes

// The database sync is handled in models/index.js, so no need to sync here

// Start server
app.listen(5000, () => {
  console.log('Server is running on port 5000');
});