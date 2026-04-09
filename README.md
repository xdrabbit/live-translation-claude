# Live Translation

Real-time, turn-based Spanish/English translation app. One person speaks Spanish, the other English. Audio is captured in the browser, transcribed locally with faster-whisper, and translated using Claude.

## Architecture

```
Browser (React) → WebSocket → Node.js Server → faster-whisper (local GPU)
                                             → Claude API (translation)
```

## Prerequisites

- **Node.js** >= 18
- **Python** >= 3.10
- **NVIDIA GPU** with CUDA (for faster-whisper; CPU mode available)
- **ANTHROPIC_API_KEY** environment variable set

## Setup

### 1. Install Python dependencies

```bash
cd whisper
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Install Node.js dependencies

```bash
npm install
npm run install:all
```

### 3. Set environment variables

```bash
export ANTHROPIC_API_KEY=your-key-here

# Optional whisper config (defaults shown):
export WHISPER_MODEL=large-v3
export WHISPER_DEVICE=cuda        # or "cpu"
export WHISPER_COMPUTE_TYPE=float16
```

## Running

Start all three services:

```bash
npm run dev
```

Or run each individually:

```bash
# Terminal 1: Whisper server (port 8787)
cd whisper && source .venv/bin/activate && python server.py

# Terminal 2: Node.js server (port 3001)
npm run dev:server

# Terminal 3: React dev server (port 5173)
npm run dev:client
```

Open http://localhost:5173 in your browser.

## Usage

1. Click the microphone button to start recording
2. Speak in either Spanish or English
3. Click stop — audio is transcribed and translated
4. Both original text and translation appear in their respective panes
5. The other person takes their turn

## Production Build

```bash
npm run build:client
npm run dev:server  # serves the built client
```
