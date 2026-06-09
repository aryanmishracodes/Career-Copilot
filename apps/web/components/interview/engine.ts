// â”€â”€ Interview intelligence engine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Deterministic evaluation that runs instantly on the frontend.
// AI feedback from the backend is merged on top of this.

import type {
  Turn, SessionAnalytics, ResumeData, InterviewType,
  EvaluationState, PassFailPrediction, InterviewerPersonality, PersonalityId,
  ValidationResult, EvaluationScores,
} from "./types";

// â”€â”€ Interview type catalogue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const INTERVIEW_TYPES: InterviewType[] = [
  {
    id: "technical_screening",
    label: "Technical Screening",
    description: "General engineering fundamentals, problem-solving, and stack knowledge",
    domains: ["algorithms", "data structures", "system thinking"],
    difficulty: "Mid",
  },
  {
    id: "backend",
    label: "Backend Engineering",
    description: "APIs, databases, caching, distributed systems, and scalability",
    domains: ["Node.js", "databases", "REST", "caching"],
    difficulty: "Mid",
  },
  {
    id: "frontend",
    label: "Frontend Engineering",
    description: "React, performance, accessibility, state management, and browser APIs",
    domains: ["React", "TypeScript", "CSS", "performance"],
    difficulty: "Mid",
  },
  {
    id: "system_design",
    label: "System Design",
    description: "Distributed systems, scalability, trade-offs, and architecture decisions",
    domains: ["scalability", "databases", "caching", "load balancing"],
    difficulty: "Senior",
  },
  {
    id: "behavioral",
    label: "Behavioral / STAR",
    description: "Leadership, conflict resolution, ownership, and impact storytelling",
    domains: ["leadership", "communication", "ownership"],
    difficulty: "Mid",
  },
  {
    id: "resume_deep_dive",
    label: "Resume Deep Dive",
    description: "Probing questions directly from your projects, claims, and experience",
    domains: ["projects", "experience", "technical claims"],
    difficulty: "Mid",
  },
  {
    id: "dsa",
    label: "DSA Round",
    description: "Data structures, algorithms, time/space complexity, and coding patterns",
    domains: ["arrays", "trees", "graphs", "dynamic programming"],
    difficulty: "Senior",
  },
  {
    id: "devops",
    label: "DevOps / Cloud",
    description: "CI/CD, containerization, infrastructure, and deployment strategies",
    domains: ["Docker", "Kubernetes", "CI/CD", "AWS"],
    difficulty: "Mid",
  },
];

// â”€â”€ Suggested type from resume â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function suggestInterviewType(resume: ResumeData | null): string {
  if (!resume?.skills?.length) return "technical_screening";
  const cats = resume.skills.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1;
    return acc;
  }, {});
  const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0];
  const map: Record<string, string> = {
    backend: "backend",
    frontend: "frontend",
    cloud: "devops",
    ai: "technical_screening",
    data: "backend",
  };
  return map[top] ?? "technical_screening";
}

// â”€â”€ Resume context string for AI prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function buildResumeContext(resume: ResumeData | null): string {
  if (!resume) return "";
  const skills = (resume.skills ?? []).slice(0, 8).map((s) => s.name).join(", ");
  const projects = (resume.projects ?? [])
    .slice(0, 2)
    .map((p) => `${p.name} (${(p.tech_stack ?? []).join(", ")})`)
    .join("; ");
  const exp = (resume.experience ?? [])
    .slice(0, 1)
    .map((e) => `${e.title} at ${e.company}`)
    .join(", ");
  return [
    skills && `Skills: ${skills}`,
    projects && `Projects: ${projects}`,
    exp && `Experience: ${exp}`,
  ]
    .filter(Boolean)
    .join(". ");
}

// â”€â”€ Interviewer personalities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const INTERVIEWER_PERSONALITIES: InterviewerPersonality[] = [
  {
    id: "faang_engineer",
    name: "Alex Chen",
    title: "Senior Engineer, FAANG",
    style: "Structured, deep systems thinking, expects trade-off reasoning",
    strictness: "High",
    tone: "Precise and methodical",
  },
  {
    id: "startup_cto",
    name: "Jordan Park",
    title: "CTO, Series B Startup",
    style: "Fast-paced, practical, values shipping over theory",
    strictness: "Medium",
    tone: "Direct and blunt",
  },
  {
    id: "hiring_manager",
    name: "Sam Rivera",
    title: "Engineering Manager",
    style: "Balanced technical and communication focus, team-fit oriented",
    strictness: "Relaxed",
    tone: "Warm but probing",
  },
  {
    id: "staff_engineer",
    name: "Morgan Lee",
    title: "Staff Engineer",
    style: "Skeptical, challenges vague answers, expects production experience",
    strictness: "High",
    tone: "Skeptical and challenging",
  },
  {
    id: "behavioral_recruiter",
    name: "Taylor Kim",
    title: "Technical Recruiter",
    style: "STAR-focused, communication clarity, impact storytelling",
    strictness: "Medium",
    tone: "Encouraging but structured",
  },
];

export function getPersonality(id: PersonalityId): InterviewerPersonality {
  return INTERVIEWER_PERSONALITIES.find((p) => p.id === id) ?? INTERVIEWER_PERSONALITIES[0];
}

// â”€â”€ Evaluation state derivation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function deriveEvaluationState(
  overallPct: number,
  valid: boolean
): EvaluationState {
  if (!valid) return "evaluation_aborted";
  if (overallPct < 15) return "no_meaningful_response";
  if (overallPct < 35) return "weak_understanding";
  if (overallPct < 55) return "partial_understanding";
  if (overallPct < 70) return "basic_industry_readiness";
  if (overallPct < 83) return "strong_technical_signal";
  if (overallPct < 91) return "production_level";
  return "senior_level_reasoning";
}

export const EVALUATION_STATE_META: Record<EvaluationState, {
  label: string;
  color: string;
  badgeStyle: string;
  description: string;
}> = {
  evaluation_aborted: { label: "Evaluation Aborted", color: "text-red-500", badgeStyle: "bg-red-950/40 text-red-400 border-red-900", description: "Response could not be evaluated" },
  no_meaningful_response: { label: "No Meaningful Response", color: "text-red-400", badgeStyle: "bg-red-950/30 text-red-400 border-red-900/60", description: "Insufficient content to assess" },
  weak_understanding: { label: "Weak Understanding", color: "text-red-400", badgeStyle: "bg-red-950/20 text-red-400/80 border-red-900/40", description: "Significant gaps in domain knowledge" },
  partial_understanding: { label: "Partial Understanding", color: "text-amber-400", badgeStyle: "bg-amber-950/30 text-amber-400 border-amber-900", description: "Surface-level grasp, lacks depth" },
  basic_industry_readiness: { label: "Basic Industry Readiness", color: "text-amber-300", badgeStyle: "bg-amber-950/20 text-amber-300 border-amber-900/60", description: "Meets minimum bar for junior roles" },
  strong_technical_signal: { label: "Strong Technical Signal", color: "text-emerald-400", badgeStyle: "bg-emerald-950/40 text-emerald-400 border-emerald-900", description: "Clear domain competence demonstrated" },
  production_level: { label: "Production-Level Response", color: "text-emerald-300", badgeStyle: "bg-emerald-950/30 text-emerald-300 border-emerald-900/60", description: "Demonstrates real-world engineering experience" },
  senior_level_reasoning: { label: "Senior-Level Reasoning", color: "text-blue-300", badgeStyle: "bg-blue-950/40 text-blue-300 border-blue-900", description: "Exceptional depth and trade-off awareness" },
};

// â”€â”€ Pass/fail prediction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function derivePassFail(
  overallPct: number,
  relevance: number,
  valid: boolean
): { prediction: PassFailPrediction; reason: string } {
  if (!valid || overallPct < 20) {
    return {
      prediction: "likely_rejected",
      reason: "Response did not meet minimum evaluation threshold. No meaningful technical content detected.",
    };
  }
  if (relevance < 30 || overallPct < 38) {
    return {
      prediction: "likely_rejected",
      reason: `Low semantic relevance (${relevance}%) and insufficient technical depth. Would not advance past initial screening.`,
    };
  }
  if (overallPct < 55) {
    return {
      prediction: "borderline",
      reason: `Answer shows partial understanding but lacks the depth expected for this role. Recruiter would likely probe further before deciding.`,
    };
  }
  if (overallPct < 72) {
    return {
      prediction: "strong_signal",
      reason: `Solid technical response with clear domain knowledge. Recruiter would likely advance to the next stage.`,
    };
  }
  return {
    prediction: "likely_advanced",
    reason: `Strong answer demonstrating production-level understanding. High probability of advancing to the next round.`,
  };
}

// â”€â”€ Bluff detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ADVANCED_TERMS = [
  "eventual consistency", "cap theorem", "raft consensus", "paxos",
  "vector clocks", "crdt", "saga pattern", "event sourcing", "cqrs",
  "zero-copy", "lock-free", "memory barrier", "jit compilation",
  "garbage collection tuning", "b-tree", "lsm tree", "bloom filter",
  "consistent hashing", "merkle tree", "hyperloglog",
];

