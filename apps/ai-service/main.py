from fastapi import FastAPI
from routers import resume, market, roadmap, interview

app = FastAPI(title="Career Copilot AI Service")

app.include_router(resume.router)
app.include_router(market.router)
app.include_router(roadmap.router)
app.include_router(interview.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "career-copilot-ai"}

# Print all registered routes on startup
@app.on_event("startup")
async def startup_debug():
    print("\n[STARTUP] Registered routes:")
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            print(f"  {list(route.methods)} {route.path}")
    print()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
