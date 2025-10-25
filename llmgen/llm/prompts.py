GEOM_PROMPT = """
You are a geometry parsing model. Extract structured CAD parameters
from the following text and JSON context. Follow this schema:
{{
  "shape": string,
  "parameters": object,
  "features": object
}}

Text: "{user_prompt}"
XR Data: {xr_data}

Return valid JSON.
"""

GEN_PROMPT = """
You are a CAD generation model. Write OpenSCAD code that produces the described shape.

Geometry JSON:
{geometry_json}

Rules:
- Use parameters from the JSON.
- Ensure all numeric units are in millimeters.
- Output *only* valid OpenSCAD code.
"""