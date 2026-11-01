# WebGuard AI — Product Requirements Document (PRD)

**Document Version:** 2.0.0  
**Status:** Approved / Production-Ready  
**Product Name:** WebGuard AI  
**Tagline:** Autonomous Website Reliability & Competitive Intelligence Platform  

---

## 1. Executive Summary & Problem Statement

Modern enterprise web infrastructure faces two compounding challenges:
1. **Silent Technical Degradation:** Traditional uptime monitors simply ping `GET /` and check for HTTP 200. They fail to catch client-side JavaScript crashes, broken checkout buttons, DNS rebinding attacks, or subtle DOM modifications that destroy conversion rates while the server reports HTTP 200.
2. **Disconnected Market Signals:** When an outage or degradation occurs, engineering teams debug in a silo, unaware that a key competitor simultaneously launched a 40% discount or updated their pricing tier, compounding customer churn risk.
3. **Alert Fatigue & Hallucinated AI:** Standard APM tools flood on-call engineers with hundreds of unprioritized alerts. Recent attempts to introduce AI into incident management often generate hallucinated root causes without verifiable evidence.

**WebGuard AI** resolves this by fusing **autonomous synthetic browser testing**, **real-time endpoint health surveillance**, **semantic DOM change detection**, and **competitor pricing intelligence** into a single, unified, evidence-driven autonomous platform.

---

## 2. Target User Personas

| Persona | Role | Core Objectives & Pain Points | WebGuard AI Value Proposition |
|---|---|---|---|
| **Alex — Staff SRE / Platform Engineer** | Manages uptime, Kubernetes clusters, and edge CDN routing. Suffers from alert fatigue and manual incident triage. | Needs verified root-cause analysis, DNS rebinding protection, and safe automated remediation with verification. | Evidence-partitioned investigations, calibrated confidence scores, and one-click allowlisted CDN/K8s remediation. |
| **Sarah — VP of Product / Growth** | Tracks competitor pricing shifts and customer conversion funnels. | Misses competitor pricing drops and silent checkout button regressions until customer complaints roll in. | Real-time competitor pricing surveillance, currency normalization, and automated regression replay. |
| **Marcus — Head of Information Security (CISO)** | Responsible for corporate security posture, SSRF prevention, and audit trails. | Terrified of webhook SSRF attacks, internal metadata exposure, and unvetted autonomous agent actions. | Socket-level SSRF/DNS rebinding defense, strict RBAC, HMAC-SHA256 webhooks, and immutable execution audit logs. |

---

## 3. Core Capabilities & Feature Requirements

### 3.1 Website Health Fleet Surveillance
- **Sub-Minute Roundtrip Probing:** Continuous latency benchmarking and status verification across registered endpoints.
- **Socket-Level SSRF Guardrails:** Outbound probes pre-screen all IPs against RFC1918, loopback, carrier-grade NAT, and cloud metadata (`169.254.169.254`).
- **Health State Machine:** Classifies targets as `Healthy`, `Degraded` (elevated latency or intermittent errors), or `Down`.

### 3.2 Semantic Change Detection
- **Headless DOM Extraction:** Powered by TinyFish Fetch to capture complete post-render DOM structures.
- **Structural Diff Classification:** Differentiates between cosmetic text updates and critical functional breaks (e.g., missing forms, removed action buttons, altered navigation).
- **Incident Escalation:** Structural regressions automatically generate high-priority incident investigations.

### 3.3 Competitor Pricing Intelligence
- **Tier & Plan Extraction:** Surveils competitor URLs, extracting structured plans, tiers (Starter, Pro, Enterprise), and billing cadences (monthly vs. annual).
- **Multi-Currency Normalization:** Normalizes USD (`$`), EUR (`€`), GBP (`£`), and INR (`₹`, `Rs`).
- **Historical Interval Tracking:** Measures price adjustments with percentage shifts and exact time elapsed between changes without fabricating history for newly tracked competitors.

### 3.4 Autonomous Evidence-Driven AI Investigation Engine
- **Cross-Module Signal Correlation:** Merges probe telemetry, DOM diffs, competitor pricing shifts, TinyFish browser agent replays, and historical MTTR.
- **Strict Evidence Partitioning:**
  - **CONFIRMED FACTS:** Empirically verified findings (HTTP error codes, connection resets, browser console errors).
  - **OBSERVATIONS:** Neutral telemetry metrics (mean latency, probe counts, diff byte size).
  - **HYPOTHESES:** Inferred root causes with rationale and verification steps.
  - **UNKNOWN:** Explicit statement of unobservable factors (e.g., internal DB connection pool saturation without APM).
- **Calibrated Confidence Scoring:** Non-arbitrary formula derived from signal diversity, browser agent reproduction, and contradictory evidence penalties. Yields `"Insufficient evidence"` if confidence $< 0.40$.

### 3.5 AI Action Center & Safe Remediation Adapters
- **Human-in-the-Loop Governance:** Autonomous proposals require authenticated role-based approval (`admin` role required for high-risk actions).
- **Modular Adapter Architecture:**
  - *Cloudflare CDN:* Zone and path cache purging.
  - *Kubernetes Cluster:* Deployment scaling and rollout rollback within allowlisted deployment names and replica boundaries.
  - *CI/CD Webhooks:* HMAC-SHA256 signed rollback dispatches with anti-replay nonces.
- **Honest Telemetry:** Unconfigured infrastructure credentials return `integration_unconfigured` rather than faking execution.
- **Automated Verification:** The `RemediationVerifier` re-evaluates the target endpoint post-execution to confirm genuine recovery before marking incidents `Resolved`.

### 3.6 Autonomous Regression Testing
- **Goal-Driven Browser Exploration:** Defines high-level natural language test objectives (e.g., *"Verify checkout button submits and opens stripe modal"*).
- **TinyFish Agent Integration:** Executes headless Chromium workflows with step-by-step telemetry, screen streaming URLs, and assertion validation.

---

## 4. Non-Functional Requirements (NFRs)

### 4.1 Security & Compliance
- **Zero SSRF Tolerance:** Complete elimination of TOCTOU DNS rebinding, decimal/hex/octal IP bypasses, and mapped IPv6 bypasses.
- **Strict Multi-Tenancy:** 100% data isolation per organization enforced at database query layers.
- **Secrets Management:** In production mode, weak JWT secrets or default credentials halt boot with hard configuration errors.

### 4.2 Reliability & Availability
- **High Availability Worker Engine:** Distributed Celery workers with Redis distributed leases. Automatic fallback to in-process leases in local dev.
- **Non-Blocking Operation:** Long-running browser automations and external webhooks operate asynchronously without blocking HTTP request threads.

### 4.3 Performance Benchmarks
- Health check roundtrip execution: $< 250\text{ ms}$ processing overhead.
- Dashboard API response time: $< 80\text{ ms}$ for aggregated fleet metrics.
- Frontend initial render: $< 1.2\text{ s}$ bundle load with full interactive responsiveness.

---

## 5. Success Metrics (KPIs)

- **Mean Time to Detect (MTTD):** Under 60 seconds from endpoint degradation to incident generation.
- **Mean Time to Remediate (MTTR):** Reduction from industry average 42 minutes down to under 3 minutes via one-click approved remediation.
- **Zero False-Success Remediations:** 0% fake remediation claims via strict pre/post verification assertions.
- **Investigation Confidence Precision:** Calibrated thresholding ensuring $< 5\%$ false-positive root cause claims.

