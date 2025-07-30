from fastapi import FastAPI, Request, UploadFile, File
from pydantic import BaseModel
import google.generativeai as genai
import os
from typing import Optional
import pdfplumber
from docx import Document as DocxDocument
from PIL import Image
import io
from dotenv import load_dotenv

load_dotenv()  # Loads variables from .env into environment

app = FastAPI()

# Now GEMINI_API_KEY is available via os.getenv
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "LLM Service"}

class DocumentRequest(BaseModel):
    prompt: str

@app.post("/generate-doc")
async def generate_doc(req: DocumentRequest):
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Add system instructions to enforce template following
        system_instruction = """
        You are a requirements engineering expert. When generating documents, you MUST:
        1. Follow the provided template structure EXACTLY
        2. Include ALL section headings in the EXACT order specified
        3. Do NOT modify, add, or remove any section titles
        4. Use the exact formatting and structure provided in the template
        5. If a section has no content, write "Not specified"
        6. For tables and diagrams, include them in code blocks as specified
        """
        
        # Configure generation parameters for more structured output
        generation_config = {
            "temperature": 0.1,  # Lower temperature for more consistent output
            "top_p": 0.8,
            "top_k": 40,
            "max_output_tokens": 8192,
        }
        
        print(f"Generating document with prompt length: {len(req.prompt)}")
        print(f"Prompt preview: {req.prompt[:200]}...")
        
        full_prompt = f"{system_instruction}\n\n{req.prompt}"
        response = model.generate_content(
        full_prompt,
        generation_config=generation_config
        )
        
        print(f"Generated content length: {len(response.text)}")
        print(f"Content preview: {response.text[:200]}...")
        
        return {"doc": response.text}
    except Exception as e:
        print(f"Error in generate_doc: {str(e)}")
        return {"error": f"Generation failed: {str(e)}"}

@app.get("/list-models")
async def list_models():
    models = genai.list_models()
    return {"models": [model.name for model in models]}

@app.post("/generate-doc/image")
async def generate_doc_image(prompt: str = "", file: UploadFile = File(...)):
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes))
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content([prompt, image])
    return {"doc": response.text}

@app.post("/generate-doc/document")
async def generate_doc_document(prompt: str = "", file: UploadFile = File(...)):
    content = ""
    if file.filename.lower().endswith(".pdf"):
        pdf_bytes = await file.read()
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                content += page.extract_text() or ""
    elif file.filename.lower().endswith(".docx"):
        docx_bytes = await file.read()
        with open("temp.docx", "wb") as temp_file:
            temp_file.write(docx_bytes)
        doc = DocxDocument("temp.docx")
        for para in doc.paragraphs:
            content += para.text + "\n"
        os.remove("temp.docx")
    else:
        return {"error": "Unsupported file type"}

    model = genai.GenerativeModel('gemini-1.5-flash')
    full_prompt = f"{prompt}\n\nExtracted content:\n{content}"
    response = model.generate_content(full_prompt)
    return {"doc": response.text}
