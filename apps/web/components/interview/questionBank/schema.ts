// ── Question schema ───────────────────────────────────────────────────────────
// Every question in every bank must conform to this interface.

export type CognitiveMode =
  | "implementation"   // write/describe code
  | "optimization"     // improve time/space
  | "tradeoff"         // compare approaches
  | "debugging"        // find/fix issues
  | "scalability"      // handle growth
  | "design"           // architect a system
  | "communication"    // explain to stakeholders
  | "behavioral";      // STAR-format experience

export type Difficulty = "easy" | "medium" | "hard";

export type CompanyStyle =
  | "faang"       // deep systems, complexity analysis
  | "startup"     // practical, shipping-focused
  | "enterprise"  // process, reliability, compliance
  | "any";

export interface Question {
  id: string;
  interviewType: string;
  topic: string;           // broad area: "arrays", "system-design", "behavioral"
  subtopic: string;        // specific concept: "two-sum", "url-shortener", "conflict"
  difficulty: Difficulty;
  cognitiveMode: CognitiveMode;
  question: string;
  idealAnswer: string;
  recruiterSignals: string[];   // what a strong answer demonstrates
  redFlags: string[];           // common mistakes that hurt candidates
  followupEligible: boolean;
  followups: string[];          // 1-2 max, only asked after strong primary answer
  estimatedMinutes: number;
  tags: string[];
  companyStyle: CompanyStyle;
}
