const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const srsTemplate = require('../srsTemplate');
const axios = require('axios');

// Generate SRS (stub for LLM integration)
router.post('/:id/generate-srs', async (req, res) => {
  const { id } = req.params;
  const doc = await Document.findById(id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  // Build a strict prompt for the LLM
  let userInput = '';
  if (doc.inputType === 'text' && doc.text) {
    userInput = doc.text;
  } else if (doc.inputType === 'document' || doc.inputType === 'image') {
    userInput = `Uploaded ${doc.inputType} (file: ${doc.originalName})`;
  }

  const prompt = `
You are an expert requirements engineer.
Strictly use the following SRS template. 
Do not change section names, order, or formatting. 
Fill in each section as completely as possible based on the input provided.
If you do not have enough information for a section, leave the section header and write "Not specified".
Template:
${srsTemplate}

Input:
${userInput}
`;

  try {
    const llmRes = await axios.post(
      'http://localhost:8000/generate-srs',
      { prompt },
      { headers: { 'Content-Type': 'application/json' } }
    );
    const generatedSRS = llmRes.data.srs;
    doc.srs = generatedSRS;
    await doc.save();
    res.json({ srs: doc.srs, document: doc });
  } catch (err) {
    res.status(500).json({ error: 'LLM service error', details: err.message });
  }
});

// ...existing routes

module.exports = router;