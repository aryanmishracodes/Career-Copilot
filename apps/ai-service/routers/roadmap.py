from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.gemini_client import gemini_client
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
        
        raw = await gemini_client.create_chat_completion(
            system_instruction=prompt,
            messages=[{
                "role": "user",
                "content": "Please generate the roadmap JSON based on my profile."
            }],
            max_tokens=4096
        )

        raw = raw.strip()
        if raw.startswith("```json"):
            raw = raw[7:]
        if raw.endswith("```"):
            raw = raw[:-3]
        
        return json.loads(raw.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

