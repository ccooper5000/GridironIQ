from pydantic import BaseModel, Field, conlist, confloat
from typing import Optional, Literal

class Marker(BaseModel):
    x: confloat(ge=0, le=1)
    y: confloat(ge=0, le=1)
    timestamp: confloat(ge=0)
    position: str

class CreateJobRequest(BaseModel):
    videoSrc: Optional[str] = None
    markers: conlist(Marker, min_items=1)

JobStatus = Literal['queued', 'processing', 'completed', 'failed']

class JobResponse(BaseModel):
    id: str
    status: JobStatus
    metrics: Optional[dict] = None
    coachingInsight: Optional[str] = None
