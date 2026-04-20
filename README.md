# Document Reader

A web app that extracts text from uploaded documents and reads them aloud using your browser's text-to-speech engine.

## Features

- Upload documents via drag-and-drop or file browser
- Supports **PDF**, **DOCX**, **DOC**, **RTF**, and **TXT** formats
- Text-to-speech playback with play/pause/stop controls
- Adjustable reading speed (0.5× – 2×), font size, and voice selection
- High contrast mode for accessibility
- Progress bar tracking reading position

## Getting Started

### Prerequisites

- Python 3.8+

### Installation

```bash
pip install -r requirements.txt
```

### Running the App

```bash
uvicorn main:app --reload
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

## Tech Stack

- **Backend:** FastAPI, pdfplumber, python-docx, striprtf
- **Frontend:** Vanilla JS, Web Speech API (SpeechSynthesis)
