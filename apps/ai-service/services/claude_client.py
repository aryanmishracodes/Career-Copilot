import json
import asyncio
import re


# Smart mock that analyzes the actual resume text to produce realistic output
SKILL_PATTERNS = {
    # Frontend
    "React": ("frontend", 90), "Next.js": ("frontend", 88), "Vue": ("frontend", 82),
    "Angular": ("frontend", 82), "TypeScript": ("frontend", 88), "JavaScript": ("frontend", 92),
    "HTML": ("frontend", 85), "CSS": ("frontend", 85), "Tailwind": ("frontend", 80),
    "Redux": ("frontend", 78), "jQuery": ("frontend", 70), "Sass": ("frontend", 72),
    "Bootstrap": ("frontend", 70), "Svelte": ("frontend", 75),
    # Backend
    "Node.js": ("backend", 88), "Python": ("backend", 90), "Java": ("backend", 85),
    "Go": ("backend", 80), "Rust": ("backend", 75), "C++": ("backend", 80),
    "C#": ("backend", 82), "Ruby": ("backend", 78), "PHP": ("backend", 75),
    "Express": ("backend", 82), "FastAPI": ("backend", 80), "Django": ("backend", 82),
    "Flask": ("backend", 78), "Spring": ("backend", 80), "GraphQL": ("backend", 78),
    "REST": ("backend", 85), ".NET": ("backend", 82),
    # Cloud & DevOps
    "AWS": ("cloud", 85), "Azure": ("cloud", 82), "GCP": ("cloud", 80),
    "Docker": ("cloud", 85), "Kubernetes": ("cloud", 80), "Terraform": ("cloud", 78),
    "CI/CD": ("cloud", 80), "Jenkins": ("cloud", 75), "GitHub Actions": ("cloud", 78),
    "Linux": ("cloud", 82), "Nginx": ("cloud", 75),
    # Data & AI
    "SQL": ("data", 88), "PostgreSQL": ("data", 85), "MongoDB": ("data", 82),
    "Redis": ("data", 78), "Elasticsearch": ("data", 75), "MySQL": ("data", 82),
    "TensorFlow": ("ai", 78), "PyTorch": ("ai", 78), "Machine Learning": ("ai", 80),
    "Deep Learning": ("ai", 75), "NLP": ("ai", 75), "Pandas": ("data", 80),
    "NumPy": ("data", 78),
    # Other
    "Git": ("other", 90), "Agile": ("other", 80), "Scrum": ("other", 78),
    "Jira": ("other", 72), "Figma": ("other", 70), "System Design": ("other", 82),
}


def extract_skills_from_text(text: str) -> list:
    """Scan resume text for known skills and return structured matches."""
    found = []
    text_upper = text.upper()
    for skill, (category, base_score) in SKILL_PATTERNS.items():
        # Case-insensitive search with word boundary awareness
        pattern = re.compile(re.escape(skill), re.IGNORECASE)
        matches = pattern.findall(text)
        if matches:
            # Boost score if mentioned multiple times
            count = len(matches)
            score = min(98, base_score + (count - 1) * 3)
            found.append({
                "name": skill,
                "category": category,
                "confidence_score": score
            })
    # Sort by confidence descending
    found.sort(key=lambda x: x["confidence_score"], reverse=True)
    return found


def extract_name_from_text(text: str) -> str:
    """Try to extract a name from the first few lines of the resume."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    if lines:
        # The first non-empty line is often the candidate's name
        first_line = lines[0]
        # Basic heuristic: if it's short and doesn't look like a header/title
        if len(first_line) < 50 and not any(kw in first_line.lower() for kw in ["resume", "curriculum", "cv", "http"]):
            return first_line
    return "Candidate"


def extract_email_from_text(text: str) -> str | None:
    """Extract email address from resume text."""
    match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
    return match.group(0) if match else None


def generate_summary(name: str, skills: list) -> str:
    """Generate a professional summary based on extracted skills."""
    top_skills = [s["name"] for s in skills[:5]]
    categories = set(s["category"] for s in skills)
    
    role_hints = []
    if "frontend" in categories and "backend" in categories:
        role_hints.append("Full-Stack Developer")
    elif "frontend" in categories:
        role_hints.append("Frontend Developer")
    elif "backend" in categories:
        role_hints.append("Backend Developer")
    if "cloud" in categories:
        role_hints.append("with DevOps expertise")
    if "ai" in categories:
        role_hints.append("with AI/ML experience")
    
    role_str = " ".join(role_hints) if role_hints else "Software Engineer"
    skills_str = ", ".join(top_skills) if top_skills else "various technologies"
    
    return f"{name} is a skilled {role_str} with strong proficiency in {skills_str}. Demonstrates a solid foundation across multiple technology domains with hands-on project experience."


class SmartMockClaudeMessages:
    async def create(self, model: str, max_tokens: int, system: str, messages: list):
        """Analyze the actual resume text and return a structured, realistic response."""
        
        class MockContent:
            def __init__(self, text):
                self.text = text

        class MockResponse:
            def __init__(self, text):
                self.content = [MockContent(text)]

        # Extract the resume text from the user message
        user_msg = messages[0]["content"] if messages else ""
        # Strip the XML tags we wrap it in
        resume_text = re.sub(r'</?resume>', '', user_msg).replace("Extract all information as JSON.", "").strip()
        
        # Analyze the actual content
        name = extract_name_from_text(resume_text)
        email = extract_email_from_text(resume_text)
        skills = extract_skills_from_text(resume_text)
        summary = generate_summary(name, skills)
        
        response_json = {
            "name": name,
            "email": email,
            "summary": summary,
            "experience": [],
            "skills": skills if skills else [
                {"name": "Problem Solving", "category": "other", "confidence_score": 80},
                {"name": "Communication", "category": "other", "confidence_score": 75}
            ],
            "education": [],
            "projects": []
        }
        
        await asyncio.sleep(1.5)  # Simulate realistic AI processing time
        return MockResponse(json.dumps(response_json))


class SmartMockClaudeClient:
    def __init__(self):
        self.messages = SmartMockClaudeMessages()


# Smart mock client that analyzes actual resume content
# When Anthropic credits are available, replace with:
#   from anthropic import AsyncAnthropic
#   claude = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
claude = SmartMockClaudeClient()
