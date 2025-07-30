const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');

async function extractTextFromFile(filePath, inputType) {
  if (inputType === 'document') {
    if (filePath.endsWith('.pdf')) {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } else if (filePath.endsWith('.docx')) {
      const data = await mammoth.extractRawText({ path: filePath });
      return data.value;
    }
  }
  
  if (inputType === 'image') {
    try {
      console.log(`[OCR] Starting text extraction from image: ${filePath}`);
      const result = await Tesseract.recognize(filePath, 'eng', {
        logger: m => console.log(`[OCR] ${m.status}: ${m.progress * 100}%`)
      });
      console.log(`[OCR] Text extraction completed. Found ${result.data.text.length} characters`);
      return result.data.text;
    } catch (error) {
      console.error(`[OCR] Error extracting text from image: ${error.message}`);
      return '';
    }
  }
  
  return '';
}

module.exports = { extractTextFromFile };
