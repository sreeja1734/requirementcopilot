const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const destinationPath = path.join(__dirname, '../uploads');
    try {
      if (!fs.existsSync(destinationPath)) {
        fs.mkdirSync(destinationPath, { recursive: true });
      }
    } catch (err) {
      return cb(err);
    }
    cb(null, destinationPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Upload plain text
router.post('/text', async (req, res) => {
  try {
    const { text, docType } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });
    if (!docType) return res.status(400).json({ error: 'docType is required' });

    const doc = new Document({ inputType: 'text', text, docType });
    await doc.save();
    res.json(doc);
  } catch (err) {
    console.error('Error saving text document:', err);
    res.status(500).json({ error: 'Failed to save document', details: err.message });
  }
});

// Upload document file (e.g., PDF, DOCX)
router.post('/document', upload.single('file'), async (req, res) => {
  try {
    const { docType } = req.body;
    if (!req.file) return res.status(400).json({ error: 'File is required' });
    if (!docType) return res.status(400).json({ error: 'docType is required' });

    const doc = new Document({
      inputType: 'document',
      filePath: req.file.path,
      originalName: req.file.originalname,
      docType
    });
    await doc.save();
    res.json(doc);
  } catch (err) {
    console.error('Error saving document file:', err);
    res.status(500).json({ error: 'Failed to save document', details: err.message });
  }
});

// Upload image (e.g., PNG, JPG)
router.post('/image', upload.single('file'), async (req, res) => {
  try {
    const { docType } = req.body;
    if (!req.file) return res.status(400).json({ error: 'File is required' });
    if (!docType) return res.status(400).json({ error: 'docType is required' });

    const doc = new Document({
      inputType: 'image',
      filePath: req.file.path,
      originalName: req.file.originalname,
      docType
    });
    await doc.save();
    res.json(doc);
  } catch (err) {
    console.error('Error saving image file:', err);
    res.status(500).json({ error: 'Failed to save document', details: err.message });
  }
});

module.exports = router;