const SHALLOW_INDICATORS = [
  /\b(basically|essentially|kind of|sort of|i think|i believe|maybe|probably|i guess)\b/gi,
  /\b(it's like|you know|stuff like that|and so on|etc\.?)\b/gi,
];

export function detectBluff(answer: string): { detected: boolean; note?: string } {
  const lower = answer.toLowerCase();
  const wordCount = answer.trim().split(/\s+/).length;

  // Find advanced terms used
  const usedAdvanced = ADVANCED_TERMS.filter((t) => lower.includes(t));
  if (usedAdvanced.length === 0) return { detected: false };

  // Check if they're used with shallow language
  const shallowMatches = SHALLOW_INDICATORS.flatMap((p) => answer.match(p) ?? []);
  const hasNoExplanation = !/(because|therefore|which means|this ensures|this prevents|as a result|the reason)/i.test(answer);
  const isShort = wordCount < 50;

  if (usedAdvanced.length >= 2 && (shallowMatches.length >= 2 || (hasNoExplanation && isShort))) {
    return {
      detected: true,
      note: `Advanced terminology referenced (${usedAdvanced.slice(0, 2).join(", ")}) without demonstrating implementation-level understanding.`,
    };
  }

  return { detected: false };
}

// â”€â”€ Varied recruiter feedback generator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns non-repetitive, context-aware feedback strings

const FEEDBACK_POOLS = {
  no_technical: [
    "The explanation lacked implementation-level detail.",
    "The response remained too surface-level for a technical discussion.",
    "No domain-specific vocabulary was demonstrated.",
    "The answer avoided concrete engineering concepts.",
    "Technical depth was insufficient for this question.",
  ],
  no_example: [
    "The answer would benefit from a concrete implementation example.",
    "No real-world scenario was referenced to ground the explanation.",
    "The response stayed theoretical â€” a practical example would strengthen it.",
    "Recruiters expect candidates to anchor answers in actual experience.",
    "The explanation lacked a specific use case or project reference.",
  ],
  no_tradeoff: [
    "The answer avoided concrete engineering trade-offs.",
    "No consideration of alternative approaches was demonstrated.",
    "Senior engineers are expected to discuss limitations and trade-offs.",
    "The response did not address when this approach would fail.",
    "A stronger answer would acknowledge the constraints of this solution.",
  ],
  low_relevance: [
    "The candidate did not meaningfully address the question asked.",
    "The response diverged from the core topic of the question.",
    "The answer lacked direct relevance to what was being evaluated.",
    "The explanation did not demonstrate understanding of the specific concept.",
    "The response appeared to address a different question entirely.",
  ],
  weak_structure: [
    "Communication structure weakened overall clarity.",
    "The answer lacked a clear progression of ideas.",
    "The response would benefit from a more organised structure.",
    "Ideas were presented without logical sequencing.",
    "The explanation jumped between concepts without clear transitions.",
  ],
  strong: [
    "The explanation demonstrated clear production-level understanding.",
    "Strong technical reasoning with appropriate depth.",
    "The candidate showed genuine familiarity with this domain.",
    "Well-structured response with concrete supporting detail.",
    "The answer reflected real engineering experience.",
  ],
  bluff: [
    "Candidate referenced advanced concepts without demonstrating implementation understanding.",
    "Technical terminology was used without substantive explanation.",
    "The response contained buzzwords without supporting reasoning.",
    "Advanced vocabulary was present but not backed by conceptual depth.",
  ],
};

function pickFeedback(pool: string[], seed: number): string {
  return pool[seed % pool.length];
}

export function generateVariedFeedback(
  scores: { technical: number; relevance: number; depth: number; structure: number },
  hasTechnical: boolean,
  hasExample: boolean,
  hasDepth: boolean,
  hasStructure: boolean,
  bluffDetected: boolean,
  seed: number
): string {
  const parts: string[] = [];

  if (bluffDetected) {
    parts.push(pickFeedback(FEEDBACK_POOLS.bluff, seed));
  } else if (scores.relevance < 35) {
    parts.push(pickFeedback(FEEDBACK_POOLS.low_relevance, seed));
  } else if (scores.technical >= 70 && scores.depth >= 60) {
    parts.push(pickFeedback(FEEDBACK_POOLS.strong, seed));
  } else {
    if (!hasTechnical) parts.push(pickFeedback(FEEDBACK_POOLS.no_technical, seed));
    if (!hasExample) parts.push(pickFeedback(FEEDBACK_POOLS.no_example, seed + 1));
    if (!hasDepth) parts.push(pickFeedback(FEEDBACK_POOLS.no_tradeoff, seed + 2));
    if (!hasStructure && parts.length === 0)
      parts.push(pickFeedback(FEEDBACK_POOLS.weak_structure, seed));
  }

  return parts.slice(0, 2).join(" ") || "The response was evaluated but lacked sufficient signal for detailed feedback.";
}



// ── Interview length presets ──────────────────────────────────────────────────────────────────────

export const INTERVIEW_LENGTHS = [
  { questions: 5, label: "Quick Practice", duration: "~10 mins", intensity: "Light", intensityColor: "text-emerald-400" },
  { questions: 10, label: "Standard Interview", duration: "~25 mins", intensity: "Moderate", intensityColor: "text-amber-400" },
  { questions: 20, label: "Intensive Session", duration: "~50 mins", intensity: "Demanding", intensityColor: "text-orange-400" },
  { questions: 40, label: "Marathon Mode", duration: "~90+ mins", intensity: "Extreme", intensityColor: "text-red-400" },
] as const;

// ── Question bank with ideal answers ─────────────────────────────────────────────────────────────

interface QuestionEntry {
  question: string;
  idealAnswer: string;
  concepts: string[];
}

const QUESTION_BANK: Record<string, QuestionEntry[]> = {
  backend: [
    {
      question: "Walk me through how you'd design a rate-limiting system for a high-traffic public API.",
      idealAnswer: "I'd use a token bucket or sliding window algorithm. Each client gets a bucket of N tokens that refills at a fixed rate. On each request, consume one token; if empty, return 429. Store state in Redis with atomic Lua scripts to avoid race conditions. For distributed systems, use Redis Cluster with consistent hashing so all API nodes share the same rate limit state. Add headers (X-RateLimit-Remaining, Retry-After) so clients can back off gracefully. For tiered limits, use separate buckets per plan. Key tradeoff: token bucket allows bursting; fixed window is simpler but has boundary spikes.",
      concepts: ["rate-limiting","token-bucket","redis-atomic","sliding-window"],
    },
    {
      question: "How do you handle database migrations in a production environment with zero downtime?",
      idealAnswer: "Use expand-contract (also called parallel change) pattern. Phase 1 (expand): add new columns as nullable, deploy code that writes to both old and new columns. Phase 2 (migrate): backfill existing rows in batches during off-peak hours. Phase 3 (contract): once all rows are migrated and old column is unused, drop it in a separate deployment. Never rename columns directly — always add new, migrate, drop old. Use tools like Flyway or Liquibase for versioned migrations. For large tables, use pt-online-schema-change or gh-ost to avoid table locks.",
      concepts: ["db-migration","expand-contract","zero-downtime","schema-change"],
    },
    {
      question: "Explain the trade-offs between SQL and NoSQL for a high-write, low-read workload.",
      idealAnswer: "For high-write, low-read: NoSQL (Cassandra, DynamoDB) often wins because they're optimised for write throughput via LSM trees — writes go to an in-memory memtable, then flush to SSTables, avoiding random disk I/O. SQL databases use B-trees which require random writes. However, SQL gives you ACID transactions, complex queries, and joins — critical if data consistency matters. Choose NoSQL when: writes vastly outnumber reads, data model is simple/document-like, horizontal scaling is needed. Choose SQL when: you need transactions, complex reporting, or strong consistency. Cassandra's eventual consistency is a real tradeoff — you may read stale data.",
      concepts: ["sql-vs-nosql","lsm-tree","acid","write-throughput"],
    },
    {
      question: "How would you debug a memory leak in a Node.js service under production load?",
      idealAnswer: "First, confirm it's a leak: monitor heap usage over time with process.memoryUsage() or Prometheus metrics — a leak shows monotonically increasing heap that doesn't drop after GC. Then take heap snapshots using --inspect flag and Chrome DevTools or clinic.js. Compare two snapshots taken minutes apart — look for objects that grew in count (Detached DOM nodes, closures, event listeners, cached Maps/Sets). Common causes: event listeners not removed, global caches without TTL, closures holding references, streams not destroyed. Fix: use WeakMap/WeakRef for caches, always remove event listeners in cleanup, set max size on LRU caches. In production, use --max-old-space-size and restart on OOM as a safety net while investigating.",
      concepts: ["memory-leak","heap-snapshot","nodejs-gc","weakmap"],
    },
    {
      question: "Describe how you'd implement idempotency in a payment processing API.",
      idealAnswer: "Accept an Idempotency-Key header (UUID) from the client. On first request: store the key + response in a database/Redis with a TTL (e.g. 24h). On duplicate request with same key: return the stored response without re-processing. The key insight is that the idempotency check and the payment operation must be atomic — use a database transaction or Redis SET NX (set if not exists) to prevent race conditions where two concurrent requests with the same key both pass the check. Return the same HTTP status and body as the original. This lets clients safely retry on network failures without double-charging.",
      concepts: ["idempotency","idempotency-key","redis-setnx","payment-api"],
    },
    {
      question: "What's your approach to connection pooling and when does it become a bottleneck?",
      idealAnswer: "Connection pooling reuses database connections instead of creating new ones per request — connection creation is expensive (TCP handshake, auth, SSL). Configure pool size based on: (DB max_connections / number of app instances). A common mistake is setting pool size too high — if you have 10 instances each with pool=100, that's 1000 connections, which can overwhelm Postgres (default max 100). Use PgBouncer as a connection proxy for Postgres to multiplex thousands of app connections into a small pool. Bottleneck signs: pool exhaustion errors, high wait times in pool metrics. Monitor: pool utilisation, wait queue depth, connection acquisition time.",
      concepts: ["connection-pooling","pgbouncer","db-connections","pool-exhaustion"],
    },
    {
      question: "How would you design a job queue system that guarantees at-least-once delivery?",
      idealAnswer: "Use a message broker (Redis with BullMQ, RabbitMQ, or SQS). Key design: (1) Producer writes job to queue atomically. (2) Consumer fetches job and sets a visibility timeout — job is hidden from other consumers but not deleted. (3) Consumer processes job and explicitly acknowledges (deletes) it on success. (4) If consumer crashes, visibility timeout expires and job reappears for retry. For idempotency, jobs must be idempotent since they may run multiple times. Store job state in DB to detect duplicates. Add dead-letter queue for jobs that fail N times. At-least-once is easier than exactly-once — exactly-once requires distributed transactions.",
      concepts: ["job-queue","at-least-once","visibility-timeout","dead-letter-queue"],
    },
    {
      question: "Explain the difference between optimistic and pessimistic locking. When would you use each?",
      idealAnswer: "Pessimistic locking: lock the row when you read it (SELECT FOR UPDATE), preventing others from modifying it until you commit. Use when: conflicts are frequent, operations are short, you can't tolerate retries (e.g. inventory reservation). Downside: reduces throughput, risk of deadlocks. Optimistic locking: read without locking, include a version number in your UPDATE WHERE version=N. If another transaction modified the row, your update affects 0 rows — detect this and retry. Use when: conflicts are rare, reads vastly outnumber writes, you want higher throughput. Downside: retry logic complexity, poor performance under high contention. Most web apps should default to optimistic locking.",
      concepts: ["optimistic-locking","pessimistic-locking","select-for-update","version-number"],
    },
    {
      question: "What happens internally when you type a URL into a browser and press Enter?",
      idealAnswer: "Discuss DNS resolution, TCP/TLS handshake, HTTP request lifecycle, load balancers, reverse proxies, backend services, database interactions, caching layers, and response rendering in the browser.",
      concepts: ["subtopic:web-fundamentals","mode:explanation","difficulty:medium","networking","http"],
    },
    {
      question: "How would you design a scalable REST API?",
      idealAnswer: "Discuss resource-oriented design, versioning, pagination, filtering, authentication, rate limiting, caching, observability, and horizontal scalability.",
      concepts: ["subtopic:rest-api","mode:design","difficulty:medium","http","backend"],
    },
    {
      question: "What is database indexing and when can indexes hurt performance?",
      idealAnswer: "Indexes improve read performance by avoiding full table scans. However, they increase storage usage and slow writes because indexes must be updated. Discuss B-Trees, composite indexes, and query optimization.",
      concepts: ["subtopic:database-indexing","mode:tradeoff","difficulty:medium","sql","performance"],
    },
    {
      question: "Explain ACID properties and why they matter.",
      idealAnswer: "Atomicity, Consistency, Isolation, Durability. Discuss transaction guarantees, rollback behavior, concurrency, and examples from financial systems.",
      concepts: ["subtopic:transactions","mode:explanation","difficulty:medium","acid","database"],
    },
    {
      question: "How would you prevent duplicate payment processing in a backend service?",
      idealAnswer: "Use idempotency keys, unique transaction identifiers, database constraints, retry-safe operations, and transaction management.",
      concepts: ["subtopic:idempotency","mode:design","difficulty:medium","payments","backend"],
    },
    {
      question: "What is connection pooling and why is it important?",
      idealAnswer: "Creating database connections is expensive. Connection pools reuse existing connections, reduce latency, improve throughput, and prevent database overload.",
      concepts: ["subtopic:connection-pooling","mode:optimization","difficulty:medium","database","performance"],
    },
    {
      question: "How would you handle millions of requests hitting a backend service simultaneously?",
      idealAnswer: "Discuss load balancing, horizontal scaling, caching, rate limiting, autoscaling, queue-based processing, and stateless service design.",
      concepts: ["subtopic:scalability","mode:design","difficulty:hard","load-balancing","distributed-systems"],
    },
    {
      question: "What are database transactions and when should they be used?",
      idealAnswer: "Transactions ensure multiple operations succeed or fail together. Discuss rollback, consistency, isolation levels, and practical examples like fund transfers.",
      concepts: ["subtopic:transactions","mode:implementation","difficulty:medium","database","consistency"],
    },
    {
      question: "Explain optimistic vs pessimistic locking.",
      idealAnswer: "Optimistic locking assumes conflicts are rare and validates before commit. Pessimistic locking prevents concurrent modifications via locks. Discuss tradeoffs and scalability implications.",
      concepts: ["subtopic:concurrency","mode:tradeoff","difficulty:hard","locking","database"],
    },
    {
      question: "How would you design a backend for a URL shortening service?",
      idealAnswer: "Discuss API design, unique ID generation, database schema, caching, analytics, scalability, partitioning, and failure handling.",
      concepts: ["subtopic:backend-design","mode:design","difficulty:medium","url-shortener","backend"],
    },
    {
      question: "What is Redis and when would you use it instead of a traditional database?",
      idealAnswer: "Redis is an in-memory data store optimized for extremely fast reads and writes. Use it for caching, session storage, rate limiting, leaderboards, pub/sub messaging, and frequently accessed data. Discuss persistence tradeoffs and memory limitations.",
      concepts: ["subtopic:redis","mode:tradeoff","difficulty:medium","caching","performance"],
    },
    {
      question: "How would you design a caching strategy for a high-traffic application?",
      idealAnswer: "Discuss cache-aside, write-through, write-behind, and read-through patterns. Consider cache invalidation, TTLs, hot keys, consistency tradeoffs, and monitoring cache hit rates.",
      concepts: ["subtopic:caching","mode:design","difficulty:medium","redis","performance"],
    },
    {
      question: "What is the CAP Theorem and why does it matter?",
      idealAnswer: "CAP states a distributed system can only guarantee two of Consistency, Availability, and Partition Tolerance simultaneously during network partitions. Discuss real-world examples and tradeoffs made by distributed databases.",
      concepts: ["subtopic:cap-theorem","mode:tradeoff","difficulty:hard","distributed-systems","consistency"],
    },
    {
      question: "Explain database replication and its advantages.",
      idealAnswer: "Replication creates copies of data across multiple servers. Discuss primary-replica architecture, failover, read scaling, replication lag, consistency concerns, and disaster recovery.",
      concepts: ["subtopic:replication","mode:design","difficulty:medium","database","high-availability"],
    },
    {
      question: "What is database sharding and when should it be used?",
      idealAnswer: "Sharding partitions data across multiple databases to scale horizontally. Discuss shard keys, rebalancing, hotspot problems, cross-shard queries, and operational complexity.",
      concepts: ["subtopic:sharding","mode:tradeoff","difficulty:hard","database-scaling","distributed-systems"],
    },
    {
      question: "Explain message queues and why backend systems use them.",
      idealAnswer: "Message queues decouple producers and consumers, improve reliability, absorb traffic spikes, and enable asynchronous processing. Discuss Kafka, RabbitMQ, retries, ordering, and dead-letter queues.",
      concepts: ["subtopic:message-queues","mode:design","difficulty:medium","async-processing","distributed-systems"],
    },
    {
      question: "What is CQRS and when would you adopt it?",
      idealAnswer: "CQRS separates read and write models to optimize each independently. Discuss scalability benefits, complexity tradeoffs, eventual consistency, and real-world use cases.",
      concepts: ["subtopic:cqrs","mode:tradeoff","difficulty:hard","architecture","distributed-systems"],
    },
    {
      question: "How would you process large background jobs without affecting API latency?",
      idealAnswer: "Use asynchronous job queues, worker processes, retries, monitoring, and dead-letter queues. Keep user-facing requests lightweight while heavy processing happens in the background.",
      concepts: ["subtopic:background-jobs","mode:design","difficulty:medium","queues","backend"],
    },
    {
      question: "What are read replicas and how do they improve scalability?",
      idealAnswer: "Read replicas offload read traffic from the primary database. Discuss replication lag, eventual consistency, failover considerations, and read-write splitting.",
      concepts: ["subtopic:read-replicas","mode:optimization","difficulty:medium","database","scaling"],
    },
    {
      question: "How would you design an event-driven architecture?",
      idealAnswer: "Services communicate through events instead of direct calls. Discuss event producers, consumers, message brokers, schema evolution, observability, and eventual consistency.",
      concepts: ["subtopic:event-driven","mode:design","difficulty:hard","microservices","distributed-systems"],
    },
    {
      question: "What is consistent hashing and why is it used in distributed systems?",
      idealAnswer: "Consistent hashing distributes data across nodes while minimizing rebalancing when nodes are added or removed. It is commonly used in distributed caches, databases, and CDNs. Virtual nodes help improve load distribution.",
      concepts: ["subtopic:consistent-hashing","mode:tradeoff","difficulty:hard","distributed-systems","scalability"],
    },
    {
      question: "What is the Circuit Breaker pattern and why is it important?",
      idealAnswer: "A Circuit Breaker prevents cascading failures by stopping requests to unhealthy downstream services. States typically include Closed, Open, and Half-Open. It improves resilience and system stability.",
      concepts: ["subtopic:circuit-breaker","mode:design","difficulty:medium","resilience","microservices"],
    },
    {
      question: "How would you design an API Gateway for a microservices architecture?",
      idealAnswer: "Discuss request routing, authentication, rate limiting, caching, monitoring, request aggregation, retries, and service discovery integration. API gateways simplify client interactions with multiple services.",
      concepts: ["subtopic:api-gateway","mode:design","difficulty:medium","microservices","routing"],
    },
    {
      question: "What is service discovery and how does it work?",
      idealAnswer: "Service discovery allows services to locate each other dynamically. Discuss client-side vs server-side discovery, health checks, registration, Consul, Eureka, Kubernetes DNS, and failure handling.",
      concepts: ["subtopic:service-discovery","mode:explanation","difficulty:medium","microservices","distributed-systems"],
    },
    {
      question: "How would you handle distributed transactions across multiple services?",
      idealAnswer: "Distributed transactions are challenging because ACID guarantees do not naturally extend across services. Discuss Saga Pattern, compensating transactions, eventual consistency, and failure recovery strategies.",
      concepts: ["subtopic:distributed-transactions","mode:tradeoff","difficulty:hard","consistency","microservices"],
    },
    {
      question: "Explain the Saga Pattern and where it is useful.",
      idealAnswer: "A Saga coordinates distributed transactions using a sequence of local transactions and compensating actions. It avoids two-phase commit while supporting eventual consistency across microservices.",
      concepts: ["subtopic:saga-pattern","mode:design","difficulty:hard","microservices","distributed-systems"],
    },
    {
      question: "How would you implement rate limiting in a backend service?",
      idealAnswer: "Discuss Fixed Window, Sliding Window, Token Bucket, and Leaky Bucket algorithms. Explain Redis-based implementations, distributed enforcement, burst handling, and fairness considerations.",
      concepts: ["subtopic:rate-limiting","mode:design","difficulty:medium","redis","backend"],
    },
    {
      question: "When would you choose WebSockets over traditional HTTP?",
      idealAnswer: "WebSockets enable persistent bidirectional communication and are ideal for chat systems, multiplayer games, live dashboards, and notifications. Discuss scalability and connection management challenges.",
      concepts: ["subtopic:websockets","mode:tradeoff","difficulty:medium","real-time","networking"],
    },
    {
      question: "Compare gRPC and REST APIs.",
      idealAnswer: "REST is simple and widely adopted using HTTP/JSON. gRPC uses Protocol Buffers, supports streaming, offers lower latency, and provides strong contracts. Discuss interoperability and performance tradeoffs.",
      concepts: ["subtopic:grpc","mode:tradeoff","difficulty:medium","api-design","networking"],
    },
    {
      question: "What causes database deadlocks and how would you prevent them?",
      idealAnswer: "Deadlocks occur when transactions wait indefinitely on resources held by each other. Prevention strategies include consistent lock ordering, shorter transactions, timeout handling, and reducing lock contention.",
      concepts: ["subtopic:deadlocks","mode:optimization","difficulty:hard","database","concurrency"],
    },
    {
      question: "Explain database isolation levels and their tradeoffs.",
      idealAnswer: "Discuss Read Uncommitted, Read Committed, Repeatable Read, and Serializable isolation levels. Explain dirty reads, non-repeatable reads, phantom reads, and the tradeoff between consistency and concurrency.",
      concepts: ["subtopic:isolation-levels","mode:tradeoff","difficulty:hard","database","transactions"],
    },
    {
      question: "What is Event Sourcing and when should it be used?",
      idealAnswer: "Event Sourcing stores every state change as an immutable event rather than storing only the latest state. It provides auditability and replay capabilities but increases complexity. Common in financial and highly auditable systems.",
      concepts: ["subtopic:event-sourcing","mode:tradeoff","difficulty:hard","distributed-systems","architecture"],
    },
    {
      question: "What is the Outbox Pattern and why is it important?",
      idealAnswer: "The Outbox Pattern ensures reliable event publishing by storing events in the same transaction as business data. A separate process publishes events later, preventing inconsistencies between databases and message brokers.",
      concepts: ["subtopic:outbox-pattern","mode:design","difficulty:hard","microservices","reliability"],
    },
    {
      question: "How would you achieve exactly-once processing in distributed systems?",
      idealAnswer: "True exactly-once semantics are difficult. Use idempotent consumers, deduplication keys, transactional messaging, Kafka transactional APIs, and careful failure handling to approximate exactly-once behavior.",
      concepts: ["subtopic:exactly-once","mode:tradeoff","difficulty:hard","distributed-systems","messaging"],
    },
    {
      question: "Explain Kafka consumer groups and partitioning.",
      idealAnswer: "Consumer groups allow parallel consumption while ensuring a partition is processed by only one consumer in a group. Discuss rebalancing, partition assignment, ordering guarantees, and throughput scaling.",
      concepts: ["subtopic:kafka","mode:explanation","difficulty:medium","messaging","distributed-systems"],
    },
    {
      question: "What is leader election and why is it needed?",
      idealAnswer: "Leader election selects a coordinator among distributed nodes. Discuss Raft, ZooKeeper, etcd, failure detection, split-brain prevention, and coordination responsibilities.",
      concepts: ["subtopic:leader-election","mode:design","difficulty:hard","distributed-systems","consensus"],
    },
    {
      question: "Compare common load balancing algorithms.",
      idealAnswer: "Discuss Round Robin, Weighted Round Robin, Least Connections, Least Response Time, Consistent Hashing, and IP Hashing. Explain where each algorithm performs best.",
      concepts: ["subtopic:load-balancing","mode:tradeoff","difficulty:medium","networking","scalability"],
    },
    {
      question: "What are Blue-Green deployments and why are they useful?",
      idealAnswer: "Blue-Green deployments maintain two production environments. Traffic switches from the old version to the new version after validation, enabling safer releases and quick rollbacks.",
      concepts: ["subtopic:deployment-strategies","mode:design","difficulty:medium","devops","reliability"],
    },
    {
      question: "How would you design observability for a large backend system?",
      idealAnswer: "Discuss metrics, logs, traces, distributed tracing, correlation IDs, dashboards, alerting, SLOs, error budgets, and incident response workflows.",
      concepts: ["subtopic:observability","mode:design","difficulty:hard","monitoring","distributed-systems"],
    },
    {
      question: "Design a backend notification service capable of sending billions of notifications.",
      idealAnswer: "Discuss queue-based processing, retry strategies, dead-letter queues, user preferences, rate limiting, delivery tracking, multi-channel support (email, SMS, push), monitoring, and horizontal scalability.",
      concepts: ["subtopic:notification-service","mode:design","difficulty:hard","distributed-systems","scalability"],
    },
  ],
  frontend: [
    {
      question: "Explain how React's reconciliation algorithm works and when it causes performance issues.",
      idealAnswer: "React's reconciler (Fiber) compares the new virtual DOM tree against the previous one using a diffing algorithm. Key heuristics: (1) Elements of different types produce entirely new trees. (2) Elements with the same type update in place. (3) Keys help identify which list items changed. Performance issues arise when: keys are array indices (causes unnecessary re-renders on reorder), large lists re-render entirely (use React.memo or virtualization), context value changes trigger all consumers (split contexts), or expensive computations run on every render (use useMemo). The reconciler works in two phases: render (pure, can be interrupted) and commit (DOM mutations, synchronous). Concurrent Mode allows React to interrupt renders for higher-priority updates.",
      concepts: ["react-reconciliation","fiber","virtual-dom","react-keys"],
    },
    {
      question: "How do you approach code-splitting in a large Next.js application?",
      idealAnswer: "Next.js automatically code-splits by page — each page is its own bundle. Beyond that: use dynamic imports (next/dynamic) for heavy components that aren't needed on initial render (modals, charts, rich text editors). Use React.lazy + Suspense for client-side splits. Analyse bundle with @next/bundle-analyzer to find large dependencies. Common wins: replace moment.js with date-fns (tree-shakeable), lazy-load below-the-fold sections, split admin routes from public routes. For third-party scripts, use next/script with strategy='lazyOnload'. Key metric: reduce First Contentful Paint by ensuring the critical path bundle is under 100KB.",
      concepts: ["code-splitting","dynamic-import","nextjs-bundle","lazy-loading"],
    },
    {
      question: "When would useMemo hurt performance instead of help it?",
      idealAnswer: "useMemo has overhead: it stores the previous value and runs a comparison on every render. It hurts when: (1) The computation is cheap — the comparison cost exceeds the computation cost. (2) Dependencies change on every render anyway — memoization never hits. (3) You're memoizing primitive values — React already handles these efficiently. (4) Overuse creates memory pressure from storing cached values. Use useMemo only when: the computation is genuinely expensive (>1ms), the result is used in a dependency array of another hook, or you're passing a stable reference to a memoized child. Profile first — don't add useMemo speculatively.",
      concepts: ["usememo","react-memoization","react-performance","dependency-array"],
    },
    {
      question: "How would you improve the Core Web Vitals score of a slow-loading page?",
      idealAnswer: "LCP (Largest Contentful Paint): preload the hero image with <link rel='preload'>, use next/image for automatic WebP conversion and lazy loading, serve images from a CDN, eliminate render-blocking resources. FID/INP (Interaction to Next Paint): break up long tasks with scheduler.yield() or setTimeout, move heavy computation to Web Workers, reduce JavaScript bundle size. CLS (Cumulative Layout Shift): always specify width/height on images and iframes, avoid inserting content above existing content, use CSS aspect-ratio. General: enable HTTP/2, use resource hints (preconnect, dns-prefetch), implement service worker caching for repeat visits.",
      concepts: ["core-web-vitals","lcp","cls","inp"],
    },
    {
      question: "Describe how you'd handle optimistic UI updates with rollback on failure.",
      idealAnswer: "Pattern: (1) Immediately update local state to reflect the expected server response. (2) Fire the API call in the background. (3) On success, optionally sync with server response. (4) On failure, revert local state to the previous value and show an error. Implementation with React Query: use onMutate to snapshot previous data and apply optimistic update, onError to rollback using the snapshot, onSettled to refetch. Key considerations: generate a temporary ID for new items, handle concurrent mutations (last-write-wins vs. conflict detection), show subtle loading indicators so users know the action is in-flight. Don't optimistically update destructive actions (deletes) without confirmation.",
      concepts: ["optimistic-ui","react-query","rollback","mutation"],
    },
  ],
  system_design: [
    {
      question: "Design a URL shortener that handles 100 million requests per day.",
      idealAnswer: "Scale: 100M req/day = ~1,160 req/s average, ~5,000 req/s peak. Architecture: (1) ID generation: use base62 encoding of a counter from a distributed ID generator (Snowflake) or hash the URL and take first 7 chars with collision detection. (2) Storage: write short→long mapping to a database (Postgres or DynamoDB). (3) Caching: 80% of traffic hits 20% of URLs — cache hot URLs in Redis with LRU eviction. Cache hit rate should be >90%. (4) Read path: check Redis → if miss, query DB → return 301/302 redirect. (5) Write path: generate ID → store in DB → invalidate/warm cache. Scaling: read replicas for DB, Redis Cluster for cache, CDN for geographic distribution. Analytics: async event stream to Kafka → Spark for aggregation.",
      concepts: ["subtopic:url-shortener","mode:design","difficulty:medium","base62","redis-lru"],
    },
    {
      question: "How would you architect a real-time notification system for 10 million users?",
      idealAnswer: "Core challenge: maintaining 10M persistent connections. Architecture: (1) Use WebSockets or Server-Sent Events (SSE) — SSE is simpler for one-way notifications. (2) Connection layer: stateful WebSocket servers behind a load balancer. Use consistent hashing so a user's connection always routes to the same server. (3) Message routing: when event occurs, publish to Kafka. Notification service consumes Kafka, looks up which server holds the user's connection (stored in Redis), and pushes via internal pub/sub (Redis Pub/Sub or direct HTTP). (4) Offline users: store notifications in DB, deliver on reconnect. (5) Fan-out: for broadcast notifications, use Kafka consumer groups. Key tradeoffs: SSE vs WebSocket (SSE simpler, WebSocket bidirectional), push vs pull (push has lower latency, pull is simpler).",
      concepts: ["subtopic:notification-system","mode:scalability","difficulty:hard","websocket","kafka-pubsub"],
    },
    {
      question: "Walk me through designing a distributed cache with consistency guarantees.",
      idealAnswer: "Choose consistency model first: strong (all reads see latest write), eventual (reads may be stale), or read-your-writes. For strong consistency: use a single primary with synchronous replication — high consistency, lower availability. For eventual: use multi-primary with async replication — higher availability, possible stale reads. Implementation: consistent hashing to distribute keys across nodes, virtual nodes for even distribution. Replication factor of 3 (like Cassandra). For reads: quorum reads (R + W > N) give strong consistency. Cache invalidation strategies: TTL (simple, eventual), write-through (consistent, higher write latency), write-behind (async, risk of data loss). Handle node failures with gossip protocol for membership, hinted handoff for temporary failures.",
      concepts: ["subtopic:distributed-cache","mode:tradeoff","difficulty:hard","consistent-hashing","quorum-reads"],
    },
    {
      question: "How would you architect a multi-tenant SaaS application with data isolation?",
      idealAnswer: "Three isolation models: (1) Separate databases per tenant — strongest isolation, highest cost, complex ops. Use for enterprise/compliance requirements. (2) Separate schemas per tenant in one database — good isolation, moderate cost, schema migrations are complex. (3) Shared schema with tenant_id column — lowest cost, highest density, risk of data leakage if queries miss tenant filter. For most SaaS: start with shared schema + Row Level Security (Postgres RLS) to enforce tenant isolation at DB level. Add tenant_id to every table, create RLS policies, set tenant context per connection. For large tenants, shard to dedicated databases. Use connection pooling per tenant to prevent noisy neighbor. Encrypt tenant data with per-tenant keys for compliance.",
      concepts: ["subtopic:multi-tenancy","mode:design","difficulty:hard","row-level-security","data-isolation"],
    },
    {
      question: "Design a distributed rate limiter. How do you handle synchronization and race conditions across multiple nodes?",
      idealAnswer: "Use Redis with Token Bucket or Sliding Window Log. To avoid race conditions and network roundtrips, execute atomic Redis Lua scripts which check and decrement tokens in a single transaction. For horizontal scaling, use consistent hashing to route clients to specific Redis instances, or use Redis Cluster. To handle high scale (>100k RPS) where Redis becomes a bottleneck, use local in-memory token buckets on the application servers and sync back to Redis asynchronously in batches, trading accuracy for raw performance.",
      concepts: ["subtopic:distributed-rate-limiter","mode:scalability","difficulty:hard","redis-lua","consistent-hashing"],
    },
    {
      question: "Design a web crawler that crawls 1 billion pages monthly. How do you handle politeness and deduplication?",
      idealAnswer: "Architecture: (1) URL Frontier: queue of URLs to crawl. (2) DNS Resolver: cache DNS queries locally to avoid ISP load. (3) HTML Downloader: fetches pages. (4) Content Parser & Link Extractor. (5) Content Filter & Deduplication: use SimHash or MinHash to detect near-duplicate pages. (6) URL Deduplication: use a Bloom Filter containing all crawled URLs for O(1) membership check. Politeness: maintain queues grouped by host domain (e.g. example.com), and enforce a delay between requests to the same host using a coordinator (like Zookeeper). Scalability: distribute crawler nodes, partition the Frontier by domain hash.",
      concepts: ["subtopic:web-crawler","mode:design","difficulty:hard","bloom-filter","url-frontier"],
    },
    {
      question: "Design a URL shortening service like Bitly.",
      idealAnswer: "Discuss API design, unique ID generation using Base62 encoding, database schema, read-heavy optimization with caching, handling collisions, analytics tracking, and scalability concerns. Consider partitioning, CDN usage, and eventual consistency.",
      concepts: ["subtopic:url-shortener","mode:design","difficulty:medium","distributed-systems","caching"],
    },
    {
      question: "Design a real-time chat application like WhatsApp.",
      idealAnswer: "Cover WebSockets, message persistence, delivery guarantees, online presence, media handling, group messaging, horizontal scaling, and database sharding. Discuss eventual consistency and offline synchronization.",
      concepts: ["subtopic:chat-system","mode:design","difficulty:medium","websockets","real-time"],
    },
    {
      question: "Design a notification service used by millions of users.",
      idealAnswer: "Support email, push notifications, SMS, retries, rate limiting, queues, dead-letter handling, delivery tracking, user preferences, and horizontal scalability. Use asynchronous processing with message brokers.",
      concepts: ["subtopic:notification-system","mode:design","difficulty:medium","queues","event-driven"],
    },
    {
      question: "Design an API rate limiter.",
      idealAnswer: "Compare Token Bucket, Leaky Bucket, Fixed Window, Sliding Window, and Distributed Rate Limiting. Discuss Redis usage, consistency challenges, burst handling, and fault tolerance.",
      concepts: ["subtopic:rate-limiter","mode:tradeoff","difficulty:medium","redis","distributed-systems"],
    },
    {
      question: "Design a distributed cache like Redis.",
      idealAnswer: "Discuss in-memory storage, eviction policies, replication, partitioning, consistency tradeoffs, persistence mechanisms, failover handling, and cluster management.",
      concepts: ["subtopic:distributed-cache","mode:design","difficulty:hard","redis","replication"],
    },
    {
      question: "Design a news feed system like Instagram or Facebook.",
      idealAnswer: "Discuss fan-out strategies, ranking systems, feed generation, caching layers, storage optimization, recommendation systems, and scalability tradeoffs.",
      concepts: ["subtopic:news-feed","mode:design","difficulty:hard","social-media","feed-generation"],
    },
    {
      question: "Design a video streaming platform like YouTube.",
      idealAnswer: "Cover uploads, transcoding pipelines, CDN delivery, recommendation systems, metadata storage, search indexing, and large-scale content distribution.",
      concepts: ["subtopic:video-streaming","mode:design","difficulty:hard","cdn","distributed-storage"],
    },
    {
      question: "Design a distributed file storage system like Google Drive.",
      idealAnswer: "Discuss chunking, replication, metadata services, synchronization, sharing permissions, conflict resolution, and storage efficiency.",
      concepts: ["subtopic:file-storage","mode:design","difficulty:hard","distributed-storage","replication"],
    },
    {
      question: "Design a search autocomplete service.",
      idealAnswer: "Use tries, caching, ranking models, frequency tracking, prefix matching, query logging, and horizontal scalability. Discuss latency optimization.",
      concepts: ["subtopic:autocomplete","mode:optimization","difficulty:medium","search","trie"],
    },
    {
      question: "Design a web crawler for indexing the internet.",
      idealAnswer: "Discuss URL scheduling, deduplication, politeness policies, distributed crawling, storage, indexing pipelines, and fault tolerance.",
      concepts: ["subtopic:web-crawler","mode:design","difficulty:hard","distributed-processing","search"],
    },
    {
      question: "Design a ride-sharing platform like Uber.",
      idealAnswer: "Discuss driver-rider matching, location tracking, geospatial indexing, surge pricing, trip lifecycle, real-time updates via WebSockets, fault tolerance, and scalability. Explain how proximity searches and dispatch algorithms work.",
      concepts: ["subtopic:ride-sharing","mode:design","difficulty:hard","geospatial","real-time"],
    },
    {
      question: "Design a recommendation system for Netflix.",
      idealAnswer: "Discuss user profiling, collaborative filtering, content-based filtering, ranking pipelines, feature stores, model serving, feedback loops, and scalability. Explain online vs offline recommendation generation.",
      concepts: ["subtopic:recommendation-engine","mode:design","difficulty:hard","machine-learning","ranking"],
    },
    {
      question: "Design Google Maps.",
      idealAnswer: "Cover geospatial storage, routing algorithms, shortest path computation, traffic ingestion, map tiling, caching, location updates, and real-time route recalculation.",
      concepts: ["subtopic:maps-system","mode:design","difficulty:hard","graphs","geospatial"],
    },
    {
      question: "Design a distributed logging platform.",
      idealAnswer: "Discuss log ingestion, batching, storage tiers, indexing, search, retention policies, stream processing, and scalability. Consider systems like ELK, Splunk, or Datadog.",
      concepts: ["subtopic:logging-platform","mode:design","difficulty:medium","observability","distributed-systems"],
    },
    {
      question: "Design an analytics pipeline processing billions of events daily.",
      idealAnswer: "Cover event ingestion, Kafka, stream processing, aggregation, warehousing, real-time dashboards, fault tolerance, and exactly-once processing guarantees.",
      concepts: ["subtopic:analytics-pipeline","mode:design","difficulty:hard","stream-processing","big-data"],
    },
    {
      question: "Design a payment processing system.",
      idealAnswer: "Discuss transaction lifecycle, idempotency, fraud detection, ledger management, consistency guarantees, retries, auditing, and PCI compliance considerations.",
      concepts: ["subtopic:payment-system","mode:design","difficulty:hard","financial-systems","consistency"],
    },
    {
      question: "Design Kafka or a distributed messaging queue.",
      idealAnswer: "Discuss partitions, brokers, replication, consumer groups, ordering guarantees, durability, throughput optimization, and failure recovery.",
      concepts: ["subtopic:messaging-system","mode:design","difficulty:hard","kafka","distributed-systems"],
    },
    {
      question: "Design a service discovery system.",
      idealAnswer: "Cover service registration, health checks, leader election, DNS-based discovery, load balancing integration, and failure handling. Discuss systems like Consul, Eureka, or Kubernetes.",
      concepts: ["subtopic:service-discovery","mode:design","difficulty:medium","microservices","distributed-systems"],
    },
    {
      question: "Design a distributed job scheduler.",
      idealAnswer: "Discuss task queues, retries, worker coordination, scheduling algorithms, failure recovery, priority handling, and horizontal scaling.",
      concepts: ["subtopic:job-scheduler","mode:design","difficulty:medium","distributed-processing","task-execution"],
    },
    {
      question: "Design a hotel booking platform like Airbnb.",
      idealAnswer: "Discuss inventory management, search, availability consistency, booking transactions, payments, reviews, caching, and scalability under peak demand.",
      concepts: ["subtopic:booking-platform","mode:design","difficulty:hard","transactions","distributed-systems"],
    },
    {
      question: "Design a Content Delivery Network (CDN).",
      idealAnswer: "Discuss edge servers, cache invalidation, content replication, geographic routing, load balancing, origin shielding, cache eviction strategies, and latency optimization. Explain how requests are routed to the nearest edge location.",
      concepts: ["subtopic:cdn","mode:design","difficulty:hard","caching","global-distribution"],
    },
    {
      question: "Design Dropbox file synchronization.",
      idealAnswer: "Discuss file chunking, delta sync, conflict resolution, versioning, metadata storage, synchronization protocols, offline support, and distributed storage architecture.",
      concepts: ["subtopic:file-sync","mode:design","difficulty:hard","distributed-storage","synchronization"],
    },
    {
      question: "Design a video conferencing platform like Zoom.",
      idealAnswer: "Cover WebRTC, signaling servers, SFU vs MCU architectures, participant management, screen sharing, recording, bandwidth adaptation, and global scalability.",
      concepts: ["subtopic:video-conferencing","mode:design","difficulty:hard","webrtc","real-time"],
    },
    {
      question: "Design a search engine like Google Search.",
      idealAnswer: "Discuss crawling, indexing, inverted indexes, ranking systems, query serving, autocomplete, caching, distributed processing, and relevance optimization.",
      concepts: ["subtopic:search-engine","mode:design","difficulty:hard","information-retrieval","distributed-processing"],
    },
    {
      question: "Design an online advertising platform.",
      idealAnswer: "Discuss ad serving, targeting, auction systems, bidding strategies, click tracking, fraud prevention, analytics, and low-latency decision making.",
      concepts: ["subtopic:ad-platform","mode:design","difficulty:hard","real-time-bidding","analytics"],
    },
    {
      question: "Design a distributed locking service.",
      idealAnswer: "Discuss leader election, lock acquisition, expiration handling, failure recovery, fencing tokens, consensus systems like ZooKeeper, and avoiding split-brain scenarios.",
      concepts: ["subtopic:distributed-locking","mode:tradeoff","difficulty:hard","consensus","distributed-systems"],
    },
    {
      question: "Design a feature flag platform.",
      idealAnswer: "Cover flag storage, targeting rules, rollout percentages, experimentation support, low-latency evaluation, audit logs, and safe rollback mechanisms.",
      concepts: ["subtopic:feature-flags","mode:design","difficulty:medium","experimentation","deployment"],
    },
    {
      question: "Design Kubernetes from a high-level perspective.",
      idealAnswer: "Discuss control plane components, scheduler, API server, etcd, controllers, worker nodes, service discovery, autoscaling, and self-healing mechanisms.",
      concepts: ["subtopic:container-orchestration","mode:design","difficulty:hard","kubernetes","distributed-systems"],
    },
    {
      question: "Design an API Gateway.",
      idealAnswer: "Discuss request routing, authentication, rate limiting, load balancing, caching, observability, retries, and service aggregation in microservice architectures.",
      concepts: ["subtopic:api-gateway","mode:design","difficulty:medium","microservices","routing"],
    },
    {
      question: "Design a fraud detection system for online transactions.",
      idealAnswer: "Discuss rule engines, machine learning models, risk scoring, real-time event processing, feature stores, feedback loops, false positive handling, and explainability.",
      concepts: ["subtopic:fraud-detection","mode:design","difficulty:hard","machine-learning","real-time-processing"],
    },
    {
      question: "Design Twitter/X.",
      idealAnswer: "Discuss tweet creation, timeline generation, follower graph storage, fan-out on write vs fan-out on read, caching strategies, search indexing, trending topics, and horizontal scalability. Address celebrity users and hot partitions.",
      concepts: ["subtopic:twitter","mode:design","difficulty:hard","social-media","feed-generation"],
    },
    {
      question: "Design Instagram Stories.",
      idealAnswer: "Cover media uploads, storage, CDN delivery, story expiration after 24 hours, viewer tracking, ranking, caching, privacy controls, and scalability for millions of active users.",
      concepts: ["subtopic:stories","mode:design","difficulty:medium","media-storage","social-media"],
    },
    {
      question: "Design Google Docs collaborative editing.",
      idealAnswer: "Discuss real-time collaboration, Operational Transformation (OT) vs CRDTs, conflict resolution, document persistence, version history, offline editing, synchronization, and scalability.",
      concepts: ["subtopic:collaborative-editing","mode:tradeoff","difficulty:hard","real-time","consistency"],
    },
    {
      question: "Design LeetCode.",
      idealAnswer: "Discuss problem storage, code execution sandboxes, submission queues, test case evaluation, plagiarism detection, leaderboard generation, and secure code execution infrastructure.",
      concepts: ["subtopic:coding-platform","mode:design","difficulty:medium","sandboxing","distributed-processing"],
    },
    {
      question: "Design GitHub.",
      idealAnswer: "Cover repository storage, Git object management, pull requests, issue tracking, CI/CD integration, code search, permissions, and scaling large repositories.",
      concepts: ["subtopic:code-hosting","mode:design","difficulty:hard","version-control","developer-platform"],
    },
    {
      question: "Design Netflix's video delivery pipeline.",
      idealAnswer: "Discuss content ingestion, transcoding into multiple formats, metadata management, recommendation integration, CDN distribution, adaptive bitrate streaming, and monitoring.",
      concepts: ["subtopic:streaming-pipeline","mode:design","difficulty:hard","video-streaming","cdn"],
    },
    {
      question: "Design the backend for a multiplayer online game.",
      idealAnswer: "Discuss matchmaking, game state synchronization, low-latency networking, cheating prevention, session management, leaderboards, and regional scaling.",
      concepts: ["subtopic:multiplayer-gaming","mode:design","difficulty:hard","real-time","low-latency"],
    },
    {
      question: "Design a stock trading platform.",
      idealAnswer: "Cover order placement, matching engines, market data distribution, consistency guarantees, fault tolerance, auditing, risk management, and regulatory requirements.",
      concepts: ["subtopic:trading-platform","mode:design","difficulty:hard","financial-systems","low-latency"],
    },
    {
      question: "Design a distributed database.",
      idealAnswer: "Discuss partitioning, replication, consistency models, leader election, consensus protocols, failure recovery, transactions, and CAP theorem tradeoffs.",
      concepts: ["subtopic:distributed-database","mode:tradeoff","difficulty:hard","distributed-systems","consensus"],
    },
    {
      question: "Design Amazon's e-commerce platform.",
      idealAnswer: "Cover product catalog, search, inventory management, shopping carts, payments, order processing, recommendations, notifications, and large-scale microservice architecture.",
      concepts: ["subtopic:ecommerce-platform","mode:design","difficulty:hard","microservices","distributed-systems"],
    },
  ],
  behavioral: [
    {
      question: "Tell me about a time you disagreed with a technical decision and how you handled it.",
      idealAnswer: "STAR format: Situation — describe the technical decision and why you disagreed (be specific: 'We were choosing between microservices and a monolith for a 3-person team'). Task — your role and what was at stake. Action — how you raised the concern: gathered data, wrote a technical proposal, requested a design review, presented trade-offs without attacking the person. Result — what happened: either you changed minds with evidence, or you disagreed and committed once the decision was made. Key signals recruiters look for: you raised concerns through proper channels (not passive-aggressive), you used data not opinion, you respected the final decision, you can separate technical disagreement from personal conflict. Avoid: 'I was right and they were wrong' framing.",
      concepts: ["technical-disagreement","star-method","conflict-resolution","data-driven"],
    },
    {
      question: "Describe a project where you had to balance speed and quality under pressure.",
      idealAnswer: "Strong answer structure: (1) Set context — what was the deadline pressure and why it existed. (2) Describe the explicit trade-off decision — what quality shortcuts you took and why they were acceptable (e.g. 'skipped integration tests but kept unit tests, added TODO comments for tech debt'). (3) How you communicated the trade-offs to stakeholders. (4) What you did after the deadline to address the debt. Recruiters want to see: you can ship under pressure, you make conscious trade-offs (not accidental ones), you communicate risk, you don't leave debt unaddressed. Red flags: 'we just worked harder' (no trade-off thinking), 'we skipped all testing' (no quality awareness).",
      concepts: ["speed-vs-quality","tech-debt","stakeholder-communication","deadline-pressure"],
    },
    {
      question: "Tell me about the most complex technical problem you've solved. Walk me through your reasoning.",
      idealAnswer: "Structure: (1) Explain why it was complex — multiple interacting systems, unclear requirements, novel problem space, or scale challenges. (2) Walk through your debugging/investigation process — how you formed hypotheses, what data you gathered, how you narrowed the problem space. (3) The solution and why it worked. (4) What you learned. Recruiters are evaluating: systematic thinking (not random trial-and-error), ability to communicate technical complexity clearly, comfort with ambiguity, depth of understanding. Use concrete metrics: 'reduced p99 latency from 2s to 80ms', 'fixed a race condition that caused 0.1% of transactions to fail'. Avoid vague answers — specificity signals real experience.",
      concepts: ["problem-solving","debugging-process","systematic-thinking","technical-complexity"],
    },
    {
      question: "Tell me about a time you failed or made a mistake on a project. What did you do, and what did you learn?",
      idealAnswer: "STAR format: (1) Situation — describe a real mistake (e.g. 'I deployed a database migration that locked a table and caused a 10-minute outage'). (2) Task — what was your responsibility to fix it. (3) Action — immediate damage control (rollback, coordinate with team, communicate to clients), followed by a blameless post-mortem, identifying root cause, and setting up safeguards (e.g. testing migrations on prod-sized staging DB). (4) Result — the outcome and learning. Key signals: take full ownership (no blaming others), show constructive learning, and prove you implemented systemic prevention. Avoid: fake failures ('I worked too hard').",
      concepts: ["handling-failure","ownership","post-mortem","star-method"],
    },
    {
      question: "How do you handle a situation where a product requirement is ambiguous or incomplete, but you are expected to deliver quickly?",
      idealAnswer: "Approach: (1) Avoid building on assumptions, which leads to rework. (2) Identify the core ambiguity and draft 2-3 logical proposals with trade-offs. (3) Reach out immediately to the product manager/stakeholders with these concrete options instead of asking open-ended questions. (4) Recommend the option that aligns with the current MVP goals or minimizes future refactoring. (5) Document the agreed-upon requirements in writing. (6) Build with modularity so changes can be easily made if the scope changes. Key signals: proactive communication, structured proposals, adaptability under tight deadlines.",
      concepts: ["ambiguity","proactive-communication","stakeholder-alignment","scope-management"],
    },
    {
      question: "Tell me about a time you had to work with a difficult coworker or stakeholder. How did you handle the relationship?",
      idealAnswer: "STAR format: (1) Situation — a clash of work styles or communication breakdown (e.g. 'a senior reviewer who left harsh, vague comments on PRs'). (2) Task — need to resolve friction to deliver the project. (3) Action — set up a direct, 1-on-1 coffee chat. Sought first to understand their perspective and expectations. Discussed feedback styles in a neutral, non-accusatory way. Agreed on a clear structure for review comments (using conventional commits/labels). (4) Result — improved trust, faster review cycles, and a stronger team dynamic. Key signals: empathy, emotional intelligence, constructive communication, focus on project delivery over ego.",
      concepts: ["difficult-coworker","empathy","conflict-resolution","professionalism"],
    },
  ],
  dsa: [
    {
      question: "Given an array of integers, find the two numbers that sum to a target. What's the optimal approach?",
      idealAnswer: "Brute force: O(n^2) — check every pair. Better: O(n log n) — sort array, use two pointers. Optimal: O(n) time, O(n) space — hash map. For each number x, check if (target - x) exists in the map. Key insight: trading space for time. Edge cases: duplicates like [3,3] with target 6, negative numbers, empty array. If array is sorted, two-pointer is O(n) time O(1) space.",
      concepts: ["subtopic:two-sum","mode:optimization","difficulty:easy","hashmap","two-pointers"],
    },
    {
      question: "Walk me through how you'd implement an LRU cache.",
      idealAnswer: "LRU evicts the least recently accessed item when capacity is reached. Data structures: HashMap (O(1) lookup) + Doubly Linked List (O(1) insertion/deletion). List maintains access order — most recent at head, least recent at tail. Get: move node to head, return value. Put: create at head, remove tail if over capacity. Both O(1). Use sentinel head/tail nodes to simplify edge cases.",
      concepts: ["subtopic:lru-cache","mode:design","difficulty:medium","hashmap","linked-list"],
    },
    {
      question: "Explain the time and space complexity of merge sort versus quicksort.",
      idealAnswer: "Merge sort: O(n log n) always, O(n) space, stable. Quicksort: O(n log n) average, O(n^2) worst case, O(log n) space, not stable. Quicksort faster in practice due to cache locality. Worst case avoided with random pivot or introsort. Choose merge sort for linked lists or when stability matters.",
      concepts: ["subtopic:sorting-comparison","mode:tradeoff","difficulty:easy","merge-sort","quicksort"],
    },
    {
      question: "How would you detect a cycle in a linked list?",
      idealAnswer: "Floyd's cycle detection: slow pointer moves 1 step, fast moves 2. If they meet, cycle exists. O(n) time, O(1) space. To find cycle start: reset slow to head, both move 1 step until they meet. Alternative: hash set O(n) time/space, simpler but uses memory.",
      concepts: ["subtopic:linked-list-cycle","mode:implementation","difficulty:medium","linked-list","two-pointers"],
    },
    {
      question: "Explain the difference between BFS and DFS and when you'd choose each.",
      idealAnswer: "BFS: level-by-level using a queue, finds shortest path in unweighted graphs, O(V+E) time/space. DFS: depth-first using stack/recursion, O(V+E) time, O(V) space. Use BFS for shortest path, level-order traversal. Use DFS for cycle detection, topological sort, all paths. BFS uses more memory for wide graphs; DFS for deep graphs.",
      concepts: ["subtopic:graph-traversal","mode:tradeoff","difficulty:easy","bfs","dfs","graphs"],
    },
    {
      question: "How would you find the kth largest element in an unsorted array efficiently?",
      idealAnswer: "Options: (1) Sort O(n log n). (2) Min-heap of size k: O(n log k), O(k) space — best for streaming. (3) Quickselect: O(n) average, O(1) space — best for in-memory. Quickselect partitions like quicksort but only recurses on the side containing kth element. Mention heap for streaming data where you cannot store all elements.",
      concepts: ["subtopic:order-statistics","mode:optimization","difficulty:medium","heap","quickselect"],
    },
    {
      question: "Describe how a hash map handles collisions. What are the trade-offs between chaining and open addressing?",
      idealAnswer: "Chaining: each bucket holds a linked list. Simple, handles high load factors, but poor cache locality and extra pointer memory. Open addressing: probe for next empty slot. Better cache locality, no pointer overhead, but degrades above 70% load factor and deletion needs tombstones. Java HashMap uses chaining with tree conversion at 8+ entries. Python dict uses open addressing.",
      concepts: ["subtopic:hashmap-internals","mode:tradeoff","difficulty:medium","hashmap","collision-handling"],
    },
    {
      question: "How would you find the longest common subsequence of two strings?",
      idealAnswer: "DP: if s1[i]==s2[j], dp[i][j]=dp[i-1][j-1]+1, else max(dp[i-1][j], dp[i][j-1]). O(mn) time/space, optimizable to O(min(m,n)) space. Trace back to reconstruct. LCS allows gaps — different from longest common substring (contiguous). Applications: git diff, DNA alignment.",
      concepts: ["subtopic:string-dp","mode:implementation","difficulty:hard","dp","lcs"],
    },
    {
      question: "How would you implement a sliding window to find the maximum sum subarray of size k?",
      idealAnswer: "Naive: O(nk) — recompute sum for each window. Sliding window: O(n) — maintain running sum, add new element, subtract element leaving window. Pattern applies broadly: fixed-size windows for averages/sums, variable-size for conditions like 'longest substring without repeating characters'. Key insight: avoid recomputation by maintaining state across iterations.",
      concepts: ["subtopic:sliding-window","mode:optimization","difficulty:easy","arrays","window-technique"],
    },
    {
      question: "Explain how you'd find all permutations of a string. What's the time complexity?",
      idealAnswer: "Backtracking: at each position, try each unused character, recurse, then undo. O(n * n!) time — n! permutations, each takes O(n) to build. O(n) space for recursion stack. For duplicates: sort first, skip duplicate characters at same recursion level. This pattern (choose, explore, unchoose) applies to all combinatorial problems: subsets, combinations, N-queens.",
      concepts: ["subtopic:backtracking","mode:implementation","difficulty:medium","recursion","permutations"],
    },
    {
      question: "How would you find the shortest path in a weighted graph?",
      idealAnswer: "Dijkstra's algorithm: O((V+E) log V) with a min-heap. Works for non-negative weights. Process: start with source distance=0, all others infinity. Greedily pick the unvisited node with smallest distance, relax its neighbors. For negative weights: Bellman-Ford O(VE), detects negative cycles. For dense graphs: Floyd-Warshall O(V^3) for all-pairs shortest paths. A* adds a heuristic for faster pathfinding when you have a goal.",
      concepts: ["subtopic:shortest-path","mode:implementation","difficulty:hard","graphs","dijkstra","heap"],
    },
    {
      question: "Describe the coin change problem and its optimal solution.",
      idealAnswer: "Given coins and a target amount, find minimum coins needed. Greedy fails for arbitrary denominations (e.g. coins=[1,3,4], target=6: greedy gives 4+1+1=3 coins, optimal is 3+3=2). DP solution: dp[i] = min coins for amount i. For each amount, try each coin: dp[i] = min(dp[i], dp[i-coin]+1). O(amount * coins) time, O(amount) space. This is the canonical unbounded knapsack pattern.",
      concepts: ["subtopic:coin-change-dp","mode:optimization","difficulty:medium","dp","greedy-vs-dp"],
    },
    {
      question: "How would you search for an element in a rotated sorted array?",
      idealAnswer: "Modified binary search. One half is always sorted. Check whether target lies in the sorted half and discard the other half. Continue until found. Time O(log n), space O(1). Edge cases include duplicates which can degrade performance.",
      concepts: ["subtopic:binary-search","mode:optimization","difficulty:medium","rotated-array","divide-and-conquer"],
    },
    {
      question: "Explain how you'd merge k sorted linked lists efficiently.",
      idealAnswer: "Use a min heap containing the head of each list. Repeatedly extract the smallest node and insert its next node into the heap. Complexity O(N log k), where N is total nodes and k is number of lists. Divide-and-conquer merging is another valid approach.",
      concepts: ["subtopic:heap","mode:implementation","difficulty:hard","priority-queue","linked-list"],
    },
    {
      question: "How would you serialize and deserialize a binary tree?",
      idealAnswer: "Use preorder traversal and include null markers. During serialization, record node values and nulls. During deserialization, recursively rebuild the tree using the traversal sequence. Complexity O(n) time and space.",
      concepts: ["subtopic:trees","mode:design","difficulty:medium","serialization","dfs"],
    },
    {
      question: "Find the lowest common ancestor of two nodes in a binary tree.",
      idealAnswer: "Recursively search left and right subtrees. If both sides return non-null, current node is the LCA. If only one side returns non-null, propagate that value upward. Complexity O(n) time.",
      concepts: ["subtopic:trees","mode:implementation","difficulty:medium","lca","recursion"],
    },
    {
      question: "How would you detect whether a graph contains a cycle?",
      idealAnswer: "For undirected graphs, use DFS with parent tracking or Union-Find. For directed graphs, use DFS with recursion stack tracking or Kahn's algorithm. Complexity O(V+E).",
      concepts: ["subtopic:graphs","mode:implementation","difficulty:medium","cycle-detection","dfs"],
    },
    {
      question: "Describe how Union-Find works and where you'd use it.",
      idealAnswer: "Union-Find maintains disjoint sets using parent pointers. Path compression and union by rank make operations nearly O(1). Common use cases include cycle detection, connected components, and Kruskal's MST.",
      concepts: ["subtopic:union-find","mode:design","difficulty:medium","disjoint-set","graphs"],
    },
    {
      question: "How would you find the median of a stream of numbers?",
      idealAnswer: "Maintain two heaps: max heap for lower half and min heap for upper half. Rebalance after each insertion. Median comes from heap tops. Insertions O(log n), median retrieval O(1).",
      concepts: ["subtopic:heap","mode:design","difficulty:hard","stream-processing","median"],
    },
    {
      question: "Explain Kadane's algorithm and why it works.",
      idealAnswer: "Track the maximum subarray ending at each index. If the running sum becomes negative, restart from the current element. Maintain a global maximum. Complexity O(n) time and O(1) space.",
      concepts: ["subtopic:arrays","mode:optimization","difficulty:medium","kadane","dynamic-programming"],
    },
    {
      question: "How would you clone a graph?",
      idealAnswer: "Use DFS or BFS with a hash map mapping original nodes to cloned nodes. Create copies lazily and reuse them when revisiting nodes. Complexity O(V+E).",
      concepts: ["subtopic:graphs","mode:implementation","difficulty:medium","graph-copy","bfs"],
    },
    {
      question: "Explain how topological sorting works and when it is applicable.",
      idealAnswer: "Topological sorting applies only to DAGs. Kahn's algorithm repeatedly removes nodes with indegree zero. DFS postorder is another approach. Common use cases include task scheduling and dependency resolution.",
      concepts: ["subtopic:graphs","mode:tradeoff","difficulty:medium","topological-sort","dag"],
    },
    {
      question: "How would you find the maximum path sum in a binary tree?",
      idealAnswer: "Use DFS. For each node compute the maximum gain from left and right subtrees. Ignore negative contributions. Update a global maximum with leftGain + node.val + rightGain. Return node.val + max(leftGain, rightGain). Complexity O(n).",
      concepts: ["subtopic:trees","mode:optimization","difficulty:hard","dfs","path-sum"],
    },
    {
      question: "How would you determine if one binary tree is a subtree of another?",
      idealAnswer: "Traverse the main tree and compare structures whenever node values match. Use recursive tree comparison. Alternative solutions include serialization and string matching. Complexity O(m*n) worst case.",
      concepts: ["subtopic:trees","mode:implementation","difficulty:medium","subtree","recursion"],
    },
    {
      question: "Explain the difference between BFS and Dijkstra's algorithm.",
      idealAnswer: "BFS finds shortest paths only in unweighted graphs. Dijkstra handles weighted graphs with non-negative weights using a priority queue. BFS is O(V+E), Dijkstra is O((V+E) log V).",
      concepts: ["subtopic:graphs","mode:tradeoff","difficulty:medium","shortest-path","priority-queue"],
    },
    {
      question: "How would you implement an autocomplete system efficiently?",
      idealAnswer: "Use a Trie. Each node represents a character and stores children pointers. Traverse prefix characters and collect completions from descendants. Search complexity depends on prefix length. Additional ranking can be maintained separately.",
      concepts: ["subtopic:trie","mode:design","difficulty:medium","autocomplete","prefix-search"],
    },
    {
      question: "How would you solve the Word Break problem?",
      idealAnswer: "Use dynamic programming. Let dp[i] indicate whether substring[0:i] can be segmented. Check all previous valid positions and dictionary matches. Complexity O(n²) with efficient dictionary lookups.",
      concepts: ["subtopic:dynamic-programming","mode:implementation","difficulty:medium","word-break","dp"],
    },
    {
      question: "How would you find the longest increasing subsequence?",
      idealAnswer: "Classic DP gives O(n²). Optimal solution uses a tails array and binary search. Maintain smallest tail for each subsequence length. Complexity O(n log n).",
      concepts: ["subtopic:dynamic-programming","mode:optimization","difficulty:hard","lis","binary-search"],
    },
    {
      question: "How would you design a data structure supporting insert, delete, and getRandom in O(1)?",
      idealAnswer: "Combine an array with a hash map. Store element positions in the map. For deletion swap target with last element before removal and update indices. All operations become O(1) average.",
      concepts: ["subtopic:hashing","mode:design","difficulty:medium","randomized-set","array"],
    },
    {
      question: "Explain how Kruskal's algorithm works.",
      idealAnswer: "Sort edges by weight. Iterate through edges and add them if they don't create a cycle using Union-Find. Continue until MST is complete. Complexity O(E log E).",
      concepts: ["subtopic:graphs","mode:implementation","difficulty:medium","mst","union-find"],
    },
    {
      question: "How would you solve the Trapping Rain Water problem?",
      idealAnswer: "Use two pointers tracking leftMax and rightMax. Water trapped depends on the smaller boundary. Move the pointer with the smaller max. Complexity O(n) time and O(1) space.",
      concepts: ["subtopic:two-pointers","mode:optimization","difficulty:hard","trapping-rain-water","arrays"],
    },
    {
      question: "How would you schedule meetings to maximize the number attended?",
      idealAnswer: "Greedy strategy. Sort meetings by end time and always pick the earliest finishing compatible meeting. This leaves maximum room for future meetings. Complexity O(n log n).",
      concepts: ["subtopic:greedy","mode:tradeoff","difficulty:medium","interval-scheduling","sorting"],
    },
    {
      question: "How would you find the largest rectangle in a histogram?",
      idealAnswer: "Use a monotonic increasing stack. When a smaller height is encountered, repeatedly pop taller bars and calculate area using the current index and previous smaller element. Complexity O(n) time and O(n) space.",
      concepts: ["subtopic:monotonic-stack","mode:optimization","difficulty:hard","histogram","stack"],
    },
    {
      question: "How would you solve the Daily Temperatures problem efficiently?",
      idealAnswer: "Use a monotonic decreasing stack storing indices. While the current temperature is higher than the temperature at the stack top, pop and compute the waiting days. Complexity O(n).",
      concepts: ["subtopic:monotonic-stack","mode:implementation","difficulty:medium","daily-temperatures","stack"],
    },
    {
      question: "How would you find the first bad version among millions of versions?",
      idealAnswer: "Apply binary search on the answer space. At each step check whether the version is bad. Discard half the search space. Complexity O(log n).",
      concepts: ["subtopic:binary-search","mode:optimization","difficulty:easy","binary-search-answer","search-space"],
    },
    {
      question: "Explain how you'd solve the Koko Eating Bananas problem.",
      idealAnswer: "Binary search over the eating speed. For each candidate speed calculate total hours required. If it fits within the deadline, try smaller speeds; otherwise increase speed. Complexity O(n log m).",
      concepts: ["subtopic:binary-search","mode:optimization","difficulty:medium","search-on-answer","optimization"],
    },
    {
      question: "How would you determine the number of connected components in a graph?",
      idealAnswer: "Traverse the graph using DFS or BFS. Each new traversal started from an unvisited node represents a new connected component. Complexity O(V+E).",
      concepts: ["subtopic:graphs","mode:implementation","difficulty:medium","connected-components","dfs"],
    },
    {
      question: "How would you solve the Number of Islands problem?",
      idealAnswer: "Treat each land cell as a graph node. Run DFS or BFS from every unvisited land cell and mark connected land. Each traversal represents one island. Complexity O(m*n).",
      concepts: ["subtopic:graphs","mode:implementation","difficulty:medium","number-of-islands","grid-traversal"],
    },
    {
      question: "How would you solve the Course Schedule problem?",
      idealAnswer: "Model courses as a directed graph. Detect cycles using DFS recursion stack or Kahn's algorithm. If a cycle exists, courses cannot be completed. Complexity O(V+E).",
      concepts: ["subtopic:graphs","mode:tradeoff","difficulty:medium","course-schedule","topological-sort"],
    },
    {
      question: "How would you generate all subsets of a set?",
      idealAnswer: "Use backtracking. At each element choose whether to include it or not. The recursion tree explores all combinations. Complexity O(2^n).",
      concepts: ["subtopic:backtracking","mode:implementation","difficulty:medium","subsets","recursion"],
    },
    {
      question: "How would you solve the N-Queens problem?",
      idealAnswer: "Use backtracking while tracking occupied columns and diagonals. Place queens row by row and prune invalid placements early. Complexity grows exponentially but pruning is highly effective.",
      concepts: ["subtopic:backtracking","mode:optimization","difficulty:hard","n-queens","constraint-satisfaction"],
    },
    {
      question: "How would you design a rate limiter?",
      idealAnswer: "Common approaches include Token Bucket, Leaky Bucket, Fixed Window, and Sliding Window. Tradeoffs involve burst handling, fairness, memory usage, and distributed consistency.",
      concepts: ["subtopic:design-dsa","mode:design","difficulty:hard","rate-limiter","system-thinking"],
    },
  ],
  devops: [
    {
      question: "Walk me through your ideal CI/CD pipeline for a microservices architecture.",
      idealAnswer: "Stages: (1) Source — PR triggers pipeline. (2) Build — Docker image built, tagged with git SHA. (3) Test — unit tests, integration tests against test DB, contract tests between services. (4) Security scan — SAST (Semgrep), dependency vulnerability scan (Snyk), container image scan (Trivy). (5) Push — image pushed to registry (ECR/GCR) only if all tests pass. (6) Deploy to staging — Helm chart update, Kubernetes rolling deployment. (7) Smoke tests — automated tests against staging. (8) Deploy to production — blue-green or canary deployment. (9) Monitoring — automated rollback if error rate spikes. Key principles: fail fast (tests run in parallel), immutable artifacts (same image promoted through environments), GitOps (deployment state in Git). Each microservice has its own pipeline but shares common templates.",
      concepts: ["cicd-pipeline","docker-build","gitops","immutable-artifacts"],
    },
    {
      question: "Explain the difference between blue-green and canary deployments.",
      idealAnswer: "Blue-green: maintain two identical production environments (blue = current, green = new). Deploy to green, run tests, then switch traffic 100% from blue to green via load balancer. Rollback is instant — switch back to blue. Downside: requires 2x infrastructure cost, database migrations must be backward compatible. Best for: stateless services, when you need instant rollback. Canary: gradually shift traffic to new version — start with 1%, monitor error rates and latency, increase to 10%, 50%, 100%. Rollback by routing traffic back. Downside: slower rollout, need feature flags for database changes, monitoring must be robust. Best for: high-traffic services where you want to validate with real traffic before full rollout. Canary is more sophisticated but catches issues that staging misses.",
      concepts: ["blue-green","canary-deployment","traffic-shifting","rollback-strategy"],
    },
    {
      question: "How would you design a backup and disaster recovery strategy for a database with 1TB of data?",
      idealAnswer: "Backup strategy: (1) Automated daily full snapshots, stored in a separate region (e.g. AWS S3 with cross-region replication). (2) Continuous Write-Ahead Log (WAL) archiving / Point-in-Time Recovery (PITR) to allow restoring to any second. (3) Retain backups based on compliance (e.g. 30 days). Disaster Recovery: Define RTO (Recovery Time Objective - how fast to restore) and RPO (Recovery Point Objective - how much data loss is acceptable). For high availability: set up a multi-region active-passive replica. Run automated recovery drills to test restoring backups regularly. Verify backup integrity by running automated sanity checks on restored snapshots in a staging environment.",
      concepts: ["disaster-recovery","database-backup","rto-rpo","point-in-time-recovery"],
    },
    {
      question: "What is Infrastructure as Code (IaC) and what are the benefits of using tools like Terraform or CloudFormation?",
      idealAnswer: "IaC is the practice of managing and provisioning infrastructure through machine-readable definition files rather than manual configuration. Benefits: (1) Consistency — eliminates configuration drift across dev/staging/prod. (2) Version control — infrastructure code is versioned in Git, enabling PR reviews, audit trails, and easy rollbacks. (3) Speed & Automation — spin up entire environments in minutes. (4) Documentation — the code acts as documentation of current infrastructure state. Terraform uses a declarative syntax and maintains a state file to track resources, allowing it to calculate the delta (plan) before applying changes.",
      concepts: ["infrastructure-as-code","terraform","configuration-drift","declarative-syntax"],
    },
    {
      question: "How does containerization (e.g., Docker) solve the 'it works on my machine' problem, and how does it differ from virtual machines?",
      idealAnswer: "Docker containerizes the application and all its dependencies (libraries, runtime, system tools) into an immutable image. Running this image creates a container that behaves identically on local machines, staging, and production. Difference from VMs: (1) Hypervisor vs Container Engine: VMs run on a hypervisor and require a full Guest OS per VM. Containers share the host OS kernel and isolate processes via namespaces and cgroups. (2) Overhead & Startup: VMs are heavy, require gigabytes of storage, and take minutes to boot. Containers are lightweight (megabytes), use fewer resources, and start in seconds. (3) Density: You can run many more containers than VMs on the same hardware.",
      concepts: ["containerization","docker-vs-vm","process-isolation","immutable-infrastructure"],
    },
    {
      question: "What is GitOps and how does it differ from traditional CI/CD push-based deployment pipelines?",
      idealAnswer: "GitOps is an operational framework where Git is the single source of truth for declarative infrastructure and applications. Deployment process is pull-based rather than push-based. Traditional CD: CI/CD runner runs scripts (e.g. helm upgrade or kubectl apply) to push changes to the cluster. Requires cluster access credentials stored in CI/CD variables (security risk). GitOps: An agent (like ArgoCD or Flux) runs inside the Kubernetes cluster. It continuously monitors the Git repository containing environment manifests. If it detects a difference between Git and the cluster state, it pulls the changes and reconciles the cluster automatically. Pros: secure (no credentials in CI/CD), auto-healing (drift correction), clean rollbacks via git revert.",
      concepts: ["gitops","pull-based-deployment","drift-detection","kubernetes-security"],
    },
  ],
  technical_screening: [
    {
      question: "What's the difference between a process and a thread? When would you use each?",
      idealAnswer: "Process: independent execution unit with its own memory space, file descriptors, and resources. Threads: lightweight execution units within a process that share memory and resources. Key differences: (1) Memory isolation — processes are isolated (crash doesn't affect others), threads share memory (one thread can corrupt another's data). (2) Communication — inter-process communication (IPC) is expensive (pipes, sockets, shared memory); threads communicate via shared memory (fast but requires synchronization). (3) Creation cost — processes are expensive to create (fork), threads are cheap. Use processes when: isolation is critical (browser tabs, microservices), running untrusted code, CPU-bound work in Python (bypasses GIL). Use threads when: I/O-bound work (waiting for network/disk), shared state is needed, low overhead is important. Node.js uses a single thread with async I/O — worker_threads for CPU-bound work.",
      concepts: ["process-vs-thread","memory-isolation","ipc","concurrency"],
    },
    {
      question: "Explain eventual consistency and give a real-world example.",
      idealAnswer: "Eventual consistency: in a distributed system, if no new updates are made to a piece of data, all replicas will eventually converge to the same value. There's no guarantee of when, but it will happen. Real-world example: DNS propagation — when you update a DNS record, different DNS servers around the world may return different IP addresses for hours until all caches expire and propagate. Another example: Amazon shopping cart — if you add an item on your phone and your laptop simultaneously, both additions will eventually appear even if one was temporarily invisible. Trade-off: eventual consistency enables higher availability and lower latency (you can read from the nearest replica without waiting for global consensus). Strong consistency requires coordination (Paxos, Raft) which adds latency. Choose based on whether stale reads are acceptable for your use case.",
      concepts: ["eventual-consistency","dns-propagation","replica-convergence","stale-reads"],
    },
    {
      question: "Explain the CAP theorem and give an example of a system that prioritises each combination.",
      idealAnswer: "CAP theorem: in a distributed system, you can only guarantee 2 of 3: Consistency (all nodes see the same data), Availability (every request gets a response), Partition tolerance (system works despite network partitions). Since network partitions are unavoidable in distributed systems, the real choice is CP vs AP. CP (Consistency + Partition tolerance): during a partition, refuse requests rather than return stale data. Example: HBase, Zookeeper, traditional RDBMS with synchronous replication. Use when: financial transactions, inventory systems. AP (Availability + Partition tolerance): during a partition, return potentially stale data rather than error. Example: Cassandra, DynamoDB, CouchDB. Use when: social media feeds, shopping carts, DNS. CA (Consistency + Availability): only possible without partitions — single-node systems or systems that halt on partition. Important nuance: CAP is about worst-case behavior during partitions, not normal operation.",
      concepts: ["cap-theorem","consistency-availability","partition-tolerance","cp-vs-ap"],
    },
    {
      question: "What happens when you type a URL into your browser and press Enter? Walk through the network stack.",
      idealAnswer: "DNS lookup to resolve IP address (browser cache -> OS cache -> router -> ISP -> Recursive Resolver -> Root -> TLD -> Authoritative name servers). Establish TCP connection via 3-way handshake (SYN, SYN-ACK, ACK). For HTTPS, perform TLS handshake to negotiate keys. Browser sends HTTP GET request. Web server processes request (reverse proxy -> application server -> DB) and returns HTTP response (e.g. 200 OK). Browser parses HTML, constructs DOM, fetches subresources (CSS, JS, images), runs JS, and renders the page (Reflow/Repaint).",
      concepts: ["network-stack","dns-lookup","tcp-handshake","browser-rendering"],
    },
    {
      question: "How do database indexes speed up queries, and what is the trade-off of creating too many indexes?",
      idealAnswer: "Indexes act like a book index, pointing directly to row locations. B-trees (standard) keep data sorted and allow O(log N) searches instead of O(N) table scans. Indexes speed up SELECT queries with WHERE, JOIN, and ORDER BY clauses. Trade-off: (1) Write performance overhead — every INSERT, UPDATE, and DELETE must also update the index, slowing writes. (2) Storage cost — indexes occupy memory and disk space, sometimes exceeding table size. (3) Query optimizer confusion — too many indexes can make the query planner choose suboptimal index paths. Rule of thumb: index columns used frequently in filters/joins, avoid indexing columns with low cardinality (like gender).",
      concepts: ["db-index","btree","query-optimization","write-overhead"],
    },
    {
      question: "What is CORS (Cross-Origin Resource Sharing), and how does the browser enforce it?",
      idealAnswer: "CORS is a browser security mechanism that blocks web pages from making requests to a different domain than the one that served the page, unless the server explicitly allows it. Enforced via HTTP headers. For non-simple requests (like POST with JSON or custom headers), the browser sends a preflight OPTIONS request first. The server must respond with access control headers (Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Access-Control-Allow-Credentials). If the origin matches, the browser sends the actual request. It is a browser-side restriction — the server still processes the request, but the browser blocks the response from being read by JS.",
      concepts: ["cors","preflight-options","browser-security","same-origin-policy"],
    },
    {
      question: "Explain the difference between JWT-based authentication and Session-based authentication. When would you use each?",
      idealAnswer: "Session-based: stateful. Server stores session in DB/Redis and sends session ID in cookie. On each request, server queries DB to validate session ID. Pros: easy revocation, secure by default. Cons: database lookup bottleneck, scales poorly horizontally without shared session store. JWT-based: stateless. Server issues signed token containing payload (user ID, expiration) and sends to client. Client sends it in Authorization header. Server validates signature locally without DB query. Pros: stateless, highly scalable, fits microservices. Cons: revocation is difficult (must use blacklist/short TTL), payload is readable, security risk if stored in localStorage (XSS) or cookies (CSRF).",
      concepts: ["jwt","session-auth","stateless-vs-stateful","auth-security"],
    },
    {
      question: "Walk me through one project you are most proud of.",
      idealAnswer: "Candidate should explain the problem, architecture, technical decisions, challenges faced, measurable impact, and lessons learned. Strong candidates focus on ownership, tradeoffs, and outcomes rather than features.",
      concepts: ["subtopic:project-deep-dive","mode:communication","difficulty:easy","ownership","storytelling"],
    },
    {
      question: "Describe a technical challenge you faced and how you solved it.",
      idealAnswer: "Strong answers demonstrate structured problem-solving, debugging methodology, tradeoff analysis, implementation details, and measurable results. Avoid vague storytelling.",
      concepts: ["subtopic:problem-solving","mode:behavioral","difficulty:easy","debugging","ownership"],
    },
    {
      question: "How would you improve the performance of a slow API?",
      idealAnswer: "Analyze bottlenecks using metrics and profiling. Consider database indexing, caching, connection pooling, reducing network overhead, batching queries, async processing, and horizontal scaling.",
      concepts: ["subtopic:performance","mode:optimization","difficulty:medium","backend","scalability"],
    },
    {
      question: "Explain a system you've built from scratch.",
      idealAnswer: "Candidate should discuss requirements, architecture, implementation, tradeoffs, deployment, monitoring, and future improvements. Ownership and technical depth are key signals.",
      concepts: ["subtopic:system-building","mode:communication","difficulty:medium","architecture","ownership"],
    },
    {
      question: "How do you debug production issues?",
      idealAnswer: "Discuss logs, metrics, traces, reproduction strategies, monitoring tools, rollback plans, root cause analysis, and incident communication.",
      concepts: ["subtopic:debugging","mode:implementation","difficulty:medium","production","observability"],
    },
    {
      question: "What happens when your database becomes the bottleneck?",
      idealAnswer: "Discuss indexing, query optimization, caching, read replicas, partitioning, sharding, connection pooling, and workload analysis.",
      concepts: ["subtopic:database-scaling","mode:tradeoff","difficulty:medium","performance","backend"],
    },
    {
      question: "Tell me about a mistake you made while building software.",
      idealAnswer: "Strong candidates admit mistakes, explain impact, discuss lessons learned, and show how processes improved afterward. Ownership matters more than perfection.",
      concepts: ["subtopic:failure-analysis","mode:behavioral","difficulty:easy","ownership","learning"],
    },
    {
      question: "How would you explain a complex technical concept to a non-technical stakeholder?",
      idealAnswer: "Use analogies, avoid jargon, focus on business impact, and verify understanding. Communication and simplification are key signals.",
      concepts: ["subtopic:communication","mode:behavioral","difficulty:easy","stakeholder-management","soft-skills"],
    },
    {
      question: "How do you decide whether to build or buy a solution?",
      idealAnswer: "Evaluate cost, maintenance burden, vendor lock-in, scalability, customization requirements, team expertise, and long-term business goals.",
      concepts: ["subtopic:tradeoffs","mode:decision-making","difficulty:medium","architecture","business-thinking"],
    },
    {
      question: "How do you stay updated with new technologies and decide when to adopt them?",
      idealAnswer: "Follow tech blogs, newsletters, and open-source releases. Evaluate technology adoption using a proof-of-concept (POC), assessing compatibility with current stack, team expertise, scalability, long-term support, and business value. Avoid adopting tech solely for its novelty.",
      concepts: ["subtopic:professional-growth","mode:decision-making","difficulty:easy","learning","tech-adoption"],
    },
  ],
  resume_deep_dive: [
    {
      question: "Walk me through the most technically challenging part of your most recent project.",
      idealAnswer: "Strong answer: pick a genuinely hard problem (not 'setting up the project'). Structure: (1) What made it hard — technical complexity, scale, ambiguity, or novel problem. (2) Your investigation process — how you broke down the problem, what you tried, what failed. (3) The solution — be specific about the technical approach. (4) The outcome — measurable impact. Recruiters want to see: depth of technical understanding, systematic problem-solving, ability to communicate complexity. Avoid: vague answers ('it was really complex'), solutions that are just 'I Googled it', or problems that aren't actually technical challenges. Prepare 2-3 specific examples from your resume that demonstrate different types of challenges (performance, architecture, debugging).",
      concepts: ["project-challenge","technical-depth","problem-investigation","measurable-impact"],
    },
    {
      question: "What's the biggest architectural decision you made in a recent project and why?",
      idealAnswer: "Frame as a trade-off decision: 'We chose X over Y because of constraints A, B, C.' Strong answers include: what alternatives you considered, what criteria you used to evaluate them (performance, cost, team expertise, operational complexity), what you would do differently with hindsight. Example structure: 'We chose a monolith over microservices for our MVP because our team was 3 engineers, we needed to move fast, and the operational overhead of microservices would have slowed us down. The trade-off was that we'd need to refactor later as we scaled, which we planned for by keeping clear module boundaries.' Recruiters evaluate: systems thinking, awareness of trade-offs, pragmatism vs. over-engineering, ability to make decisions under uncertainty.",
      concepts: ["architectural-decision","trade-off-analysis","monolith-vs-microservices","pragmatic-engineering"],
    },
  ],
};;

/**
 * Interview orchestration engine.
 *
 * Tracks topic, subtopic, difficulty, and cognitiveMode to ensure
 * genuine interview diversity — not just concept deduplication.
 *
 * Selection priority:
 *   1. Unasked question with new subtopic AND new cognitiveMode
 *   2. Unasked question with new subtopic (any mode)
 *   3. Unasked question with new cognitiveMode (any subtopic)
 *   4. Any unasked question
 *   5. Exhausted — pick least-overlap entry (no follow-up mutations)
 */
export function getNextQuestion(
  typeId: string,
  askedQuestions: Set<string>,
  coveredConcepts: Set<string>,
  questionNumber: number
): { question: string; concepts: string[] } {
  const pool = QUESTION_BANK[typeId] ?? QUESTION_BANK["technical_screening"];

  // Build coverage sets from concepts (concepts encode topic/subtopic/mode)
  const coveredSubtopics = new Set<string>();
  const coveredModes = new Set<string>();
  for (const c of coveredConcepts) {
    if (c.startsWith("subtopic:")) coveredSubtopics.add(c.slice(9));
    if (c.startsWith("mode:")) coveredModes.add(c.slice(5));
  }

  const unasked = pool.filter((e) => !askedQuestions.has(e.question));
  if (unasked.length === 0) {
    // All questions exhausted — return the least-recently-covered entry
    const sorted = [...pool].sort((a, b) => {
      const aOverlap = a.concepts.filter((c) => coveredConcepts.has(c)).length;
      const bOverlap = b.concepts.filter((c) => coveredConcepts.has(c)).length;
      return aOverlap - bOverlap;
    });
    const base = sorted[questionNumber % sorted.length];
    return { question: base.question, concepts: base.concepts };
  }

  const getSubtopic = (e: QuestionEntry) =>
    e.concepts.find((c) => c.startsWith("subtopic:"))?.slice(9) ?? "";
  const getMode = (e: QuestionEntry) =>
    e.concepts.find((c) => c.startsWith("mode:"))?.slice(5) ?? "";
  const getDifficulty = (e: QuestionEntry) =>
    e.concepts.find((c) => c.startsWith("difficulty:"))?.slice(11) ?? "medium";

  // Score each unasked question — higher = more diverse
  const scored = unasked.map((e) => {
    const subtopic = getSubtopic(e);
    const mode = getMode(e);
    const difficulty = getDifficulty(e);

    let score = 0;
    if (subtopic && !coveredSubtopics.has(subtopic)) score += 40; // new subtopic = highest value
    if (mode && !coveredModes.has(mode)) score += 25;             // new cognitive mode
    if (!e.concepts.some((c) => coveredConcepts.has(c))) score += 20; // no concept overlap

    // Difficulty progression: prefer medium early, hard later
    const targetDifficulty = questionNumber < 3 ? "easy"
      : questionNumber < 7 ? "medium"
        : "hard";
    if (difficulty === targetDifficulty) score += 10;

    return { entry: e, score };
  });

  // Pick highest-scoring question (stable sort preserves bank order for ties)
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].entry;
  return { question: best.question, concepts: best.concepts };
}

