from fastapi import FastAPI, Request
from pydantic import BaseModel

from dotenv import load_dotenv

import google.generativeai as genai
import os

app = FastAPI()

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class SRSRequest(BaseModel):
    prompt: str

class BRDRequest(BaseModel):
    prompt: str
class FRSRequest(BaseModel):
    prompt: str
class UserStoriesRequest(BaseModel):
    prompt: str


# @app.post("/generate-srs")
# async def generate_srs(req: SRSRequest):
#     model = genai.GenerativeModel('gemini-1.5-flash')
#     response = model.generate_content(req.prompt)
#     return {"srs": response.text}

@app.post("/generate-srs")
async def generate_srs(req: SRSRequest):
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(req.prompt)
        return {"srs": response.text}
    except Exception as e:
        return {"error": str(e)}

@app.post("/generate-brd")
async def generate_brd(req: SRSRequest):
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(req.prompt)
        return {"brd": response.text}
    except Exception as e:
        return {"error": str(e)}


@app.post("/generate-frs")
async def generate_frs(req: SRSRequest):
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(req.prompt)
        return {"frs": response.text}
    except Exception as e:
        return {"error": str(e)}

@app.post("/generate-user-stories")
async def generate_user_stories(req: SRSRequest):
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(req.prompt)
        return {"userStories": response.text}
    except Exception as e:
        return {"error": str(e)}

@app.get("/list-models")
async def list_models():
    models = genai.list_models()
    return {"models": [model.name for model in models]}
