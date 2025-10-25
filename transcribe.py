from fish_audio_sdk import Session, TTSRequest
import os
from dotenv import load_dotenv
import sys

load_dotenv()
key = os.getenv("FISH_API_KEY")
session = Session(key)

# obtain arguments
if len(sys.argv) < 2:
    print("Usage: python generate_audio.py \"Your text to convert to speech\"")
    sys.exit(1)
speech_text = sys.argv[1]

# USAGE:
# python transcribe.py "Hello World"

audio = os.path.join("data", "main.mp3")

request = TTSRequest(
    text=speech_text,
    reference_id="26785a3047f74dd18fd9a2604d192a69"  # Your model ID from fish.audio
    # above is the id for Sheldon Cooper
)

with open(audio, "wb") as f:
    for chunk in session.tts(request):
        f.write(chunk)