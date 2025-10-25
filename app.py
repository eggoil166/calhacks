from llmgen.llm.generator_anthropic import parse_geom, gen_openscad, edit_existing_model
### from llmgen.llm.generator_gemini import parse_geom2, gen_openscad2, edit_existing_model2
from llmgen.utils.scadding import save_openscad

import re

from flask import Flask, request, jsonify

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

if __name__ == "__main__":
    app.run(debug=True, port=5000)
