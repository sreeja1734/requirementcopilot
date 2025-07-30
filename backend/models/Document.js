const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  inputType: { type: String, enum: ['text', 'document', 'image'], required: true },
  text: { type: String },
  filePath: { type: String },
  originalName: { type: String },
  createdAt: { type: Date, default: Date.now },
  docType: { type: String, enum: ['SRS', 'BRD', 'FRS', 'UserStory'], required: true },
  generatedContent: { type: String }, // Full document with embedded diagrams/tables
  parsedTables: [{ type: Object }]    // Array of parsed tables for editing (optional)
});

module.exports = mongoose.model('Document', DocumentSchema);
