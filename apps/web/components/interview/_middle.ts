
// ── Interview length presets ──────────────────────────────────────────────────────────────────────

export const INTERVIEW_LENGTHS = [
  { questions: 5,  label: "Quick Practice",    duration: "~10 mins",  intensity: "Light",     intensityColor: "text-emerald-400" },
  { questions: 10, label: "Standard Interview", duration: "~25 mins",  intensity: "Moderate",  intensityColor: "text-amber-400"   },
  { questions: 20, label: "Intensive Session",  duration: "~50 mins",  intensity: "Demanding", intensityColor: "text-orange-400"  },
  { questions: 40, label: "Marathon Mode",      duration: "~90+ mins", intensity: "Extreme",   intensityColor: "text-red-400"     },
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
      concepts: ["rate-limiting", "token-bucket", "redis-atomic", "sliding-window"],
    },
    {
      question: "How do you handle database migrations in a production environment with zero downtime?",
      idealAnswer: "Use expand-contract (also called parallel change) pattern. Phase 1 (expand): add new columns as nullable, deploy code that writes to both old and new columns. Phase 2 (migrate): backfill existing rows in batches during off-peak hours. Phase 3 (contract): once all rows are migrated and old column is unused, drop it in a separate deployment. Never rename columns directly — always add new, migrate, drop old. Use tools like Flyway or Liquibase for versioned migrations. For large tables, use pt-online-schema-change or gh-ost to avoid table locks.",
      concepts: ["db-migration", "expand-contract", "zero-downtime", "schema-change"],
    },
    {
      question: "Explain the trade-offs between SQL and NoSQL for a high-write, low-read workload.",
      idealAnswer: "For high-write, low-read: NoSQL (Cassandra, DynamoDB) often wins because they're optimised for write throughput via LSM trees — writes go to an in-memory memtable, then flush to SSTables, avoiding random disk I/O. SQL databases use B-trees which require random writes. However, SQL gives you ACID transactions, complex queries, and joins — critical if data consistency matters. Choose NoSQL when: writes vastly outnumber reads, data model is simple/document-like, horizontal scaling is needed. Choose SQL when: you need transactions, complex reporting, or strong consistency. Cassandra's eventual consistency is a real tradeoff — you may read stale data.",
      concepts: ["sql-vs-nosql", "lsm-tree", "acid", "write-throughput"],
    },
    {
      question: "How would you debug a memory leak in a Node.js service under production load?",
      idealAnswer: "First, confirm it's a leak: monitor heap usage over time with process.memoryUsage() or Prometheus metrics — a leak shows monotonically increasing heap that doesn't drop after GC. Then take heap snapshots using --inspect flag and Chrome DevTools or clinic.js. Compare two snapshots taken minutes apart — look for objects that grew in count (Detached DOM nodes, closures, event listeners, cached Maps/Sets). Common causes: event listeners not removed, global caches without TTL, closures holding references, streams not destroyed. Fix: use WeakMap/WeakRef for caches, always remove event listeners in cleanup, set max size on LRU caches. In production, use --max-old-space-size and restart on OOM as a safety net while investigating.",
      concepts: ["memory-leak", "heap-snapshot", "nodejs-gc", "weakmap"],
    },
    {
      question: "Describe how you'd implement idempotency in a payment processing API.",
      idealAnswer: "Accept an Idempotency-Key header (UUID) from the client. On first request: store the key + response in a database/Redis with a TTL (e.g. 24h). On duplicate request with same key: return the stored response without re-processing. The key insight is that the idempotency check and the payment operation must be atomic — use a database transaction or Redis SET NX (set if not exists) to prevent race conditions where two concurrent requests with the same key both pass the check. Return the same HTTP status and body as the original. This lets clients safely retry on network failures without double-charging.",
      concepts: ["idempotency", "idempotency-key", "redis-setnx", "payment-api"],
    },
    {
      question: "What's your approach to connection pooling and when does it become a bottleneck?",
      idealAnswer: "Connection pooling reuses database connections instead of creating new ones per request — connection creation is expensive (TCP handshake, auth, SSL). Configure pool size based on: (DB max_connections / number of app instances). A common mistake is setting pool size too high — if you have 10 instances each with pool=100, that's 1000 connections, which can overwhelm Postgres (default max 100). Use PgBouncer as a connection proxy for Postgres to multiplex thousands of app connections into a small pool. Bottleneck signs: pool exhaustion errors, high wait times in pool metrics. Monitor: pool utilisation, wait queue depth, connection acquisition time.",
      concepts: ["connection-pooling", "pgbouncer", "db-connections", "pool-exhaustion"],
    },
    {
      question: "How would you design a job queue system that guarantees at-least-once delivery?",
      idealAnswer: "Use a message broker (Redis with BullMQ, RabbitMQ, or SQS). Key design: (1) Producer writes job to queue atomically. (2) Consumer fetches job and sets a visibility timeout — job is hidden from other consumers but not deleted. (3) Consumer processes job and explicitly acknowledges (deletes) it on success. (4) If consumer crashes, visibility timeout expires and job reappears for retry. For idempotency, jobs must be idempotent since they may run multiple times. Store job state in DB to detect duplicates. Add dead-letter queue for jobs that fail N times. At-least-once is easier than exactly-once — exactly-once requires distributed transactions.",
      concepts: ["job-queue", "at-least-once", "visibility-timeout", "dead-letter-queue"],
    },
    {
      question: "Explain the difference between optimistic and pessimistic locking. When would you use each?",
      idealAnswer: "Pessimistic locking: lock the row when you read it (SELECT FOR UPDATE), preventing others from modifying it until you commit. Use when: conflicts are frequent, operations are short, you can't tolerate retries (e.g. inventory reservation). Downside: reduces throughput, risk of deadlocks. Optimistic locking: read without locking, include a version number in your UPDATE WHERE version=N. If another transaction modified the row, your update affects 0 rows — detect this and retry. Use when: conflicts are rare, reads vastly outnumber writes, you want higher throughput. Downside: retry logic complexity, poor performance under high contention. Most web apps should default to optimistic locking.",
      concepts: ["optimistic-locking", "pessimistic-locking", "select-for-update", "version-number"],
    },
  ],
  frontend: [
    {
      question: "Explain how React's reconciliation algorithm works and when it causes performance issues.",
      idealAnswer: "React's reconciler (Fiber) compares the new virtual DOM tree against the previous one using a diffing algorithm. Key heuristics: (1) Elements of different types produce entirely new trees. (2) Elements with the same type update in place. (3) Keys help identify which list items changed. Performance issues arise when: keys are array indices (causes unnecessary re-renders on reorder), large lists re-render entirely (use React.memo or virtualization), context value changes trigger all consumers (split contexts), or expensive computations run on every render (use useMemo). The reconciler works in two phases: render (pure, can be interrupted) and commit (DOM mutations, synchronous). Concurrent Mode allows React to interrupt renders for higher-priority updates.",
      concepts: ["react-reconciliation", "fiber", "virtual-dom", "react-keys"],
    },
    {
      question: "How do you approach code-splitting in a large Next.js application?",
      idealAnswer: "Next.js automatically code-splits by page — each page is its own bundle. Beyond that: use dynamic imports (next/dynamic) for heavy components that aren't needed on initial render (modals, charts, rich text editors). Use React.lazy + Suspense for client-side splits. Analyse bundle with @next/bundle-analyzer to find large dependencies. Common wins: replace moment.js with date-fns (tree-shakeable), lazy-load below-the-fold sections, split admin routes from public routes. For third-party scripts, use next/script with strategy='lazyOnload'. Key metric: reduce First Contentful Paint by ensuring the critical path bundle is under 100KB.",
      concepts: ["code-splitting", "dynamic-import", "nextjs-bundle", "lazy-loading"],
    },
    {
      question: "When would useMemo hurt performance instead of help it?",
      idealAnswer: "useMemo has overhead: it stores the previous value and runs a comparison on every render. It hurts when: (1) The computation is cheap — the comparison cost exceeds the computation cost. (2) Dependencies change on every render anyway — memoization never hits. (3) You're memoizing primitive values — React already handles these efficiently. (4) Overuse creates memory pressure from storing cached values. Use useMemo only when: the computation is genuinely expensive (>1ms), the result is used in a dependency array of another hook, or you're passing a stable reference to a memoized child. Profile first — don't add useMemo speculatively.",
      concepts: ["usememo", "react-memoization", "react-performance", "dependency-array"],
    },
    {
      question: "How would you improve the Core Web Vitals score of a slow-loading page?",
      idealAnswer: "LCP (Largest Contentful Paint): preload the hero image with <link rel='preload'>, use next/image for automatic WebP conversion and lazy loading, serve images from a CDN, eliminate render-blocking resources. FID/INP (Interaction to Next Paint): break up long tasks with scheduler.yield() or setTimeout, move heavy computation to Web Workers, reduce JavaScript bundle size. CLS (Cumulative Layout Shift): always specify width/height on images and iframes, avoid inserting content above existing content, use CSS aspect-ratio. General: enable HTTP/2, use resource hints (preconnect, dns-prefetch), implement service worker caching for repeat visits.",
      concepts: ["core-web-vitals", "lcp", "cls", "inp"],
    },
    {
      question: "Describe how you'd handle optimistic UI updates with rollback on failure.",
      idealAnswer: "Pattern: (1) Immediately update local state to reflect the expected server response. (2) Fire the API call in the background. (3) On success, optionally sync with server response. (4) On failure, revert local state to the previous value and show an error. Implementation with React Query: use onMutate to snapshot previous data and apply optimistic update, onError to rollback using the snapshot, onSettled to refetch. Key considerations: generate a temporary ID for new items, handle concurrent mutations (last-write-wins vs. conflict detection), show subtle loading indicators so users know the action is in-flight. Don't optimistically update destructive actions (deletes) without confirmation.",
      concepts: ["optimistic-ui", "react-query", "rollback", "mutation"],
    },
  ],
  system_design: [
    {
      question: "Design a URL shortener that handles 100 million requests per day.",
      idealAnswer: "Scale: 100M req/day = ~1,160 req/s average, ~5,000 req/s peak. Architecture: (1) ID generation: use base62 encoding of a counter from a distributed ID generator (Snowflake) or hash the URL and take first 7 chars with collision detection. (2) Storage: write short→long mapping to a database (Postgres or DynamoDB). (3) Caching: 80% of traffic hits 20% of URLs — cache hot URLs in Redis with LRU eviction. Cache hit rate should be >90%. (4) Read path: check Redis → if miss, query DB → return 301/302 redirect. (5) Write path: generate ID → store in DB → invalidate/warm cache. Scaling: read replicas for DB, Redis Cluster for cache, CDN for geographic distribution. Analytics: async event stream to Kafka → Spark for aggregation.",
      concepts: ["url-shortener", "base62", "snowflake-id", "redis-lru"],
    },
    {
      question: "How would you architect a real-time notification system for 10 million users?",
      idealAnswer: "Core challenge: maintaining 10M persistent connections. Architecture: (1) Use WebSockets or Server-Sent Events (SSE) — SSE is simpler for one-way notifications. (2) Connection layer: stateful WebSocket servers behind a load balancer. Use consistent hashing so a user's connection always routes to the same server. (3) Message routing: when event occurs, publish to Kafka. Notification service consumes Kafka, looks up which server holds the user's connection (stored in Redis), and pushes via internal pub/sub (Redis Pub/Sub or direct HTTP). (4) Offline users: store notifications in DB, deliver on reconnect. (5) Fan-out: for broadcast notifications, use Kafka consumer groups. Key tradeoffs: SSE vs WebSocket (SSE simpler, WebSocket bidirectional), push vs pull (push has lower latency, pull is simpler).",
      concepts: ["websocket", "sse", "fan-out", "kafka-pubsub"],
    },
    {
      question: "Walk me through designing a distributed cache with consistency guarantees.",
      idealAnswer: "Choose consistency model first: strong (all reads see latest write), eventual (reads may be stale), or read-your-writes. For strong consistency: use a single primary with synchronous replication — high consistency, lower availability. For eventual: use multi-primary with async replication — higher availability, possible stale reads. Implementation: consistent hashing to distribute keys across nodes, virtual nodes for even distribution. Replication factor of 3 (like Cassandra). For reads: quorum reads (R + W > N) give strong consistency. Cache invalidation strategies: TTL (simple, eventual), write-through (consistent, higher write latency), write-behind (async, risk of data loss). Handle node failures with gossip protocol for membership, hinted handoff for temporary failures.",
      concepts: ["distributed-cache", "consistent-hashing", "quorum-reads", "cache-invalidation"],
    },
    {
      question: "How would you architect a multi-tenant SaaS application with data isolation?",
      idealAnswer: "Three isolation models: (1) Separate databases per tenant — strongest isolation, highest cost, complex ops. Use for enterprise/compliance requirements. (2) Separate schemas per tenant in one database — good isolation, moderate cost, schema migrations are complex. (3) Shared schema with tenant_id column — lowest cost, highest density, risk of data leakage if queries miss tenant filter. For most SaaS: start with shared schema + Row Level Security (Postgres RLS) to enforce tenant isolation at DB level. Add tenant_id to every table, create RLS policies, set tenant context per connection. For large tenants, shard to dedicated databases. Use connection pooling per tenant to prevent noisy neighbor. Encrypt tenant data with per-tenant keys for compliance.",
      concepts: ["multi-tenancy", "row-level-security", "tenant-isolation", "saas-architecture"],
    },
  ],
  behavioral: [
    {
      question: "Tell me about a time you disagreed with a technical decision and how you handled it.",
      idealAnswer: "STAR format: Situation — describe the technical decision and why you disagreed (be specific: 'We were choosing between microservices and a monolith for a 3-person team'). Task — your role and what was at stake. Action — how you raised the concern: gathered data, wrote a technical proposal, requested a design review, presented trade-offs without attacking the person. Result — what happened: either you changed minds with evidence, or you disagreed and committed once the decision was made. Key signals recruiters look for: you raised concerns through proper channels (not passive-aggressive), you used data not opinion, you respected the final decision, you can separate technical disagreement from personal conflict. Avoid: 'I was right and they were wrong' framing.",
      concepts: ["technical-disagreement", "star-method", "conflict-resolution", "data-driven"],
    },
    {
      question: "Describe a project where you had to balance speed and quality under pressure.",
      idealAnswer: "Strong answer structure: (1) Set context — what was the deadline pressure and why it existed. (2) Describe the explicit trade-off decision — what quality shortcuts you took and why they were acceptable (e.g. 'skipped integration tests but kept unit tests, added TODO comments for tech debt'). (3) How you communicated the trade-offs to stakeholders. (4) What you did after the deadline to address the debt. Recruiters want to see: you can ship under pressure, you make conscious trade-offs (not accidental ones), you communicate risk, you don't leave debt unaddressed. Red flags: 'we just worked harder' (no trade-off thinking), 'we skipped all testing' (no quality awareness).",
      concepts: ["speed-vs-quality", "tech-debt", "stakeholder-communication", "deadline-pressure"],
    },
    {
      question: "Tell me about the most complex technical problem you've solved. Walk me through your reasoning.",
      idealAnswer: "Structure: (1) Explain why it was complex — multiple interacting systems, unclear requirements, novel problem space, or scale challenges. (2) Walk through your debugging/investigation process — how you formed hypotheses, what data you gathered, how you narrowed the problem space. (3) The solution and why it worked. (4) What you learned. Recruiters are evaluating: systematic thinking (not random trial-and-error), ability to communicate technical complexity clearly, comfort with ambiguity, depth of understanding. Use concrete metrics: 'reduced p99 latency from 2s to 80ms', 'fixed a race condition that caused 0.1% of transactions to fail'. Avoid vague answers — specificity signals real experience.",
      concepts: ["problem-solving", "debugging-process", "systematic-thinking", "technical-complexity"],
    },
  ],
  dsa: [
    {
      question: "Given an array of integers, find the two numbers that sum to a target. What's the optimal approach?",
      idealAnswer: "Brute force: O(n²) — check every pair. Better: O(n log n) — sort array, use two pointers from each end, move left pointer right if sum too small, right pointer left if too large. Optimal: O(n) time, O(n) space — use a hash map. For each number x, check if (target - x) exists in the map. If yes, return the pair. If no, add x to the map. Key insight: trading space for time. Edge cases: duplicate numbers (e.g. [3,3] with target 6 — need to handle same element used twice), negative numbers (algorithm handles naturally), empty array. Follow-up: if array is sorted, two-pointer is O(n) time O(1) space — better space complexity. Communication tip: always state the approach before coding, explain time/space complexity, mention edge cases.",
      concepts: ["two-sum", "hash-map-lookup", "array-traversal", "two-pointer"],
    },
    {
      question: "Walk me through how you'd implement an LRU cache.",
      idealAnswer: "LRU (Least Recently Used) cache evicts the least recently accessed item when capacity is reached. Data structures: HashMap (O(1) lookup) + Doubly Linked List (O(1) insertion/deletion). The list maintains access order — most recent at head, least recent at tail. Get: if key exists, move node to head, return value. O(1). Put: if key exists, update value and move to head. If new key: create node at head, add to map. If over capacity, remove tail node and delete from map. O(1). The key insight is that a doubly linked list allows O(1) removal of any node (you have the pointer), and the HashMap gives O(1) access to any node. Python has OrderedDict which implements this. Java has LinkedHashMap. Always mention the sentinel head/tail nodes to simplify edge cases.",
      concepts: ["lru-cache", "doubly-linked-list", "hash-map", "o1-operations"],
    },
    {
      question: "Explain the time and space complexity of merge sort versus quicksort.",
      idealAnswer: "Merge sort: O(n log n) time always (best, average, worst). O(n) space for the auxiliary array. Stable sort (preserves relative order of equal elements). Predictable performance — good for linked lists and external sorting (data doesn't fit in memory). Quicksort: O(n log n) average, O(n²) worst case (sorted array with naive pivot). O(log n) space (call stack). Not stable. In practice faster than merge sort due to better cache locality and lower constant factors. Worst case avoided with: random pivot selection, median-of-three pivot, or introsort (switches to heapsort when recursion depth exceeds threshold). Python's Timsort and Java's Arrays.sort use hybrid approaches. Key interview point: quicksort is faster in practice but merge sort has guaranteed O(n log n) — choose based on requirements.",
      concepts: ["merge-sort", "quicksort", "time-complexity", "space-complexity"],
    },
  ],
  devops: [
    {
      question: "Walk me through your ideal CI/CD pipeline for a microservices architecture.",
      idealAnswer: "Stages: (1) Source — PR triggers pipeline. (2) Build — Docker image built, tagged with git SHA. (3) Test — unit tests, integration tests against test DB, contract tests between services. (4) Security scan — SAST (Semgrep), dependency vulnerability scan (Snyk), container image scan (Trivy). (5) Push — image pushed to registry (ECR/GCR) only if all tests pass. (6) Deploy to staging — Helm chart update, Kubernetes rolling deployment. (7) Smoke tests — automated tests against staging. (8) Deploy to production — blue-green or canary deployment. (9) Monitoring — automated rollback if error rate spikes. Key principles: fail fast (tests run in parallel), immutable artifacts (same image promoted through environments), GitOps (deployment state in Git). Each microservice has its own pipeline but shares common templates.",
      concepts: ["cicd-pipeline", "docker-build", "gitops", "immutable-artifacts"],
    },
    {
      question: "Explain the difference between blue-green and canary deployments.",
      idealAnswer: "Blue-green: maintain two identical production environments (blue = current, green = new). Deploy to green, run tests, then switch traffic 100% from blue to green via load balancer. Rollback is instant — switch back to blue. Downside: requires 2x infrastructure cost, database migrations must be backward compatible. Best for: stateless services, when you need instant rollback. Canary: gradually shift traffic to new version — start with 1%, monitor error rates and latency, increase to 10%, 50%, 100%. Rollback by routing traffic back. Downside: slower rollout, need feature flags for database changes, monitoring must be robust. Best for: high-traffic services where you want to validate with real traffic before full rollout. Canary is more sophisticated but catches issues that staging misses.",
      concepts: ["blue-green", "canary-deployment", "traffic-shifting", "rollback-strategy"],
    },
  ],
  technical_screening: [
    {
      question: "What's the difference between a process and a thread? When would you use each?",
      idealAnswer: "Process: independent execution unit with its own memory space, file descriptors, and resources. Threads: lightweight execution units within a process that share memory and resources. Key differences: (1) Memory isolation — processes are isolated (crash doesn't affect others), threads share memory (one thread can corrupt another's data). (2) Communication — inter-process communication (IPC) is expensive (pipes, sockets, shared memory); threads communicate via shared memory (fast but requires synchronization). (3) Creation cost — processes are expensive to create (fork), threads are cheap. Use processes when: isolation is critical (browser tabs, microservices), running untrusted code, CPU-bound work in Python (bypasses GIL). Use threads when: I/O-bound work (waiting for network/disk), shared state is needed, low overhead is important. Node.js uses a single thread with async I/O — worker_threads for CPU-bound work.",
      concepts: ["process-vs-thread", "memory-isolation", "ipc", "concurrency"],
    },
    {
      question: "Explain eventual consistency and give a real-world example.",
      idealAnswer: "Eventual consistency: in a distributed system, if no new updates are made to a piece of data, all replicas will eventually converge to the same value. There's no guarantee of when, but it will happen. Real-world example: DNS propagation — when you update a DNS record, different DNS servers around the world may return different IP addresses for hours until all caches expire and propagate. Another example: Amazon shopping cart — if you add an item on your phone and your laptop simultaneously, both additions will eventually appear even if one was temporarily invisible. Trade-off: eventual consistency enables higher availability and lower latency (you can read from the nearest replica without waiting for global consensus). Strong consistency requires coordination (Paxos, Raft) which adds latency. Choose based on whether stale reads are acceptable for your use case.",
      concepts: ["eventual-consistency", "dns-propagation", "replica-convergence", "stale-reads"],
    },
    {
      question: "Explain the CAP theorem and give an example of a system that prioritises each combination.",
      idealAnswer: "CAP theorem: in a distributed system, you can only guarantee 2 of 3: Consistency (all nodes see the same data), Availability (every request gets a response), Partition tolerance (system works despite network partitions). Since network partitions are unavoidable in distributed systems, the real choice is CP vs AP. CP (Consistency + Partition tolerance): during a partition, refuse requests rather than return stale data. Example: HBase, Zookeeper, traditional RDBMS with synchronous replication. Use when: financial transactions, inventory systems. AP (Availability + Partition tolerance): during a partition, return potentially stale data rather than error. Example: Cassandra, DynamoDB, CouchDB. Use when: social media feeds, shopping carts, DNS. CA (Consistency + Availability): only possible without partitions — single-node systems or systems that halt on partition. Important nuance: CAP is about worst-case behavior during partitions, not normal operation.",
      concepts: ["cap-theorem", "consistency-availability", "partition-tolerance", "cp-vs-ap"],
    },
  ],
  resume_deep_dive: [
    {
      question: "Walk me through the most technically challenging part of your most recent project.",
      idealAnswer: "Strong answer: pick a genuinely hard problem (not 'setting up the project'). Structure: (1) What made it hard — technical complexity, scale, ambiguity, or novel problem. (2) Your investigation process — how you broke down the problem, what you tried, what failed. (3) The solution — be specific about the technical approach. (4) The outcome — measurable impact. Recruiters want to see: depth of technical understanding, systematic problem-solving, ability to communicate complexity. Avoid: vague answers ('it was really complex'), solutions that are just 'I Googled it', or problems that aren't actually technical challenges. Prepare 2-3 specific examples from your resume that demonstrate different types of challenges (performance, architecture, debugging).",
      concepts: ["project-challenge", "technical-depth", "problem-investigation", "measurable-impact"],
    },
    {
      question: "What's the biggest architectural decision you made in a recent project and why?",
      idealAnswer: "Frame as a trade-off decision: 'We chose X over Y because of constraints A, B, C.' Strong answers include: what alternatives you considered, what criteria you used to evaluate them (performance, cost, team expertise, operational complexity), what you would do differently with hindsight. Example structure: 'We chose a monolith over microservices for our MVP because our team was 3 engineers, we needed to move fast, and the operational overhead of microservices would have slowed us down. The trade-off was that we'd need to refactor later as we scaled, which we planned for by keeping clear module boundaries.' Recruiters evaluate: systems thinking, awareness of trade-offs, pragmatism vs. over-engineering, ability to make decisions under uncertainty.",
      concepts: ["architectural-decision", "trade-off-analysis", "monolith-vs-microservices", "pragmatic-engineering"],
    },
  ],
};

