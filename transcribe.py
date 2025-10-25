from fish_audio_sdk import Session, ASRRequest
import os
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("FISH_API_KEY")
session = Session(key)

audio = os.path.join("data", "main.mp3")
text = os.path.join("data", "main.txt")

# Read audio file
with open(audio, "rb") as f: # heads up is this async?
    audio_data = f.read()

# Transcribe
response = session.asr(ASRRequest(
    audio=audio_data
))
with open(text, 'w') as f:
    print(response.text, file=f)