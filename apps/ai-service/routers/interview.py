from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.gemini_client import gemini_client
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
        
        raw = await gemini_client.create_chat_completion(
            system_instruction=prompt,
            messages=messages,
            max_tokens=2048
        )

        raw = raw.strip()
        if raw.startswith("```json"):
            raw = raw[7:]
        if raw.endswith("```"):
            raw = raw[:-3]
        
        return json.loads(raw.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

