from fastapi import APIRouter, HTTPException
from ..schemas import CreateJobRequest, JobResponse
from ..db import get_supabase
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.post("", response_model=JobResponse, status_code=202)
def create_job(payload: CreateJobRequest):
    job_id = str(uuid.uuid4())
    sb = get_supabase()

    # Persist a 'queued' job record (service role bypasses RLS; ensure you *never* expose this key to FE)
    if sb:
        data = {
            "id": job_id,
            "status": "queued",
            "submitted_payload": payload.model_dump(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            # org_id/user scoping must be enforced by your API before inserting in production
            "org_id": None,
            "created_by": None,
        }
        resp = sb.table("jobs").insert(data).execute()
        if getattr(resp, "error", None):
            raise HTTPException(status_code=500, detail=str(resp.error))

    # For now, return a minimal response; a worker would update status → completed later
    return JobResponse(id=job_id, status="queued")

@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: str):
    sb = get_supabase()
    if sb:
        resp = sb.table("jobs").select("*").eq("id", job_id).limit(1).execute()
        if getattr(resp, "error", None):
            raise HTTPException(status_code=500, detail=str(resp.error))
        rows = resp.data or []
        if rows:
            r = rows[0]
            return JobResponse(
                id=r["id"],
                status=r["status"],
                metrics=r.get("result_metrics"),
                coachingInsight=r.get("coaching_insight"),
            )
    # Fallback stub if DB not configured
    return JobResponse(id=job_id, status="processing")
