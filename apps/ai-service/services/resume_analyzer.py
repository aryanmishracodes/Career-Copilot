"""
Resume Analyzer Engine — Free, local, no-API-needed resume intelligence.
Extracts skills, calculates ATS score, generates strengths summary.
"""
import re
import json
from typing import Optional


# ── Skill Database ──────────────────────────────────────────────────────────────

SKILL_DB = {
    # Frontend
    "React": "frontend", "Next.js": "frontend", "Vue": "frontend", "Vue.js": "frontend",
    "Angular": "frontend", "TypeScript": "frontend", "JavaScript": "frontend",
    "HTML": "frontend", "CSS": "frontend", "Tailwind CSS": "frontend", "Tailwind": "frontend",
    "Redux": "frontend", "jQuery": "frontend", "Sass": "frontend", "SCSS": "frontend",
    "Bootstrap": "frontend", "Svelte": "frontend", "Webpack": "frontend", "Vite": "frontend",
    "Material UI": "frontend", "Chakra UI": "frontend", "Styled Components": "frontend",
    "Framer Motion": "frontend", "Three.js": "frontend", "D3.js": "frontend",
    # Backend
    "Node.js": "backend", "Express": "backend", "Express.js": "backend",
    "Python": "backend", "Java": "backend", "Go": "backend", "Golang": "backend",
    "Rust": "backend", "C++": "backend", "C#": "backend", "Ruby": "backend",
    "PHP": "backend", "Kotlin": "backend", "Scala": "backend", "Swift": "backend",
    "FastAPI": "backend", "Django": "backend", "Flask": "backend", "Spring": "backend",
    "Spring Boot": "backend", "GraphQL": "backend", "REST": "backend", "REST API": "backend",
    ".NET": "backend", "ASP.NET": "backend", "Laravel": "backend", "Rails": "backend",
    "NestJS": "backend", "Hono": "backend", "Fastify": "backend",
    # Cloud & DevOps
    "AWS": "cloud", "Azure": "cloud", "GCP": "cloud", "Google Cloud": "cloud",
    "Docker": "cloud", "Kubernetes": "cloud", "K8s": "cloud",
    "Terraform": "cloud", "Ansible": "cloud", "Pulumi": "cloud",
    "CI/CD": "cloud", "Jenkins": "cloud", "GitHub Actions": "cloud", "GitLab CI": "cloud",
    "Linux": "cloud", "Nginx": "cloud", "Apache": "cloud",
    "Vercel": "cloud", "Netlify": "cloud", "Heroku": "cloud", "Railway": "cloud",
    "Cloudflare": "cloud", "DigitalOcean": "cloud",
    # Databases
    "SQL": "data", "PostgreSQL": "data", "MongoDB": "data", "Redis": "data",
    "MySQL": "data", "SQLite": "data", "DynamoDB": "data", "Cassandra": "data",
    "Elasticsearch": "data", "Firebase": "data", "Firestore": "data", "Supabase": "data",
    "Prisma": "data", "Drizzle": "data", "Mongoose": "data", "Sequelize": "data",
    # AI/ML
    "TensorFlow": "ai", "PyTorch": "ai", "Machine Learning": "ai", "Deep Learning": "ai",
    "NLP": "ai", "Computer Vision": "ai", "OpenAI": "ai", "LangChain": "ai",
    "Scikit-learn": "ai", "Pandas": "ai", "NumPy": "ai", "Keras": "ai",
    "Hugging Face": "ai", "NLTK": "ai", "OpenCV": "ai", "Jupyter": "ai",
    # Tools & Other
    "Git": "tools", "GitHub": "tools", "GitLab": "tools", "Bitbucket": "tools",
    "Jira": "tools", "Confluence": "tools", "Figma": "tools", "Notion": "tools",
    "Postman": "tools", "Swagger": "tools", "VS Code": "tools",
    "Agile": "other", "Scrum": "other", "Kanban": "other",
    "System Design": "other", "Microservices": "other", "Monorepo": "other",
    "OAuth": "other", "JWT": "other", "WebSocket": "other", "gRPC": "other",
    "Unit Testing": "other", "Jest": "other", "Cypress": "other", "Playwright": "other",
    "Mocha": "other", "Pytest": "other", "Selenium": "other",
    "Data Structures": "other", "Algorithms": "other", "OOP": "other",
}

# Action verbs that indicate strong resume writing
ACTION_VERBS = [
    "developed", "built", "designed", "implemented", "created", "architected",
    "engineered", "optimized", "improved", "increased", "reduced", "managed",
    "led", "mentored", "delivered", "deployed", "automated", "integrated",
    "scaled", "refactored", "maintained", "launched", "collaborated",
    "spearheaded", "pioneered", "established", "streamlined", "transformed",
    "orchestrated", "contributed", "analyzed", "resolved", "configured",
]

# Common resume sections
SECTION_PATTERNS = {
    "experience": r"(?i)(work\s*experience|professional\s*experience|experience|employment|work\s*history)",
    "education": r"(?i)(education|academic|qualification|degree)",
    "skills": r"(?i)(skills|technical\s*skills|technologies|tech\s*stack|competencies|proficiencies)",
    "projects": r"(?i)(projects|personal\s*projects|portfolio|side\s*projects)",
    "certifications": r"(?i)(certifications?|certificates?|licenses?|accreditations?)",
    "summary": r"(?i)(summary|objective|about\s*me|profile|overview)",
}


