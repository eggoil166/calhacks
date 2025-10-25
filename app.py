from llmgen.llm.generator_anthropic import parse_geom, gen_openscad, edit_existing_model
### from llmgen.llm.generator_gemini import parse_geom2, gen_openscad2, edit_existing_model2
from llmgen.utils.scadding import save_openscad

import re

from flask import Flask, request, jsonify
import os
import anthropic

app = Flask(__name__)

@app.route("/api/generate_scad", methods=["POST"])
def generate_scad():
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
    code = gen_openscad(spec)
    code_blocks = [block.text for block in code if hasattr(block, "text")]
    joined_code = "\n".join(code_blocks)
    clean_code = re.sub(r"```[a-zA-Z]*\n?|```", "", joined_code).strip()
    return jsonify({"scad_code": clean_code})

@app.route("/edit_scad", methods=["POST"])
def edit_scad():
    data = request.json
    edit_request = data.get("edit_request")
    historical_text = data.get("historical_text")
    current_scad = data.get("current_scad")
    """if data.get("use_gemini"):
        updated_spec = edit_existing_model2(edit_request, historical_text, current_scad)
        code = gen_openscad2(updated_spec)"""
    #else:
    updated_spec = edit_existing_model(edit_request, historical_text, current_scad)
    code = gen_openscad(updated_spec)
    code_blocks = [block.text for block in code if hasattr(block, "text")]
    joined_code = "\n".join(code_blocks)
    clean_code = re.sub(r"```[a-zA-Z]*\n?|```", "", joined_code).strip()
    return jsonify({"scad_code": clean_code})

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
