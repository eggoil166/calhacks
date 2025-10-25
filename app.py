from llmgen.llm.generator_anthropic import parse_geom, gen_openscad
from llmgen.utils.scadding import save_openscad
import re

from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/generate_scad", methods=["POST"])
def generate_scad():
    data = request.json
    user_prompt = data.get("prompt")

if __name__ == "__main__":
    user_prompt = "generate a dog" # user prompt here
    print("Extracting geometry spec...")
    spec = parse_geom(user_prompt)
    print(spec.model_dump_json(indent=2))

    print("Generating OpenSCAD code...")
    code = gen_openscad(spec)
    code_blocks = [block.text for block in code if hasattr(block, "text")]
    joined_code = "\n".join(code_blocks)

    clean_code = re.sub(r"```[a-zA-Z]*\n?|```", "", joined_code).strip()
    save_openscad(clean_code) #string of final scad codegit 