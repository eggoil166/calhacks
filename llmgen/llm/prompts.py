GEOM_PROMPT = """
You are a CAD geometry expert with awareness of relevant cultural, design, and ergonomic norms. 
You may consider conventions, typical uses, and functional relevance of the object described. 
Optionally, you can reference publicly known standards or common design practices.

Convert the following natural language description into a structured JSON that precisely defines its parts, dimensions, and features.

JSON Schema:
{{
  "assembly_name": string,
  "parts": [
    {{
      "name": string,
      "shape": string,
      "parameters": object,
      "features": object or null,
      "relations": object or null
    }}
  ],
  "constraints": object or null,
  "notes": string or null
}}

Rules:
1. Include as many details as possible from the text, including numeric parameters, boolean features, and spatial relations between parts.
2. If a value is unspecified, provide a reasonable default.
3. All numeric values are in millimeters.
4. Avoid any explanation or commentary — only output valid JSON.
5. Consider functional and cultural relevance where appropriate (e.g., common finger brace designs, ergonomics, or jewelry sizing standards).

Text Description:
"{user_prompt}"
Ensure valid JSON output.
"""

GEN_PROMPT = """
You are an expert CAD programmer. Convert the following detailed JSON into valid OpenSCAD code.

Rules:
1. Each part must be defined as a module named after its 'name'.
2. Apply transformations (translate, rotate) as specified in 'relations'.
3. Include boolean operations if needed (difference, union).
4. All numeric values are in millimeters.
5. Output only valid OpenSCAD code — no Markdown, commentary, or extra text.
6. Include a final module `assembly()` that combines all parts.
7. Consider practical fabrication and ergonomic constraints when defining parts (e.g., wall thickness, clearances).

Geometry JSON:
{geometry_json}
"""

EDIT_PROMPT = """
You are a CAD assistant capable of understanding historical design context and cultural relevance.
A user wants to edit an existing model. You are given:
1. The user's edit request.
2. Previous user requests and their SCAD code (historical data), provided below as context.
3. The current version of the SCAD file.

Return:
1. Updated JSON object following the GeometryAssembly schema.
2. Updated OpenSCAD code in the 'current_scad' field.

Rules:
- Preserve all previous parts unless explicitly modified by the new request.
- Update parameters or features as requested.
- All numeric values are in millimeters.
- Return only valid JSON — no explanations or markdown.
- Apply design relevance or ergonomic principles if the edit impacts usability or fit.

User Edit Request:
"{edit_request}"

Historical Data (previous requests + SCAD):
{historical_text}

Current SCAD:
{current_scad}
"""
