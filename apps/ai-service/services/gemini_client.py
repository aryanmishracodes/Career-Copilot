import os
import asyncio
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Ensure dotenv is loaded
load_dotenv()

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

class GeminiClient:
    def __init__(self):
        self._client = None

    def get_client(self):
        if self._client is None:
            if genai is None:
                raise ImportError("google-genai package is not installed. Please run: pip install google-genai")
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise ValueError("GEMINI_API_KEY environment variable is not set in .env")
            # Initialize official Google GenAI Client
            self._client = genai.Client(api_key=api_key)
        return self._client

    async def create_chat_completion(self, system_instruction: str, messages: list, max_tokens: int = 2048) -> str:
        client = self.get_client()
        
        # Convert messages to Gemini format (user/model)
        contents = []
        for m in messages:
            role = m.get("role", "user")
            if role in ["assistant", "model"]:
                role = "model"
            else:
                role = "user"
            
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=m.get("content", ""))]
                )
            )
            
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            max_output_tokens=max_tokens,
            temperature=0.7
        )
        
        # Use client.aio for async API calls with transient error retries (503/429) and fallback
        models_to_try = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']
        for model in models_to_try:
            max_retries = 2
            backoff = 1.0
            for attempt in range(max_retries):
                try:
                    response = await client.aio.models.generate_content(
                        model=model,
                        contents=contents,
                        config=config
                    )
                    return response.text
                except Exception as e:
                    if model == models_to_try[-1] and attempt == max_retries - 1:
                        raise e
                    err_str = str(e).lower()
                    if "503" in err_str or "429" in err_str or "unavailable" in err_str or "rate limit" in err_str:
                        if attempt < max_retries - 1:
                            print(f"[GEMINI] Transient error: {e} on model {model}. Retrying in {backoff}s...")
                            await asyncio.sleep(backoff)
                            backoff *= 2.0
                        else:
                            print(f"[GEMINI] Exhausted retries for model {model}. Falling back...")
                            break
                    else:
                        raise e

gemini_client = GeminiClient()
