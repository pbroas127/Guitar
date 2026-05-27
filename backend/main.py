import os
import tempfile
import subprocess
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp
from chord_detect import analyze_audio

def _write_cookies_file(tmpdir: str) -> str | None:
    """Write YT_COOKIES env var to a temp file and return path, or None."""
    cookies_content = os.environ.get("YT_COOKIES", "").strip()
    if not cookies_content:
        return None
    path = os.path.join(tmpdir, "cookies.txt")
    with open(path, "w") as f:
        f.write(cookies_content)
    return path

app = FastAPI(title="Guitar App Backend")

# Allow requests from any origin (the PWA can be on any domain)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    youtube_url: str
    max_duration: int = 240  # seconds

class SearchRequest(BaseModel):
    query: str
    max_results: int = 10

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    """Download audio from YouTube URL and detect chords."""
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_path = os.path.join(tmpdir, "audio.%(ext)s")

        cookies_path = _write_cookies_file(tmpdir)
        ydl_opts = {
            "format": "bestaudio[ext=m4a]/bestaudio/best",
            "outtmpl": audio_path,
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
            "external_downloader": "ffmpeg",
            "external_downloader_args": ["-t", str(req.max_duration + 30)],
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "wav",
            }],
        }
        if cookies_path:
            ydl_opts["cookiefile"] = cookies_path

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(req.youtube_url, download=True)
                title = info.get("title", "Unknown")
                channel = info.get("channel", info.get("uploader", ""))
                duration = info.get("duration", 0)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not download: {e}")

        # Find the downloaded wav file
        wav_files = list(Path(tmpdir).glob("*.wav"))
        if not wav_files:
            raise HTTPException(status_code=500, detail="Audio extraction failed")

        try:
            result = analyze_audio(str(wav_files[0]), max_duration=req.max_duration)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")

    return {
        "youtube_title": title,
        "channel": channel,
        "duration": duration,
        **result,
    }

@app.post("/search")
async def search_youtube(req: SearchRequest):
    """Search YouTube using yt-dlp (no API key needed)."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            cookies_path = _write_cookies_file(tmpdir)
            ydl_opts = {
                "quiet": True,
                "no_warnings": True,
                "extract_flat": True,
                "default_search": f"ytsearch{req.max_results}",
            }
            if cookies_path:
                ydl_opts["cookiefile"] = cookies_path
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                results = ydl.extract_info(f"ytsearch{req.max_results}:{req.query} guitar chords", download=False)

        videos = []
        for entry in (results.get("entries") or []):
            if not entry:
                continue
            videos.append({
                "id": entry.get("id"),
                "title": entry.get("title"),
                "channel": entry.get("channel") or entry.get("uploader"),
                "duration": entry.get("duration"),
                "thumbnail": f"https://i.ytimg.com/vi/{entry.get('id')}/mqdefault.jpg",
                "url": f"https://www.youtube.com/watch?v={entry.get('id')}",
            })

        return {"videos": videos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
