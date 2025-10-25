from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class GeometryPart(BaseModel):
    name: str = Field(..., description="Unique identifier for the part")
    shape: str = Field(..., description="Primitive shape: cylinder, cube, sphere, tube, etc.")
    parameters: Dict[str, Any] = Field(..., description="All numeric parameters in millimeters")
    features: Optional[Dict[str, Any]] = Field(default=None, description="Boolean or categorical features, e.g., flat_top, hollow")
    relations: Optional[Dict[str, Any]] = Field(default=None, description="Constraints to other parts: attach_to, translate, rotate")

class GeometryAssembly(BaseModel):
    assembly_name: str = Field(..., description="Name of the assembly or object")
    parts: List[GeometryPart] = Field(..., description="List of all parts")
    constraints: Optional[Dict[str, Any]] = Field(default=None, description="Global constraints for assembly or spatial relationships")
    notes: Optional[str] = Field(default=None, description="Additional guidance for code generation or modeling assumptions")