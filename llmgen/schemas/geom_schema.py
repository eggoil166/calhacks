from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class GeomSchema(BaseModel):
    shape: str = Field(..., description="type of geom like ring or cube etc")
    parameters: Dict[str, Any] = Field(..., description="numeric parameters in mm")
    features: Optional[Dict[str, Any]] = Field(default=None, description="boolean or categorical feats")
