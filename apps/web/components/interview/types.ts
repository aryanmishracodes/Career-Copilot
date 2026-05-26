// ── Shared types for the interview system ─────────────────────────────────────

export interface ResumeData {
  name?: string;
  skills?: { name: string; category: string; confidence_score: number }[];
  ats_score?: { total_score: number };
  action_verbs_used?: string[];
  metrics_found?: number;
  sections_found?: Record<string, boolean>;
  experience?: { company: string; title: string; description: string }[];
  projects?: { name: string; description: string; tech_stack: string[] }[];
}

export interface InterviewType {
  id: string;
  label: string;
  description: string;
  domains: string[];
  difficulty: "Entry" | "Mid" | "Senior";
}

// ── Interviewer personality ───────────────────────────────────────────────────

export type PersonalityId =
  | "faang_engineer"
  | "startup_cto"
  | "hiring_manager"
  | "staff_engineer"
  | "behavioral_recruiter";

export interface InterviewerPersonality {
  id: PersonalityId;
  name: string;
  title: string;
  style: string;
  strictness: "High" | "Medium" | "Relaxed";
  tone: string;
}

// ── Evaluation state (replaces raw numeric-only scoring) ─────────────────────

export type EvaluationState =
  | "evaluation_aborted"       // invalid / gibberish
  | "no_meaningful_response"   // too short / placeholder
  | "weak_understanding"       // score < 35
  | "partial_understanding"    // score 35–54
  | "basic_industry_readiness" // score 55–69
  | "strong_technical_signal"  // score 70–82
  | "production_level"         // score 83–90
  | "senior_level_reasoning";  // score > 90

export type PassFailPrediction =
  | "likely_rejected"
  | "borderline"
  | "strong_signal"
  | "likely_advanced";

// ── Validation ────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  invalidReason?: string;
  invalidCategory?:
    | "gibberish"
    | "too_short"
    | "placeholder"
    | "repetition"
    | "irrelevant"
    | "low_density";
}

export interface EvaluationScores {
  technical: number;
  communication: number;
  relevance: number;
  depth: number;
  structure: number;
}

// ── Turn ──────────────────────────────────────────────────────────────────────

export interface Turn {
  id: string;
  question: string;
  answer: string;
  feedback: string;
  idealAnswer?: string;          // populated from question bank
  scores: EvaluationScores;
  overallPct: number;
  evaluationState: EvaluationState;
  passFail: PassFailPrediction;
  passFailReason: string;
  strengths: string[];
  weaknesses: string[];
  recruiterImpression: string;
  bluffDetected: boolean;
  bluffNote?: string;
  followUpUsed: boolean;
  timestamp: number;
  validation: ValidationResult;
  evaluationConfidence: "high" | "medium" | "low" | "invalid";
}

// ── Interview length ──────────────────────────────────────────────────────────

export interface InterviewLength {
  questions: number;
  label: string;
  duration: string;
  intensity: string;
  intensityColor: string;
}

// ── Session analytics ─────────────────────────────────────────────────────────

export interface SessionAnalytics {
  avgScore: number;
  strongestDomain: string;
  weakestArea: string;
  communicationTrend: "improving" | "declining" | "stable";
  technicalDepth: number;
  hiringReadiness: "Strong" | "Moderate" | "Needs Work";
  recurringWeaknesses: string[];
  questionCount: number;
  overallPassFail: PassFailPrediction;
  bluffCount: number;
}

export type InterviewPhase = "setup" | "active" | "results";

// ── Question taxonomy ─────────────────────────────────────────────────────────

export type CognitiveMode =
  | "implementation"
  | "optimization"
  | "tradeoff"
  | "debugging"
  | "scalability"
  | "communication"
  | "design";

export type QuestionDifficulty = "easy" | "medium" | "hard";

