from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.claude_client import claude
from prompts.interview import INTERVIEW_SYSTEM_PROMPT
import json

router = APIRouter(prefix="/interview", tags=["interview"])

class InterviewAnswerRequest(BaseModel):
    interview_type: str
    target_role: str
    answer: str
    history: list[dict] # previous questions and answers

@router.post("/answer")
async def process_answer(req: InterviewAnswerRequest):
    try:
        prompt = INTERVIEW_SYSTEM_PROMPT.format(
            interview_type=req.interview_type,
            target_role=req.target_role
        )
        
        # Build message history
        messages = req.history.copy()
        messages.append({"role": "user", "content": req.answer})
        
        response = await claude.messages.create(
            model="claude-opus-4-6",
            max_tokens=2048,
            system=prompt,
            messages=messages
        )

        raw = response.content[0].text.strip()
        if raw.startswith("```json"):
            raw = raw[7:]
        if raw.endswith("```"):
            raw = raw[:-3]
        
        return json.loads(raw.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
