const mongoose = require('mongoose');

const campusPointSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model('CampusPoint', campusPointSchema);