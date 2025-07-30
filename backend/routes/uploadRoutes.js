const express = require('express');
const multer = require('multer');
const path = require('path');
const Document = require('../models/Document');

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Upload plain text
router.post('/text', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });
  const doc = new Document({ inputType: 'text', text });
  await doc.save();
  res.json(doc);
});

// Upload document file (e.g., PDF, DOCX)
router.post('/document', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File is required' });
  const doc = new Document({
    inputType: 'document',
    filePath: req.file.path,
    originalName: req.file.originalname
  });
  await doc.save();
  res.json(doc);
});

// Upload image (e.g., PNG, JPG)
router.post('/image', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File is required' });
  const doc = new Document({
    inputType: 'image',
    filePath: req.file.path,
    originalName: req.file.originalname
  });
  await doc.save();
  res.json(doc);
});

module.exports = router;