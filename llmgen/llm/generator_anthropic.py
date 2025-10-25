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

def gen_openscad(geomspec: GeometryAssembly) -> str:
    prompt = GEN_PROMPT.format(geometry_json=geomspec.model_dump_json(indent=2))
    response = client2.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=10000,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content

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