/** Get the ideal answer for a specific question string. */
export function getIdealAnswer(typeId: string, question: string): string | undefined {
  const pool = QUESTION_BANK[typeId] ?? QUESTION_BANK["technical_screening"];
  const entry = pool.find((e) => question.startsWith(e.question));
  return entry?.idealAnswer;
}


export const PRESSURE_PROMPTS: Record<PersonalityId, string[]> = {
  faang_engineer: [
    "That explanation is too high-level. Can you walk me through the implementation details?",
    "Why would that approach scale to 100 million users?",
    "What trade-off did you consider there?",
    "How would you handle the failure case?",
    "What's the time complexity of that solution?",
  ],
  startup_cto: [
    "How long would that actually take to ship?",
    "What's the simplest version of this you could build first?",
    "Have you actually done this in production?",
    "What would break first under load?",
  ],
  hiring_manager: [
    "Can you give me a specific example from your experience?",
    "How did the team respond to that decision?",
    "What would you do differently now?",
    "How did you measure the impact of that?",
  ],
  staff_engineer: [
    "That's a common answer. What's the non-obvious problem with that approach?",
    "I've seen that pattern fail. What are the edge cases?",
    "What would a more experienced engineer do differently here?",
    "You're describing the happy path. What about failure modes?",
  ],
  behavioral_recruiter: [
    "Can you be more specific about your personal contribution?",
    "What was the measurable outcome of that?",
    "How did you communicate that to stakeholders?",
    "What did you learn from that experience?",
  ],
};

