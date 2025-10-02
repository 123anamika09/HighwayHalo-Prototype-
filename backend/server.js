const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/highway-halo', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.log('MongoDB connection error:', err);
});

// Routes
app.use('/api/points', require('./routes/points'));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Initialize sample data
const initializeData = async () => {
  const CampusPoint = require('./models/CampusPoint');
  const sampleData = require('./data/campusPoints.json');
  
  try {
    const count = await CampusPoint.countDocuments();
    if (count === 0) {
      await CampusPoint.insertMany(sampleData);
      console.log('Sample data inserted successfully');
    } else {
      console.log('Data already exists, skipping initialization');
    }
  } catch (error) {
    console.log('Error initializing data:', error);
  }
};

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  initializeData();
});