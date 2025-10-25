### TODO: CHANGE TO GEMINI CALLS

"""import json
from llmgen.llm.prompts import GEOM_PROMPT, GEN_PROMPT
from llmgen.schemas.geom_schema import GeomSchema

from dotenv import load_dotenv
load_dotenv()

import os

import anthropic
import instructor

client = instructor.from_provider("anthropic/claude-sonnet-4-5", api_key=os.getenv("CLAUDE_API_KEY"))
client2 = anthropic.Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))

def parse_geom(user_prompt: str, xr_data: dict) -> GeomSchema:
    prompt = GEOM_PROMPT.format(user_prompt=user_prompt)
    response = client.chat.completions.create(response_model=GeomSchema, messages=[{"role": "user", "content": prompt}])
    return response

def gen_openscad(geomspec: GeomSchema) -> str:
    prompt = GEN_PROMPT.format(geometry_json=geomspec.model_dump_json(indent=2))
    response = client2.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=10000,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )
    code = response.content
    return code
    """