def extract_skills(text: str) -> list[dict]:
    """Extract skills from resume text with confidence scoring."""
    found = []
    seen = set()

    for skill, category in SKILL_DB.items():
        if skill.lower() in seen:
            continue

        # For skills with special chars (C++, C#, .NET), use simple case-insensitive search
        # For normal skills, use word boundaries
        has_special = any(c in skill for c in ['+', '#', '.'])
        if has_special:
            count = text.lower().count(skill.lower())
        else:
            pattern = re.compile(r'(?<![a-zA-Z])' + re.escape(skill) + r'(?![a-zA-Z])', re.IGNORECASE)
            matches = pattern.findall(text)
            count = len(matches)

        if count > 0:
            # Higher count = higher confidence
            base = 70
            confidence = min(98, base + count * 5)
            found.append({
                "name": skill,
                "category": category,
                "confidence_score": confidence,
                "mentions": count,
            })
            seen.add(skill.lower())

    found.sort(key=lambda x: x["confidence_score"], reverse=True)
    return found


def extract_contact_info(text: str) -> dict:
    """Extract email and phone from resume text."""
    email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
    phone_match = re.search(r'[\+]?[\d\s\-\(\)]{10,15}', text)
    linkedin_match = re.search(r'linkedin\.com/in/[\w-]+', text, re.IGNORECASE)
    github_match = re.search(r'github\.com/[\w-]+', text, re.IGNORECASE)

    return {
        "email": email_match.group(0) if email_match else None,
        "phone": phone_match.group(0).strip() if phone_match else None,
        "linkedin": linkedin_match.group(0) if linkedin_match else None,
        "github": github_match.group(0) if github_match else None,
    }