export function getPressurePrompt(
  personalityId: PersonalityId,
  score: number,
  seed: number
): string | null {
  // Only trigger pressure prompts for weak-to-moderate answers
  if (score >= 72) return null;
  const prompts = PRESSURE_PROMPTS[personalityId];
  return prompts[seed % prompts.length];
}
// Runs before any scoring. If this fails, scoring is skipped entirely.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/** Unique token ratio: low ratio = repetition spam */
function uniqueTokenRatio(text: string): number {
  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  return new Set(tokens).size / tokens.length;
}

/** Character entropy: low = keyboard smashing or repeated chars */
function charEntropy(text: string): number {
  const freq: Record<string, number> = {};
  for (const c of text.toLowerCase()) freq[c] = (freq[c] || 0) + 1;
  const len = text.length;
  return Object.values(freq).reduce((h, f) => {
    const p = f / len;
    return h - p * Math.log2(p);
  }, 0);
}

/** Ratio of real English dictionary-like words (â‰¥3 chars, only letters) */
function realWordRatio(text: string): number {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  const real = tokens.filter((t) => /^[a-zA-Z]{3,}$/.test(t));
  return real.length / tokens.length;
}

const PLACEHOLDER_PATTERNS = [
  /^(i\s*don'?t\s*know|idk|no\s*idea|not\s*sure|sorry|n\/a|none|skip|pass|test|hello|hi|ok|okay|yes|no|maybe)\.?$/i,
  /^[^a-zA-Z]*$/,                          // no letters at all
  /^(.)\1{4,}$/,                            // single char repeated: "aaaaaaa"
  /^(lol|lmao|haha|wtf|omg|bruh|lmfao)$/i,
];

const GIBBERISH_SEQUENCES = /[bcdfghjklmnpqrstvwxyz]{5,}/i; // 5+ consonants in a row

export function validateAnswer(answer: string): ValidationResult {
  const trimmed = answer.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // â”€â”€ Hard gate: too short â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (wordCount < 8) {
    return {
      valid: false,
      invalidReason:
        "Response is too short to evaluate. A real interview answer requires at least 2â€“3 complete sentences.",
      invalidCategory: "too_short",
    };
  }

  // â”€â”€ Hard gate: placeholder phrases â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        invalidReason:
          "Placeholder or non-answer detected. This response would immediately disqualify a candidate in a real screening round.",
        invalidCategory: "placeholder",
      };
    }
  }

  // â”€â”€ Hard gate: gibberish character sequences â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const entropy = charEntropy(trimmed);
  if (entropy < 2.8 && wordCount < 30) {
    return {
      valid: false,
      invalidReason:
        "Response contains insufficient linguistic structure. Keyboard smashing or random characters cannot be evaluated.",
      invalidCategory: "gibberish",
    };
  }

  if (GIBBERISH_SEQUENCES.test(trimmed) && realWordRatio(trimmed) < 0.4) {
    return {
      valid: false,
      invalidReason:
        "Response contains non-word character sequences. No meaningful technical content detected.",
      invalidCategory: "gibberish",
    };
  }

  // â”€â”€ Hard gate: extreme repetition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const utr = uniqueTokenRatio(trimmed);
  if (utr < 0.15 && wordCount > 10) {
    return {
      valid: false,
      invalidReason:
        "Response consists almost entirely of repeated tokens. Repetition spam cannot be evaluated as a technical answer.",
      invalidCategory: "repetition",
    };
  }

  // â”€â”€ Soft gate: very low real-word ratio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const rwr = realWordRatio(trimmed);
  if (rwr < 0.35) {
    return {
      valid: false,
      invalidReason:
        "Response has very low linguistic density. The majority of content is not recognisable English text.",
      invalidCategory: "low_density",
    };
  }

  return { valid: true };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LAYER 2 â€” SEMANTIC RELEVANCE SCORING
