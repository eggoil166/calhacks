from llmgen.llm.generator import parse_geom, gen_openscad
from llmgen.utils.scadding import save_openscad

if __name__ == "__main__":
    user_prompt = "A ring with a flat top and a 5 mm band width."
    xr_data = {"diameter": 18.5}

    print("Extracting geometry spec...")
    spec = parse_geom(user_prompt, xr_data)
    print(spec.model_dump_json(indent=2))

    print("Generating OpenSCAD code...")
    code = gen_openscad(spec)
    code_blocks = [block.text for block in code if hasattr(block, "text")]
    joined_code = "\n".join(code_blocks)

    import re
    clean_code = re.sub(r"```[a-zA-Z]*\n?|```", "", joined_code).strip()
    save_openscad(clean_code)