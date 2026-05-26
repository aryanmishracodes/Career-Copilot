from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.job_search import search_jobs, search_jobs_multi_skill

router = APIRouter(prefix="/market", tags=["market"])


class SkillSearchRequest(BaseModel):
    skills: list[str]
    location: str = "India"


class QuerySearchRequest(BaseModel):
    query: str
    location: str = "India"


@router.post("/jobs-for-skills")
async def get_jobs_for_skills(req: SkillSearchRequest):
    """Fetch real job listings matched to MULTIPLE user skills in parallel."""
    try:
        result = await search_jobs_multi_skill(req.skills, req.location)
        return {
            "jobs": result["all_jobs"],
            "by_skill": result["by_skill"],
            "skills_searched": result["skills_searched"],
            "total": result["total"],
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_market(req: QuerySearchRequest):
    """Search for jobs with a custom query."""
    try:
        jobs = await search_jobs(req.query, req.location)
        return {"jobs": jobs, "query": req.query, "total": len(jobs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