// Measures whether the answer actually addresses the question topic.
// Uses keyword concept matching as a proxy for embedding similarity.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/** Concept clusters per question domain. Each cluster is a set of related terms.
 *  Matching â‰¥1 term from a cluster counts as covering that concept. */
const CONCEPT_CLUSTERS: Record<string, string[][]> = {
  // System design concepts
  scalability: [["scale", "scaling", "horizontal", "vertical", "sharding"], ["load", "traffic", "throughput"], ["distributed", "microservice", "partition"]],
  caching: [["cache", "caching", "redis", "memcached"], ["ttl", "expiry", "invalidat"], ["hit", "miss", "evict"]],
  database: [["sql", "nosql", "postgres", "mysql", "mongo"], ["index", "query", "schema"], ["acid", "transaction", "consistency"]],
  api: [["rest", "graphql", "grpc", "endpoint"], ["request", "response", "http", "status"], ["auth", "token", "rate limit"]],
  consistency: [["eventual", "strong", "consistency"], ["replication", "sync", "async"], ["cap theorem", "partition", "availability"]],
  // Frontend concepts
  react: [["component", "hook", "state", "props"], ["render", "virtual dom", "reconcil"], ["effect", "memo", "callback", "ref"]],
  performance: [["lazy", "code split", "bundle", "minif"], ["lcp", "fcp", "cls", "ttfb", "core web"], ["cache", "cdn", "compress"]],
  typescript: [["type", "interface", "generic", "enum"], ["infer", "union", "intersection"], ["strict", "compile", "tsc"]],
  // Backend concepts
  nodejs: [["event loop", "non-blocking", "async", "await"], ["stream", "buffer", "cluster"], ["express", "fastapi", "nest"]],
  auth: [["jwt", "oauth", "session", "cookie"], ["token", "refresh", "expire"], ["bcrypt", "hash", "salt"]],
  // DSA concepts
  complexity: [["o(n", "o(log", "time complexity", "space complexity"], ["big o", "worst case", "average"], ["optimize", "efficient"]],
  trees: [["tree", "node", "leaf", "root", "bst"], ["traversal", "inorder", "preorder", "bfs", "dfs"], ["height", "depth", "balance"]],
  // Behavioral concepts
  conflict: [["disagree", "conflict", "tension", "pushback"], ["communic", "discuss", "align", "compromise"], ["outcome", "result", "resolved"]],
  ownership: [["own", "led", "drove", "responsible", "initiative"], ["impact", "result", "deliver"], ["team", "stakeholder", "cross-functional"]],
  // DevOps concepts
  cicd: [["pipeline", "ci", "cd", "deploy", "build"], ["test", "lint", "artifact", "stage"], ["github actions", "jenkins", "gitlab"]],
  containers: [["docker", "container", "image", "dockerfile"], ["kubernetes", "k8s", "pod", "service"], ["orchestrat", "scale", "replica"]],
};

