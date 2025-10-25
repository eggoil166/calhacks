from llmgen.llm.generator_anthropic import parse_geom, gen_openscad, edit_existing_model
from llmgen.utils.scadding import save_openscad

import re

from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/generate_scad", methods=["POST"])
def generate_scad():
    data = request.json
    user_prompt = data.get("prompt")
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
    updated_spec = edit_existing_model(edit_request, historical_text, current_scad)
    code = gen_openscad(updated_spec)
    code_blocks = [block.text for block in code if hasattr(block, "text")]
    joined_code = "\n".join(code_blocks)
    clean_code = re.sub(r"```[a-zA-Z]*\n?|```", "", joined_code).strip()
    return jsonify({"scad_code": clean_code})

if __name__ == "__main__":
    app.run(debug=True)