/**
 * Get the next question for a given interview type.
 * Skips questions whose concepts overlap with already-covered concepts.
 * Falls back to least-overlap questions if all concepts are covered.
 * Returns both the question string and its concepts so the caller can
 * add them to coveredConcepts.
 */
export function getNextQuestion(
  typeId: string,
  askedQuestions: Set<string>,
  coveredConcepts: Set<string>,
  questionNumber: number
): { question: string; concepts: string[] } {
  const pool = QUESTION_BANK[typeId] ?? QUESTION_BANK["technical_screening"];

  // First pass: find a question that hasn't been asked AND has no concept overlap
  for (const entry of pool) {
    if (
      !askedQuestions.has(entry.question) &&
      !entry.concepts.some((c) => coveredConcepts.has(c))
    ) {
      return { question: entry.question, concepts: entry.concepts };
    }
  }

  // Second pass: find any question that hasn't been asked (ignore concept overlap)
  for (const entry of pool) {
    if (!askedQuestions.has(entry.question)) {
      return { question: entry.question, concepts: entry.concepts };
    }
  }

  // All questions exhausted — fall back to least-overlap question with a follow-up angle
  const FOLLOW_UP_ANGLES = [
    " How would your approach change at 10x the scale?",
    " What would you do differently with more time?",
    " How would you test this in production?",
    " What monitoring would you add to this system?",
    " How would you explain this decision to a non-technical stakeholder?",
  ];

  // Pick the entry with fewest covered concepts
  const sorted = [...pool].sort((a, b) => {
    const aOverlap = a.concepts.filter((c) => coveredConcepts.has(c)).length;
    const bOverlap = b.concepts.filter((c) => coveredConcepts.has(c)).length;
    return aOverlap - bOverlap;
  });

  const base = sorted[questionNumber % sorted.length];
  const angle = FOLLOW_UP_ANGLES[questionNumber % FOLLOW_UP_ANGLES.length];
  return { question: base.question + angle, concepts: base.concepts };
}

/** Get the ideal answer for a specific question string. */
export function getIdealAnswer(typeId: string, question: string): string | undefined {
  const pool = QUESTION_BANK[typeId] ?? QUESTION_BANK["technical_screening"];
  const entry = pool.find((e) => question.startsWith(e.question));
  return entry?.idealAnswer;
}

