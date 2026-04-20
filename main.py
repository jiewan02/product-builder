import io
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

import pdfplumber
from docx import Document
from striprtf.striprtf import rtf_to_text

app = FastAPI(title="Document Reader")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://product-builder-5cp.pages.dev"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def index():
    return FileResponse("static/index.html")


@app.post("/extract")
async def extract_text(file: UploadFile = File(...)):
    filename = file.filename or ""
    ext = Path(filename).suffix.lower()

    supported = {".pdf", ".docx", ".doc", ".rtf", ".txt"}
    if ext not in supported:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Supported: {', '.join(supported)}",
        )

    contents = await file.read()

    try:
        if ext == ".pdf":
            text = _extract_pdf(contents)
        elif ext in (".docx", ".doc"):
            text = _extract_docx(contents)
        elif ext == ".rtf":
            text = rtf_to_text(contents.decode("utf-8", errors="ignore"))
        elif ext == ".txt":
            text = contents.decode("utf-8", errors="ignore")
        else:
            text = ""
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse document: {e}")

    text = text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="No readable text found in document.")

    return JSONResponse({"text": text, "filename": filename})


def _extract_pdf(data: bytes) -> str:
    pages = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                pages.append(page_text)
    return "\n\n".join(pages)


def _extract_docx(data: bytes) -> str:
    doc = Document(io.BytesIO(data))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)
