from fastapi import FastAPI, Request
from pydantic import BaseModel
import google.generativeai as genai
import os

app = FastAPI()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class SRSRequest(BaseModel):
    prompt: str

@app.post("/generate-srs")
async def generate_srs(req: SRSRequest):
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(req.prompt)
    return {"srs": response.text}

@app.get("/list-models")
async def list_models():
    models = genai.list_models()
    return {"models": [model.name for model in models]}