def extract_name(text: str) -> str:
    """Extract candidate name (usually the first non-empty line)."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines[:3]:
        # Skip if it looks like a URL, email, or section header
        if any(kw in line.lower() for kw in ["http", "@", "resume", "cv", "curriculum"]):
            continue
        if len(line) < 60 and not re.match(r'^\d', line):
            return line
    return "Candidate"


def detect_sections(text: str) -> dict[str, bool]:
    """Detect which standard resume sections are present."""
    return {
        section: bool(re.search(pattern, text))
        for section, pattern in SECTION_PATTERNS.items()
    }


def count_action_verbs(text: str) -> list[str]:
    """Find strong action verbs used in the resume."""
    text_lower = text.lower()
    return [v for v in ACTION_VERBS if re.search(r'\b' + v + r'\b', text_lower)]


def find_quantifiable_achievements(text: str) -> int:
    """Count quantifiable metrics (percentages, dollar amounts, numbers with context)."""
    patterns = [
        r'\d+\s*%',           # percentages
        r'\$[\d,]+',          # dollar amounts
        r'\d+\s*\+?\s*(users|customers|clients|employees|team members)',
        r'(reduced|increased|improved|grew|saved)\s.*?\d+',
    ]
    total = 0
    for p in patterns:
        total += len(re.findall(p, text, re.IGNORECASE))
    return total


def calculate_ats_score(
    text: str,
    skills: list[dict],
    sections: dict[str, bool],
    contact: dict,
    action_verbs: list[str],
    metrics_count: int,
) -> dict:
    """Calculate a realistic ATS compatibility score out of 100."""
    score = 0
    breakdown = {}

    # 1. Contact Information (15 pts)
    contact_score = 0
    if contact["email"]: contact_score += 5
    if contact["phone"]: contact_score += 5
    if contact["linkedin"] or contact["github"]: contact_score += 5
    breakdown["contact_info"] = {"score": contact_score, "max": 15, "label": "Contact Information"}
    score += contact_score

    # 2. Resume Sections (20 pts)
    section_score = 0
    if sections.get("experience"): section_score += 6
    if sections.get("education"): section_score += 5
    if sections.get("skills"): section_score += 5
    if sections.get("projects"): section_score += 2
    if sections.get("summary"): section_score += 2
    breakdown["sections"] = {"score": section_score, "max": 20, "label": "Resume Structure"}
    score += section_score

    # 3. Technical Skills (25 pts)
    skill_count = len(skills)
    skill_score = min(25, skill_count * 3)
    breakdown["skills"] = {"score": skill_score, "max": 25, "label": "Technical Skills"}
    score += skill_score

    # 4. Action Verbs (15 pts)
    verb_score = min(15, len(action_verbs) * 2)
    breakdown["action_verbs"] = {"score": verb_score, "max": 15, "label": "Impact Language"}
    score += verb_score

    # 5. Quantifiable Achievements (15 pts)
    metric_score = min(15, metrics_count * 5)
    breakdown["metrics"] = {"score": metric_score, "max": 15, "label": "Quantifiable Results"}
    score += metric_score

    # 6. Resume Length (10 pts)
    word_count = len(text.split())
    if 300 <= word_count <= 900:
        length_score = 10
    elif 200 <= word_count <= 1200:
        length_score = 7
    else:
        length_score = 3
    breakdown["length"] = {"score": length_score, "max": 10, "label": "Resume Length"}
    score += length_score

    # Determine grade
    if score >= 85: grade = "Excellent"
    elif score >= 70: grade = "Good"
    elif score >= 55: grade = "Average"
    elif score >= 40: grade = "Below Average"
    else: grade = "Needs Improvement"

    return {
        "total_score": min(score, 100),
        "grade": grade,
        "breakdown": breakdown,
        "word_count": word_count,
    }


def generate_strengths_summary(
    name: str,
    skills: list[dict],
    sections: dict[str, bool],
    ats: dict,
) -> str:
    """Generate a professional strengths summary from extracted data."""
    # Categorize skills
    categories = {}
    for s in skills:
        cat = s["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(s["name"])

    # Build role description
    roles = []
    if "frontend" in categories and "backend" in categories:
        roles.append("Full-Stack Developer")
    elif "frontend" in categories:
        roles.append("Frontend Developer")
    elif "backend" in categories:
        roles.append("Backend Developer")
    if "cloud" in categories:
        roles.append("with cloud/DevOps proficiency")
    if "ai" in categories:
        roles.append("with AI/ML expertise")
    if "data" in categories and not roles:
        roles.append("Data Engineer")

    role_str = " ".join(roles) if roles else "Software Professional"

    # Build strengths
    top_skills = [s["name"] for s in skills[:6]]
    skills_str = ", ".join(top_skills[:-1]) + f" and {top_skills[-1]}" if len(top_skills) > 1 else (top_skills[0] if top_skills else "various technologies")

    summary = f"{name} presents as a {role_str} with demonstrated experience in {skills_str}."

    # Add category breakdown
    if len(categories) > 1:
        cat_names = {"frontend": "Frontend", "backend": "Backend", "cloud": "Cloud & DevOps", "data": "Databases", "ai": "AI/ML", "tools": "Developer Tools", "other": "Software Engineering"}
        cat_list = [cat_names.get(c, c) for c in categories.keys()]
        summary += f" Skill coverage spans {', '.join(cat_list)}, indicating a well-rounded technical profile."

    # ATS feedback
    if ats["total_score"] >= 75:
        summary += " This resume has strong ATS compatibility and should perform well in automated screening systems."
    elif ats["total_score"] >= 55:
        summary += " The resume has moderate ATS compatibility. Adding more quantifiable achievements and action verbs could improve screening outcomes."
    else:
        summary += " The resume may struggle with ATS screening. Consider restructuring with clear section headers, more technical keywords, and measurable impact statements."

    return summary


def generate_improvement_tips(ats: dict, sections: dict, skills: list) -> list[str]:
    """Generate actionable tips to improve the resume."""
    tips = []
    bd = ats["breakdown"]

    if bd["contact_info"]["score"] < 10:
        tips.append("Add LinkedIn profile or GitHub link to strengthen your professional presence.")
    if not sections.get("summary"):
        tips.append("Add a professional summary/objective at the top of your resume.")
    if bd["skills"]["score"] < 15:
        tips.append("List more technical skills explicitly — ATS systems scan for specific technology keywords.")
    if bd["action_verbs"]["score"] < 8:
        tips.append("Start bullet points with strong action verbs like 'Developed', 'Architected', 'Optimized'.")
    if bd["metrics"]["score"] < 8:
        tips.append("Add quantifiable achievements (e.g., 'Reduced load time by 40%', 'Served 10K+ users').")
    if not sections.get("projects"):
        tips.append("Add a Projects section to showcase hands-on work, especially for newer developers.")
    if ats["word_count"] < 250:
        tips.append("Your resume seems too short. Add more detail about your experience and achievements.")
    if ats["word_count"] > 1000:
        tips.append("Your resume is quite long. Consider trimming to 1-2 pages for maximum impact.")
    if not sections.get("education"):
        tips.append("Include an Education section with your degree, institution, and graduation year.")

    if not tips:
        tips.append("Your resume looks well-structured! Keep it updated with your latest achievements.")

    return tips[:5]  # Top 5 most impactful tips


def analyze_resume(text: str) -> dict:
    """Main analysis function — runs the complete resume intelligence pipeline."""
    name = extract_name(text)
    contact = extract_contact_info(text)
    skills = extract_skills(text)
    sections = detect_sections(text)
    action_verbs = count_action_verbs(text)
    metrics_count = find_quantifiable_achievements(text)

    ats = calculate_ats_score(text, skills, sections, contact, action_verbs, metrics_count)
    summary = generate_strengths_summary(name, skills, sections, ats)
    tips = generate_improvement_tips(ats, sections, skills)

    return {
        "name": name,
        "email": contact["email"],
        "contact": contact,
        "summary": summary,
        "skills": skills,
        "sections_found": sections,
        "ats_score": ats,
        "action_verbs_used": action_verbs,
        "metrics_found": metrics_count,
        "improvement_tips": tips,
        "experience": [],
        "education": [],
        "projects": [],
    }
