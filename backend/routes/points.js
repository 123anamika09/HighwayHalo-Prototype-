const express = require('express');
const router = express.Router();
const CampusPoint = require('../models/CampusPoint');

// GET /points - Get all campus points
router.get('/', async (req, res) => {
  try {
    const points = await CampusPoint.find();
    res.json(points);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;