from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class VehicleModel(BaseModel):
    vehicle_number: str
    owner_name: Optional[str] = None
    insurance_company: Optional[str] = None
    expiry_date: Optional[str] = None
    engine_number: Optional[str] = None
    chassis_number: Optional[str] = None
    extra_fields: Dict[str, Any] = Field(default_factory=dict)
