from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.resume_parser import extract_text
from services.resume_analyzer import analyze_resume
from services.embeddings import embed_text, upsert_to_pinecone
import base64

router = APIRouter(prefix="/resume", tags=["resume"])

class ParseRequest(BaseModel):
    resume_id: str
    user_id: str
    file_b64: str
    mime_type: str

@router.post("/parse")
async def parse_resume(req: ParseRequest):
    try:
        raw_bytes = base64.b64decode(req.file_b64)
        
        # Extract text using the right parser for the file type
        raw_text = extract_text(raw_bytes, req.mime_type)

        if not raw_text or len(raw_text.strip()) < 20:
            raise ValueError("Could not extract meaningful text from the uploaded file.")

        # Debug: safely print snippet
        try:
            safe = raw_text[:300].encode('ascii', errors='replace').decode('ascii')
            print(f"[RESUME] First 300 chars: {safe}")
        except Exception:
            print(f"[RESUME] Extracted {len(raw_text)} chars (cannot display)")

        # Run the full resume analysis pipeline (free, no API needed!)
        analysis = analyze_resume(raw_text)

        # Embed and store (mock for now)
        embedding_id = await embed_and_store(raw_text, req.resume_id, req.user_id)

        return {
            "raw_text": raw_text,
            "structured": analysis,
            "embedding_id": embedding_id,
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

async def embed_and_store(text: str, resume_id: str, user_id: str) -> str:
    vector = await embed_text(text)
    embedding_id = f"resume_{resume_id}"
    await upsert_to_pinecone(embedding_id, vector, {"user_id": user_id, "type": "resume"})
    return embedding_id
