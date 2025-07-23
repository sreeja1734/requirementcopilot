const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  inputType: { type: String, enum: ['text', 'document', 'image'], required: true },
  text: { type: String },
  filePath: { type: String },
  originalName: { type: String },
  createdAt: { type: Date, default: Date.now },
  srs: { type: String } 
});

module.exports = mongoose.model('Document', DocumentSchema);
