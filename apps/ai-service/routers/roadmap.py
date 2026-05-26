from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.claude_client import claude
from prompts.roadmap_gen import ROADMAP_GENERATION_PROMPT
import json

router = APIRouter(prefix="/roadmap", tags=["roadmap"])

class RoadmapRequest(BaseModel):
    current_skills: list[str]
    skill_gaps: list[str]
    target_role: str

@router.post("/generate")
async def generate_roadmap(req: RoadmapRequest):
    try:
        prompt = ROADMAP_GENERATION_PROMPT.format(
            current_skills=", ".join(req.current_skills),
            skill_gaps=", ".join(req.skill_gaps),
            target_role=req.target_role
        )
        
        response = await claude.messages.create(
            model="claude-opus-4-6",
            max_tokens=4096,
            system=prompt,
            messages=[{
                "role": "user",
                "content": "Please generate the roadmap JSON based on my profile."
            }]
        )

        raw = response.content[0].text.strip()
        if raw.startswith("```json"):
            raw = raw[7:]
        if raw.endswith("```"):
            raw = raw[:-3]
        
        return json.loads(raw.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