/** Extract which concept clusters are present in the answer */
function matchConcepts(text: string, clusters: string[][]): number {
  const lower = text.toLowerCase();
  let matched = 0;
  for (const cluster of clusters) {
    if (cluster.some((term) => lower.includes(term))) matched++;
  }
  return matched / clusters.length; // 0â€“1
}

/** Infer relevant concept clusters from the question text */
function inferQuestionConcepts(question: string): string[][] {
  const q = question.toLowerCase();
  const clusters: string[][] = [];

  const domainMap: [RegExp, string][] = [
    [/scal|load balanc|traffic|throughput/, "scalability"],
    [/cach|redis|memcach|ttl/, "caching"],
    [/database|sql|nosql|postgres|mongo|index/, "database"],
    [/api|rest|graphql|endpoint|http/, "api"],
    [/consistent|eventual|cap theorem|replica/, "consistency"],
    [/react|hook|component|state|prop/, "react"],
    [/perform|lcp|fcp|bundle|lazy/, "performance"],
    [/typescript|type|interface|generic/, "typescript"],
    [/node\.?js|event loop|async|await/, "nodejs"],
    [/auth|jwt|oauth|session|token/, "auth"],
    [/complex|big.?o|time.?space|o\(n/, "complexity"],
    [/tree|bst|traversal|bfs|dfs/, "trees"],
    [/disagree|conflict|tension/, "conflict"],
    [/own|led|drove|initiative|responsible/, "ownership"],
    [/ci.?cd|pipeline|deploy|build/, "cicd"],
    [/docker|container|kubernetes|k8s/, "containers"],
  ];

  for (const [pattern, key] of domainMap) {
    if (pattern.test(q) && CONCEPT_CLUSTERS[key]) {
      clusters.push(...CONCEPT_CLUSTERS[key]);
    }
  }

  // Fallback: generic technical concepts
  if (clusters.length === 0) {
    clusters.push(
      ["explain", "describe", "how", "why", "what"],
      ["example", "instance", "case", "scenario"],
      ["because", "therefore", "result", "impact"]
    );
  }

  return clusters;
}

function computeRelevanceScore(answer: string, question: string): number {
  const clusters = inferQuestionConcepts(question);
  const coverage = matchConcepts(answer, clusters);

  // Also check if the answer contains any of the question's key nouns
  const questionWords = question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 4 && !/^(what|when|where|which|would|could|should|about|their|there|these|those|have|been|will|with|from|that|this|your|into|more|some|than|then|them|they|were|also|just|like|very|much|such|each|both|only|over|even|most|after|before|other|while|since|until|under|again|often|every|never|always|might|shall|does|did|has|had|was|are|for|the|and|but|not|you|all|can|her|his|him|its|our|out|who|get|may|now|any|how|new|use|two|way|day|man|men|old|see|him|his|how|its|let|put|say|she|too|use|was|way|who|why|yet)$/.test(w));

  const answerLower = answer.toLowerCase();
  const questionWordHits = questionWords.filter((w) => answerLower.includes(w)).length;
  const questionWordScore = Math.min(1, questionWordHits / Math.max(1, questionWords.length * 0.4));

  // Weighted combination: concept coverage 60%, question word overlap 40%
  const raw = coverage * 0.6 + questionWordScore * 0.4;
  return Math.round(raw * 100);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LAYER 3 â€” QUALITY SCORING
// Only runs if validation passes. Scores are capped by relevance.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export interface EvaluationResult {
  validation: ValidationResult;
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
  evaluationConfidence: "high" | "medium" | "low" | "invalid";
}

