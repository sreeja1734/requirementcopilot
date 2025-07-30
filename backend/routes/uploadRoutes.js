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

// Configure multer with file filtering for documents
const upload = multer({ 
  storage,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'file') {
      // Allow specific file types for documents
      const allowedTypes = /pdf|doc|docx|txt/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype) || 
                      file.mimetype === 'application/pdf' ||
                      file.mimetype === 'application/msword' ||
                      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                      file.mimetype === 'text/plain';
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed for documents'));
      }
    } else {
      cb(null, true);
    }
  }
});

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
  
  try {
    await doc.save();
    res.json({
      ...doc.toObject(),
      message: 'Document uploaded successfully. You can now generate BRD from this document.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save document', details: error.message });
  }
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


