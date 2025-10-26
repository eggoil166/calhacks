import json
from llmgen.llm.prompts import GEOM_PROMPT, GEN_PROMPT, EDIT_PROMPT
from llmgen.schemas.geom_schema import GeometryAssembly

from dotenv import load_dotenv
load_dotenv()

import os
import re

import anthropic
import instructor

client = instructor.from_provider("anthropic/claude-sonnet-4-5", api_key=os.getenv("CLAUDE_API_KEY"))
client2 = anthropic.Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))

def parse_geom(user_prompt: str) -> GeometryAssembly:
    prompt = GEOM_PROMPT.format(user_prompt=user_prompt)
    response = client.chat.completions.create(
        response_model=GeometryAssembly,
        messages=[{"role": "user", "content": prompt}]
    )
    return response

def gen_openscad(geomspec: GeometryAssembly) -> tuple:
    prompt = GEN_PROMPT.format(geometry_json=geomspec.model_dump_json(indent=2))
    response = client2.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=10000,
        messages=[{"role": "user", "content": prompt}]
    )
    content = response.content
    code_blocks = [block.text for block in content if hasattr(block, "text")]
    full_text = "\n".join(code_blocks)
    
    # Extract description from the beginning of the response
    description = ""
    lines = full_text.split('\n')
    description_lines = []
    
    for line in lines:
        stripped = line.strip()
        # Check if this looks like code
        if stripped.startswith('module ') or stripped.startswith('function ') or stripped.startswith('translate') or stripped.startswith('rotate') or stripped.startswith('cube') or stripped.startswith('cylinder') or stripped.startswith('sphere'):
            break
        # Not code yet, could be description
        if stripped and not stripped.startswith('//'):
            description_lines.append(stripped)
    
    description = ' '.join(description_lines[:3])  # Take first 3 lines max
    
    # Fallback description if none found
    if not description or len(description) < 20:
        description = "I've created an OpenSCAD model based on your specifications."
    
    return (content, description)

def edit_existing_model(edit_request: str, historical_text: str, current_scad: str) -> GeometryAssembly:
    prompt = EDIT_PROMPT.format(
        edit_request=edit_request,
        historical_text=historical_text,
        current_scad=current_scad
    )
    response = client.chat.completions.create(
        response_model=GeometryAssembly,
        messages=[{"role": "user", "content": prompt}]
    )
    return response