export function evaluateAnswer(answer: string, question = ""): EvaluationResult {
  // â”€â”€ Gate 1: validate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const validation = validateAnswer(answer);

  if (!validation.valid) {
    return {
      validation,
      scores: { technical: 0, communication: 0, relevance: 0, depth: 0, structure: 0 },
      overallPct: 0,
      evaluationState: "evaluation_aborted",
      passFail: "likely_rejected",
      passFailReason: "Response did not meet minimum evaluation threshold.",
      strengths: [],
      weaknesses: [],
      recruiterImpression:
        "This response contains insufficient meaningful content and would fail a real screening round.",
      bluffDetected: false,
      evaluationConfidence: "invalid",
    };
  }

  // â”€â”€ Gate 2: semantic relevance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const relevance = computeRelevanceScore(answer, question);

  // â”€â”€ Gate 3: quality signals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const hasExample = /for example|for instance|in my|i built|i worked|i implemented|we used|at \w+/i.test(answer);
  const hasMetrics = /\d+%|\d+x|\d+ (users|requests|ms|seconds|hours|days|months)/i.test(answer);
  const hasStructure = /first[,\s]|second[,\s]|third[,\s]|finally[,\s]|additionally|however|because|therefore|as a result/i.test(answer);
  const hasTechnical = /api|database|cache|async|await|component|function|class|algorithm|complexity|o\(n|distributed|microservice|container|deploy|pipeline|schema|index|query|hook|state|render|event loop|thread|process|memory|latency|throughput/i.test(answer);
  const hasDepth = /trade.?off|consider|approach|alternative|however|limitation|drawback|benefit|advantage|because|reason|therefore/i.test(answer);
  const hasConfidence = /i (would|use|prefer|recommend|chose|built|implemented|designed)/i.test(answer);

  // â”€â”€ Bluff detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const bluff = detectBluff(answer);

  // â”€â”€ Dimension scores â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let technical = 20;
  if (hasTechnical) technical += 30;
  if (hasDepth) technical += 15;
  if (hasExample) technical += 15;
  if (hasMetrics) technical += 10;
  if (wordCount >= 80 && hasTechnical) technical += 10;
  if (!hasTechnical && wordCount > 60) technical = Math.min(technical, 25);
  if (bluff.detected) technical = Math.min(technical, 45); // cap bluffers

  let communication = 25;
  if (hasStructure) communication += 25;
  if (hasExample) communication += 15;
  if (hasConfidence) communication += 10;
  if (wordCount >= 50 && wordCount <= 250) communication += 10;
  if (wordCount > 300) communication -= 10;

  let depth = 20;
  if (hasDepth) depth += 30;
  if (hasMetrics) depth += 20;
  if (hasExample) depth += 15;
  if (wordCount >= 100) depth += 10;
  if (bluff.detected) depth = Math.min(depth, 35);

  let structure = 30;
  if (hasStructure) structure += 40;
  if (hasExample) structure += 15;
  if (wordCount >= 40) structure += 10;

  technical = Math.min(95, Math.max(5, technical));
  communication = Math.min(95, Math.max(5, communication));
  depth = Math.min(95, Math.max(5, depth));
  structure = Math.min(95, Math.max(5, structure));

  // â”€â”€ Relevance cap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const relevanceCap = relevance < 20 ? 25
    : relevance < 35 ? 40
      : relevance < 50 ? 60
        : relevance < 65 ? 80
          : 100;

  technical = Math.min(technical, relevanceCap);
  communication = Math.min(communication, relevanceCap + 10);
  depth = Math.min(depth, relevanceCap);
  structure = Math.min(structure, relevanceCap + 15);

  // â”€â”€ Overall score â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const overallRaw =
    technical * 0.35 +
    communication * 0.20 +
    relevance * 0.25 +
    depth * 0.12 +
    structure * 0.08;

  const overallPct = Math.round(Math.min(95, Math.max(5, overallRaw)));

  // â”€â”€ Evaluation state & pass/fail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const evaluationState = deriveEvaluationState(overallPct, true);
  const { prediction: passFail, reason: passFailReason } = derivePassFail(overallPct, relevance, true);

  // â”€â”€ Varied feedback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const seed = answer.length + wordCount; // deterministic but varied per answer
  const feedback = generateVariedFeedback(
    { technical, relevance, depth, structure },
    hasTechnical, hasExample, hasDepth, hasStructure,
    bluff.detected, seed
  );

  // â”€â”€ Strengths â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const strengths: string[] = [];
  if (relevance >= 60) strengths.push("Directly addresses the question");
  if (hasExample) strengths.push("Grounded with a concrete example");
  if (hasMetrics) strengths.push("Quantified impact present");
  if (hasStructure) strengths.push("Structured, easy-to-follow reasoning");
  if (hasTechnical && wordCount > 40) strengths.push("Domain-specific vocabulary demonstrated");
  if (hasDepth) strengths.push("Trade-off awareness shown");
  if (hasConfidence) strengths.push("Confident first-person ownership");

  // â”€â”€ Weaknesses (varied, non-repetitive) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const weaknesses: string[] = [];
  if (relevance < 40) weaknesses.push("Does not clearly address the question asked");
  if (!hasTechnical) weaknesses.push("Lacks domain-specific technical vocabulary");
  if (!hasExample) weaknesses.push("No concrete implementation example provided");
  if (!hasDepth) weaknesses.push("No trade-off or constraint discussion");
  if (!hasStructure && wordCount > 50) weaknesses.push("Response lacks clear structural organisation");
  if (wordCount < 30) weaknesses.push("Too brief for a credible technical answer");
  if (wordCount > 300) weaknesses.push("Overly verbose â€” focus on the core answer first");
  if (bluff.detected) weaknesses.push("Advanced terminology used without supporting explanation");

  // â”€â”€ Recruiter impression â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let recruiterImpression: string;
  if (relevance < 25) {
    recruiterImpression = "The candidate did not meaningfully address the question. This answer would likely end the screening round.";
  } else if (overallPct >= 83) {
    recruiterImpression = "The explanation demonstrated production-level understanding. Recruiter would advance this candidate.";
  } else if (overallPct >= 70) {
    recruiterImpression = "Strong technical signal. Recruiter would likely proceed to the next stage.";
  } else if (overallPct >= 55) {
    recruiterImpression = "Adequate response. Recruiter would want a follow-up to confirm depth.";
  } else if (overallPct >= 38) {
    recruiterImpression = "The response remained too surface-level. Recruiter would probe further and likely mark as a concern.";
  } else {
    recruiterImpression = "The candidate failed to demonstrate understanding of this concept. Would not advance past this question.";
  }

  const evaluationConfidence: EvaluationResult["evaluationConfidence"] =
    relevance >= 50 && wordCount >= 40 ? "high"
      : relevance >= 30 && wordCount >= 20 ? "medium"
        : "low";

  return {
    validation,
    scores: { technical, communication, relevance, depth, structure },
    overallPct,
    evaluationState,
    passFail,
    passFailReason,
    strengths,
    weaknesses,
    recruiterImpression: feedback + " " + recruiterImpression,
    bluffDetected: bluff.detected,
    bluffNote: bluff.note,
    evaluationConfidence,
  };
}

// â”€â”€ Session analytics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function computeSessionAnalytics(turns: Turn[]): SessionAnalytics {
  // Only count valid turns for analytics
  const validTurns = turns.filter((t) => t.validation.valid);

  if (validTurns.length === 0) {
    return {
      avgScore: 0,
      strongestDomain: "—",
      weakestArea: "—",
      communicationTrend: "stable" as const,
      technicalDepth: 0,
      hiringReadiness: "Needs Work" as const,
      recurringWeaknesses: [],
      questionCount: 0,
      overallPassFail: "likely_rejected" as const,
      bluffCount: 0,
    };
  }

  const scores = validTurns.map((t) => t.overallPct);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const avgTech = Math.round(
    validTurns.reduce((a, t) => a + (t.scores.technical || 0), 0) / validTurns.length
  );
  const avgComm = Math.round(
    validTurns.reduce((a, t) => a + (t.scores.communication || 0), 0) / validTurns.length
  );

  const trend: SessionAnalytics["communicationTrend"] =
    scores.length >= 3
      ? scores[scores.length - 1] > scores[0]
        ? "improving"
        : scores[scores.length - 1] < scores[0]
          ? "declining"
          : "stable"
      : "stable";

  const weaknessCount: Record<string, number> = {};
  validTurns
    .flatMap((t) => t.weaknesses)
    .forEach((w) => {
      const key = w.split("â€”")[0].trim();
      weaknessCount[key] = (weaknessCount[key] || 0) + 1;
    });

  const recurringWeaknesses = Object.entries(weaknessCount)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  const hiringReadiness: SessionAnalytics["hiringReadiness"] =
    avgScore >= 72 ? "Strong" : avgScore >= 52 ? "Moderate" : "Needs Work";

  // Overall pass/fail from session average
  const overallPassFail: PassFailPrediction =
    avgScore >= 72 ? "likely_advanced"
      : avgScore >= 55 ? "strong_signal"
        : avgScore >= 38 ? "borderline"
          : "likely_rejected";

  const bluffCount = validTurns.filter((t) => t.bluffDetected).length;

  return {
    avgScore,
    strongestDomain: avgTech >= avgComm ? "Technical depth" : "Communication clarity",
    weakestArea: avgTech < avgComm ? "Technical depth" : "Communication clarity",
    communicationTrend: trend,
    technicalDepth: avgTech,
    hiringReadiness,
    recurringWeaknesses,
    questionCount: validTurns.length,
    overallPassFail,
    bluffCount,
  };
}
