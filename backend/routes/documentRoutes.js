const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const axios = require('axios');
const srsTemplate = require('../templates/srsTemplate');
const brdTemplate = require('../templates/brdTemplate');


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

//  Generate BRD
router.post('/:id/generate-brd', async (req, res) => {
  const { id } = req.params;
  const doc = await Document.findById(id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  let userInput = '';
  if (doc.inputType === 'text' && doc.text) {
    userInput = doc.text;
  } else if (doc.inputType === 'document' || doc.inputType === 'image') {
    userInput = `Uploaded ${doc.inputType} (file: ${doc.originalName})`;
  }

  const prompt = `
You are an expert business analyst.
Strictly use the following BRD template.
Do not change section names, order, or formatting.
Fill in each section as completely as possible based on the input provided.
If you do not have enough information for a section, leave the section header and write "Not specified".
Template:
${brdTemplate}

Input:
${userInput}
`;

  try {
    const llmRes = await axios.post(
      'http://localhost:8000/generate-brd',
      { prompt },
      { headers: { 'Content-Type': 'application/json' } }
    );
    const generatedBRD = llmRes.data.brd;
    doc.brd = generatedBRD;
    await doc.save();
    res.json({ brd: doc.brd, document: doc });
  } catch (err) {
    res.status(500).json({ error: 'LLM service error', details: err.message });
  }
});

module.exports = router;