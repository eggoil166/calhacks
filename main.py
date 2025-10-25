from llmgen.llm.generator_anthropic import parse_geom, gen_openscad
from llmgen.utils.scadding import save_openscad

if __name__ == "__main__":
    user_prompt = "Make me a 20mm long finger brace with a width of 15mm and a height of 10mm. It should have ventilation holes on the sides and a hinge mechanism at one end for easy removal. The brace should be designed to fit comfortably around an average adult finger, with a slight taper from the knuckle to the fingertip. Include a small tab on the hinge for easy gripping."
    print("Extracting geometry spec...")
    spec = parse_geom(user_prompt)
    print(spec.model_dump_json(indent=2))

    print("Generating OpenSCAD code...")
    code = gen_openscad(spec)
    code_blocks = [block.text for block in code if hasattr(block, "text")]
    joined_code = "\n".join(code_blocks)

    import re
    clean_code = re.sub(r"```[a-zA-Z]*\n?|```", "", joined_code).strip()
    save_openscad(clean_code)