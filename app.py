from llmgen.llm.generator_anthropic import parse_geom, gen_openscad, edit_existing_model
### from llmgen.llm.generator_gemini import parse_geom2, gen_openscad2, edit_existing_model2
from llmgen.utils.scadding import save_openscad

import re
import subprocess

from flask import Flask, request, jsonify, send_file
try:
    from flask_cors import CORS
    cors_available = True
except ImportError:
    cors_available = False
import os
import anthropic

app = Flask(__name__)

# Enable CORS if available
if cors_available:
    CORS(app)
else:
    # Manual CORS headers
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response

@app.route("/api/generate_scad", methods=["POST"])
def generate_scad():
    try:
        print("received request", request.json)
        data = request.json
        if not data or 'prompt' not in data:
            return jsonify({"error": "Missing 'prompt' in request"}), 400
        user_prompt = data.get("prompt")
        """if data.get("use_gemini"):
            spec = parse_geom2(user_prompt)
            code = gen_openscad2(spec)"""
        #else:
        spec = parse_geom(user_prompt)
        code, description = gen_openscad(spec)  # Returns tuple
        code_blocks = [block.text for block in code if hasattr(block, "text")]
        joined_code = "\n".join(code_blocks)
        clean_code = re.sub(r"```[a-zA-Z]*\n?|```", "", joined_code).strip()
        return jsonify({"scad_code": clean_code, "description": description})
    except Exception as e:
        print(f"Error in generate_scad: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/api/text-to-speech", methods=["POST"])
def text_to_speech():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({"error": "Missing 'text' in request"}), 400
    
    text = data.get("text")
    if not text or not text.strip():
        return jsonify({"error": "Text is empty"}), 400
    
    try:
        # Call transcribe.py with the text
        result = subprocess.run(
            ["python", "transcribe.py", text],
            capture_output=True,
            text=True,
            check=True
        )
        
        # Check if the audio file was created
        audio_path = os.path.join("data", "main.mp3")
        if not os.path.exists(audio_path):
            return jsonify({"error": "Audio file not created"}), 500
        
        # Return the audio file
        return send_file(audio_path, mimetype='audio/mpeg')
    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"Failed to generate audio: {e.stderr}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/edit_scad", methods=["POST"])
def edit_scad():
    data = request.json
    edit_request = data.get("edit_request")
    current_scad = data.get("current_scad")
    """if data.get("use_gemini"):
        updated_spec = edit_existing_model2(edit_request, historical_text, current_scad)
        code = gen_openscad2(updated_spec)"""
    #else:
    updated_spec = edit_existing_model(edit_request, current_scad)
    code, description = gen_openscad(updated_spec)  # Returns tuple
    code_blocks = [block.text for block in code if hasattr(block, "text")]
    joined_code = "\n".join(code_blocks)
    clean_code = re.sub(r"```[a-zA-Z]*\n?|```", "", joined_code).strip()
    return jsonify({"scad_code": clean_code, "description": description})

@app.route("/api/test", methods=["GET", "POST"])
def test():
    print("something happened!!!!")
    return jsonify({"message": "working"})

@app.route("/api/claude/flash", methods=["POST"])
def claude_flash():
    data = request.json or {}
    request_text = str(data.get("request", ""))
    context_text = str(data.get("context", ""))
    if not request_text:
        return jsonify({"error": "Missing 'request'"}), 400

    api_key = os.getenv("CLAUDE_API_KEY")
    if not api_key:
        return jsonify({"error": "Missing CLAUDE_API_KEY"}), 500

    client = anthropic.Anthropic(api_key=api_key)
    prompt = f"Context: {context_text}\n\nRequest: {request_text}"
    try:
        msg = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )
        # content can be a list of blocks; join text blocks if present
        output_text = ""
        try:
            parts = getattr(msg, 'content', []) or []
            texts = []
            for p in parts:
                t = getattr(p, 'text', None)
                if t:
                    texts.append(t)
            output_text = "\n".join(texts) if texts else str(msg)
        except Exception:
            output_text = str(msg)
        print(output_text)
        return jsonify({"output": output_text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
