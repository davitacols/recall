import { DOCUMENTATION_FEATURE_GROUPS } from "./documentationFeaturePages";

const BASE_DOCUMENTATION_GROUPS = [
  {
    id: "getting-started",
    title: "Getting Started",
    pages: [
      {
        id: "overview",
        slug: "getting-started/overview",
        title: "Platform Overview",
        summary: "Understand how Knoledgr connects conversations, decisions, documents, and execution into one memory system.",
        readTime: "4 min",
        audience: "Admins, operators, team leads",
        sections: [
          {
            heading: "What Knoledgr is",
            paragraphs: [
              "Knoledgr is a knowledge-first operating workspace for teams that need context to survive real execution. Instead of storing decisions, documents, discussions, and delivery work in separate systems, it keeps them linked as one working record.",
            ],
            bullets: [
              "Capture the why behind work, not just the current status.",
              "Keep conversations, decisions, documents, and execution history searchable together.",
              "Use Ask Recall and the Knowledge Graph to recover context without replaying old threads.",
            ],
          },
          {
            heading: "Core product surfaces",
            bullets: [
              "Conversations for discovery, discussion, and meeting capture.",
              "Decisions for rationale, approvals, confidence, and outcome review.",
              "Documents for long-lived reference material linked to active work.",
              "Projects, issues, sprints, and blockers for execution with context attached.",
            ],
          },
        ],
      },
      {
        id: "workspace-setup",
        slug: "getting-started/workspace-setup",
        title: "Workspace Setup",
        summary: "Set up your Knoledgr workspace, invite the right people, and establish a clean structure from day one.",
        readTime: "5 min",
        audience: "Workspace admins",
        sections: [
          {
            heading: "Start with a clear operating model",
            bullets: [
              "Decide which teams will use Knoledgr first and what work should live there.",
              "Define naming patterns for projects, decisions, meetings, and documents.",
              "Set expectations for when a discussion becomes a decision and when a decision must link to execution work.",
            ],
          },
          {
            heading: "Recommended first setup",
            bullets: [
              "Invite admins and managers first so ownership is clear.",
              "Create your active projects and current sprint structure.",
              "Seed one or two core documents and a handful of real decisions.",
              "Enable integrations only after the basic workflow is working cleanly.",
            ],
          },
        ],
      },
      {
        id: "first-rollout",
        slug: "getting-started/first-rollout",
        title: "First Rollout",
        summary: "Roll Knoledgr out to a live team without overwhelming people or creating duplicate process.",
        readTime: "5 min",
        audience: "Leads and rollout owners",
        sections: [
          {
            heading: "Launch with one real workflow",
            bullets: [
              "Pick a live initiative, not a fake pilot.",
              "Use Knoledgr for the next decision cycle, not just as an archive.",
              "Require linked conversations, decisions, and follow-through for that initiative.",
            ],
          },
          {
            heading: "What to measure in week one",
            bullets: [
              "How quickly people can recover why a change happened.",
              "Whether issues and tasks have visible decision context.",
              "How often teammates can answer questions with Ask Recall instead of manual re-explaining.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "core-workflows",
    title: "Core Workflows",
    pages: [
      {
        id: "conversations",
        slug: "workflows/conversations",
        title: "Conversations",
        summary: "Use conversations for discovery, meeting capture, updates, blockers, and early-stage reasoning.",
        readTime: "4 min",
        audience: "All users",
        sections: [
          {
            heading: "When to use conversations",
            bullets: [
              "Capture discovery threads, updates, questions, and meeting output.",
              "Record blockers and unresolved tradeoffs before they become execution surprises.",
              "Use meaningful titles so search, graph, and AI retrieval work well later.",
            ],
          },
          {
            heading: "Good conversation hygiene",
            bullets: [
              "Keep one conversation focused on one topic or decision area.",
              "Link supporting documents and related work while the context is still fresh.",
              "Promote high-signal threads into formal decisions when commitment is needed.",
            ],
          },
        ],
      },
      {
        id: "decisions",
        slug: "workflows/decisions",
        title: "Decisions",
        summary: "Track decisions with rationale, alternatives, confidence, implementation notes, and outcome review.",
        readTime: "5 min",
        audience: "Managers, leads, approvers",
        routes: ["/decisions", "/decision-proposals", "/decisions/:id"],
        workflow: {
          eyebrow: "Decision lifecycle",
          title: "How a Knoledgr decision moves from proposal to learning",
          description: "The strongest decision records in Knoledgr do not stop at approval. They stay connected through execution, outcome review, and follow-up.",
          steps: [
            {
              title: "Capture the choice",
              detail: "Create or promote a decision with the problem, chosen direction, rationale, confidence, and alternatives considered.",
            },
            {
              title: "Link downstream work",
              detail: "Attach the decision to conversations, documents, projects, issues, or pull requests so the why remains visible after the meeting ends.",
            },
            {
              title: "Review the outcome",
              detail: "Once implemented, record success or failure, review confidence, notes, and structured metrics instead of relying on memory later.",
            },
            {
              title: "Use replay and follow-up",
              detail: "Run a replay simulation to explore safeguards, then create follow-up tasks when the learning should change future execution.",
            },
          ],
        },
        visual: {
          eyebrow: "Surface map",
          title: "The decision surface is designed around evidence, not just approval",
          caption: "Knoledgr spreads the lifecycle across queue, detail, replay, and follow-up so teams can understand both the original choice and what happened after implementation.",
          panels: [
            {
              title: "Decision queue",
              value: "Proposal review and commitment",
              helper: "Use the proposals queue when ideas need visible review before they become formal decisions.",
              emphasis: true,
            },
            {
              title: "Decision detail",
              value: "Rationale, context, and linked records",
              helper: "The detail page is the operating record for confidence, outcome review, exports, and linked context.",
            },
            {
              title: "Replay simulator",
              value: "Counterfactual learning",
              helper: "Replay explores alternate choices and returns recommended safeguards before teams rewrite history in hindsight.",
            },
            {
              title: "Follow-up orchestration",
              value: "Tasks from failed outcomes",
              helper: "Outcome review can create traceable follow-up work when implementation did not deliver the intended result.",
            },
          ],
        },
        examplesEyebrow: "Decision APIs",
        examplesTitle: "Decision lifecycle API examples",
        examplesDescription: "These examples mirror the current decision detail flows used in the web app today.",
        examples: [
          {
            title: "Fetch one decision record",
            method: "GET",
            endpoint: "/api/decisions/:decisionId/",
            description: "The decision detail page loads the full operating record, including confidence, code links, outcome notes, and lessons learned.",
            response: {
              id: 42,
              title: "Adopt staged rollout for billing migration",
              status: "implemented",
              confidence: 78,
              confidence_level: "high",
              alternatives_considered: ["Big-bang rollout", "Delay migration"],
              outcome_notes: "Reduced incident volume after phased release.",
              success_metrics: {
                adoption_rate: 74,
                incident_count: 1,
              },
              was_successful: true,
              lessons_learned: "A visible fallback plan lowered rollout risk.",
            },
          },
          {
            title: "Save an outcome review",
            method: "POST",
            endpoint: "/api/decisions/:decisionId/outcome-review/",
            description: "Outcome review is only available after implementation and requires explicit success/failure plus a review confidence score.",
            request: {
              was_successful: true,
              review_confidence: 4,
              outcome_notes: "Pilot rollout landed without customer-facing disruption.",
              impact_review_notes: "Support load stayed below forecast.",
              lessons_learned: "Staged rollout reduced operational stress.",
              success_metrics: {
                adoption_rate: 74,
                incident_count: 1,
                roi: 18.5,
              },
            },
            response: {
              id: 42,
              was_successful: true,
              review_confidence: 4,
              message: "Outcome review saved",
            },
          },
          {
            title: "Run replay simulation for a different choice",
            method: "POST",
            endpoint: "/api/decisions/:decisionId/replay-simulator/",
            description: "Replay lets operators explore alternative framing, risk tolerance, and execution speed before deciding whether to create safeguards.",
            request: {
              alternative_title: "Delay the rollout by one sprint",
              alternative_summary: "Hold release until migration monitoring is stronger.",
              risk_tolerance: "low",
              execution_speed: "normal",
              impact_level: "medium",
            },
            response: {
              scenario: {
                alternative_title: "Delay the rollout by one sprint",
              },
              recommended_safeguards: [
                "Add a rollback checklist",
                "Require daily migration telemetry review",
              ],
            },
          },
        ],
        sections: [
          {
            heading: "What belongs in a decision",
            bullets: [
              "The question being resolved and the chosen direction.",
              "Alternatives considered and why they were not selected.",
              "Confidence, expected impact, risks, and next steps.",
              "Links back to the conversation, documents, and execution work affected.",
            ],
          },
          {
            heading: "Outcome discipline",
            bullets: [
              "Review whether the result matched expectations after implementation.",
              "Capture lessons learned, drift, and follow-up actions.",
              "Use replay and analysis features to improve future decision quality.",
            ],
          },
        ],
      },
      {
        id: "documents",
        slug: "workflows/documents",
        title: "Documents",
        summary: "Use documents as stable reference material that stays close to active work instead of drifting into a separate archive.",
        readTime: "4 min",
        audience: "All users",
        sections: [
          {
            heading: "What documents are best for",
            bullets: [
              "Requirements, operating notes, playbooks, meeting summaries, and durable reference material.",
              "Source-of-truth context that should outlive one sprint or thread.",
              "Documents that need to stay linked to decisions, conversations, or execution work.",
            ],
          },
          {
            heading: "How to keep docs useful",
            bullets: [
              "Link documents to the work they support instead of leaving them isolated.",
              "Update documents when decisions materially change the operating plan.",
              "Use comments and snapshots when teams need to review changes over time.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "knowledge-ai",
    title: "Knowledge and AI",
    pages: [
      {
        id: "ask-recall",
        slug: "intelligence/ask-recall",
        title: "Ask Recall",
        summary: "Ask grounded questions about your organization and get answers backed by Knoledgr evidence.",
        readTime: "5 min",
        audience: "All users",
        routes: ["/ask"],
        workflow: {
          eyebrow: "Copilot workflow",
          title: "How Ask Recall turns prompts into grounded answers",
          description: "Ask Recall is not just a chat box. It classifies the request, searches workspace evidence, scores coverage, and only exposes autonomous execution on diagnosis paths.",
          steps: [
            {
              title: "Ask a concrete organization question",
              detail: "Use project names, sprint names, issue keys, document titles, or decision names when possible so retrieval has something precise to anchor to.",
            },
            {
              title: "Review evidence before acting",
              detail: "Look at confidence, evidence count, source types, citations, and missing evidence signals before treating the answer as complete.",
            },
            {
              title: "Use what-if or autonomous fixes when appropriate",
              detail: "What-if simulation models readiness shifts. Autonomous fixes are reserved for diagnosis results and require admin or manager confirmation.",
            },
          ],
        },
        visual: {
          eyebrow: "Surface map",
          title: "Ask Recall is built around answer quality and operator trust",
          caption: "The page keeps the prompt, grounded response, evidence, actions, simulation, and feedback loop visible together so teams can judge credibility before acting.",
          panels: [
            {
              title: "Prompt bar",
              value: "Grounded organization questions",
              helper: "Ask about projects, sprints, blockers, decisions, documents, meetings, people, and operational state.",
              emphasis: true,
            },
            {
              title: "Response block",
              value: "Answer, engine, and confidence",
              helper: "The answer surface shows whether the result came from the provider-backed path or the rules fallback.",
            },
            {
              title: "Evidence coverage",
              value: "Citations, source types, and gaps",
              helper: "Coverage and missing evidence make weak retrieval visible instead of hiding uncertainty.",
            },
            {
              title: "Interventions",
              value: "Recommended next actions",
              helper: "Diagnosis prompts can surface prioritized interventions and, when approved, run safe autonomous fixes.",
            },
          ],
        },
        examplesEyebrow: "Copilot APIs",
        examplesTitle: "Ask Recall API examples",
        examplesDescription: "These examples reflect the current web flow used by the Ask Recall page.",
        examples: [
          {
            title: "Run grounded analysis",
            method: "POST",
            endpoint: "/api/knowledge/ai/copilot/",
            description: "The main copilot call supports answer, diagnosis, and navigation modes. Execution is optional and explicitly confirmed.",
            request: {
              query: "Tell me about the Talking Stage sprint in the Justice App project.",
              execute: false,
              confirm_execute: false,
              max_actions: 3,
              disable_navigation: false,
            },
            response: {
              analysis_id: "8b6956bb-1c9d-4f91-8b5f-2aa0c0b1b321",
              answer_engine: "anthropic",
              response_mode: "answer",
              confidence: 81,
              confidence_band: "high",
              evidence_count: 6,
              source_types: ["project", "sprint", "issue"],
              coverage_score: 78,
              citations: [
                { type: "sprint", title: "Talking Stage Sprint" },
                { type: "project", title: "Justice App" },
              ],
              recommended_interventions: [],
            },
          },
          {
            title: "Model readiness improvement with what-if simulation",
            method: "POST",
            endpoint: "/api/knowledge/ai/copilot/what-if/",
            description: "The simulation endpoint projects readiness changes for decision resolution, blocker clearance, or ownership assignment.",
            request: {
              action_type: "clear_blockers",
              units: 2,
              horizon_days: 14,
            },
            response: {
              action_type: "clear_blockers",
              units: 2,
              horizon_days: 14,
              baseline: {
                readiness_score: 68.5,
                status: "watch",
              },
              projected: {
                readiness_score: 82.5,
                status: "stable",
                delta: 14,
              },
              assumptions: ["Clear up to 2 active blockers in 14 days."],
            },
          },
          {
            title: "Submit operator feedback on an answer",
            method: "POST",
            endpoint: "/api/knowledge/ai/copilot/feedback/",
            description: "Feedback helps the team track whether Ask Recall guidance is useful, risky, or low-value in practice.",
            request: {
              analysis_id: "8b6956bb-1c9d-4f91-8b5f-2aa0c0b1b321",
              query: "What decisions are blocking delivery?",
              feedback: "down",
              outcome: "Needed more evidence",
              response_mode: "diagnosis",
              confidence_band: "medium",
              evidence_count: 3,
              coverage_score: 54,
              has_actions: true,
            },
            response: {
              message: "Feedback recorded",
            },
          },
        ],
        sections: [
          {
            heading: "What Ask Recall does well",
            bullets: [
              "Answer organization questions using conversations, decisions, documents, projects, sprints, and issues.",
              "Show evidence coverage and confidence instead of pretending certainty.",
              "Diagnose operational risk and recommend interventions when a prompt is execution-oriented.",
            ],
          },
          {
            heading: "How to ask better questions",
            bullets: [
              "Use project names, sprint names, decision titles, or document names when possible.",
              "Ask specific why, what changed, and current-state questions.",
              "Review the evidence list before acting on an answer with low coverage.",
            ],
          },
        ],
      },
      {
        id: "knowledge-graph",
        slug: "intelligence/knowledge-graph",
        title: "Knowledge Graph",
        summary: "Visualize how conversations, decisions, documents, people, and execution entities connect.",
        readTime: "4 min",
        audience: "Leads, operators, researchers",
        sections: [
          {
            heading: "What the graph is for",
            bullets: [
              "Explore connected context around a project, issue, document, or decision.",
              "Spot isolated work that has weak supporting context.",
              "Find related artifacts and subject-matter experts faster.",
            ],
          },
          {
            heading: "Best practices",
            bullets: [
              "Keep links current between decisions and downstream work.",
              "Use the graph alongside Ask Recall when investigating historical changes.",
              "Treat missing links as a documentation signal, not just a graph issue.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "execution",
    title: "Execution",
    pages: [
      {
        id: "projects-issues",
        slug: "execution/projects-and-issues",
        title: "Projects and Issues",
        summary: "Run work in projects and issue detail views that preserve the reasoning behind execution changes.",
        readTime: "5 min",
        audience: "Product, engineering, operations",
        sections: [
          {
            heading: "Execution with context",
            bullets: [
              "Projects hold the delivery frame and issue flow.",
              "Issues can link directly to decisions, conversations, meetings, and documents.",
              "Issue detail pages surface engineering context, attachments, watchers, and impact panels.",
            ],
          },
          {
            heading: "Keep issue records healthy",
            bullets: [
              "Link important issues to the decision or conversation that created them.",
              "Use blockers and comments to preserve current execution friction.",
              "Treat issue status as a delivery signal, not the full story on its own.",
            ],
          },
        ],
      },
      {
        id: "sprints-autopilot",
        slug: "execution/sprints-and-autopilot",
        title: "Sprints and Autopilot",
        summary: "Use sprints, blockers, and sprint autopilot to keep delivery planning tied to real decision and risk signals.",
        readTime: "5 min",
        audience: "Delivery leads, managers",
        sections: [
          {
            heading: "What sprint management covers",
            bullets: [
              "Sprint boards, sprint detail views, blocker tracking, and retrospective memory.",
              "Issue moves, capacity signals, and delivery health in one operating layer.",
              "Decision dependencies that explain why sprint flow changed.",
            ],
          },
          {
            heading: "What Autopilot looks at",
            bullets: [
              "Pace versus remaining time, blockers, unresolved decisions, and work-in-progress pressure.",
              "Drop or add recommendations based on sprint risk.",
              "Traceable action plans rather than opaque scoring.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "admin-governance",
    title: "Admin and Governance",
    pages: [
      {
        id: "teams-roles",
        slug: "admin/teams-roles-and-governance",
        title: "Teams, Roles, and Governance",
        summary: "Control access without breaking collaboration speed, and keep governance tied to actual operational habits.",
        readTime: "4 min",
        audience: "Admins and managers",
        sections: [
          {
            heading: "Role model",
            bullets: [
              "Admins manage workspace settings, approvals, and protected operations.",
              "Managers drive operational workflows and team execution.",
              "Contributors participate in day-to-day collaboration and delivery.",
            ],
          },
          {
            heading: "Governance habits that matter",
            bullets: [
              "Review pending outcomes and drift regularly.",
              "Require decision linkage for high-impact execution changes.",
              "Use audit, export, and enterprise controls where the operating model requires them.",
            ],
          },
        ],
      },
      {
        id: "security-compliance",
        slug: "admin/security-and-compliance",
        title: "Security and Compliance",
        summary: "Manage security settings, audit access, and compliance controls from the admin surface.",
        readTime: "4 min",
        audience: "Admins, security leads",
        sections: [
          {
            heading: "Security controls in product",
            bullets: [
              "Security settings, audit logs, API keys, invitations, and data export live in admin flows.",
              "Enterprise policies can require SSO, MFA, integration approval, and retention controls.",
              "Partner and operational inboxes stay staff-only where the data is not customer-scoped.",
            ],
          },
          {
            heading: "When to use enterprise controls",
            bullets: [
              "If you need tighter governance around apps, access, residency, or auditability.",
              "If rollout requires formal incident handling or policy enforcement.",
              "If teams need portfolio-level visibility with stronger admin review loops.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "integrations",
    title: "Integrations",
    pages: [
      {
        id: "slack",
        slug: "integrations/slack",
        title: "Slack Alert Setup",
        summary: "Connect Slack so decision, blocker, and sprint signals reach the right channel without extra manual posting.",
        readTime: "3 min",
        audience: "Admins, delivery leads, team leads",
        routes: ["/integrations"],
        sections: [
          {
            heading: "What you need before setup",
            bullets: [
              "Slack workspace access that can create or edit an app.",
              "An incoming webhook URL for the destination channel.",
              "A clear decision on which signals Knoledgr should send: decisions, blockers, sprint summaries, or a tighter subset.",
            ],
          },
          {
            heading: "Recommended Slack setup flow",
            bullets: [
              "Create the incoming webhook inside Slack and bind it to a channel that should receive Knoledgr updates.",
              "Paste the webhook URL into the Integrations page, confirm the destination channel, and decide which alert types belong there.",
              "Save the configuration, enable Slack, and run Test before assuming the channel is wired correctly.",
            ],
          },
          {
            heading: "Operational guidance",
            bullets: [
              "Use a dedicated channel when possible so delivery and decision alerts remain visible.",
              "Do not over-post every event; teams trust the integration more when the signal stays high.",
              "If the test passes but no live alerts appear later, re-check the webhook URL and the chosen alert toggles first.",
            ],
          },
        ],
      },
      {
        id: "github",
        slug: "integrations/github",
        title: "GitHub Advanced Sync",
        summary: "Connect pull requests, commits, and release signals back to Knoledgr decisions and delivery context.",
        readTime: "4 min",
        audience: "Engineering leads, platform teams",
        sections: [
          {
            heading: "What the integration adds",
            bullets: [
              "PR and commit context on issue and project flows.",
              "Release-related signals that help explain delivery movement.",
              "A cleaner connection between code change and decision history.",
            ],
          },
          {
            heading: "Recommended usage",
            bullets: [
              "Use it when code delivery needs to stay attached to issue or decision context.",
              "Review linked artifacts before using commit or PR signals as decision evidence.",
              "Keep naming and workflow conventions consistent so linked records stay intelligible.",
            ],
          },
        ],
      },
      {
        id: "jira",
        slug: "integrations/jira",
        title: "Jira Portfolio Bridge",
        summary: "Connect Jira portfolio and dependency views to Knoledgr reporting and execution context.",
        readTime: "4 min",
        audience: "PMO, delivery, transformation teams",
        sections: [
          {
            heading: "What it is for",
            bullets: [
              "Portfolio rollups across multiple projects and workstreams.",
              "Dependency visibility alongside decision and blocker context.",
              "A stronger bridge between traditional portfolio tracking and organizational memory.",
            ],
          },
          {
            heading: "Where it helps most",
            bullets: [
              "Multi-project initiatives with changing priorities and handoffs.",
              "Reporting environments where raw status is not enough without rationale.",
              "Organizations trying to reduce duplicate context across Jira and internal collaboration.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "enterprise",
    title: "Enterprise",
    pages: [
      {
        id: "marketplace-apps",
        slug: "enterprise/marketplace-apps",
        title: "Enterprise Marketplace Apps",
        summary: "Install and govern enterprise apps from the marketplace with docs, launch paths, and approval controls.",
        readTime: "4 min",
        audience: "Enterprise admins",
        sections: [
          {
            heading: "Marketplace basics",
            bullets: [
              "Apps are listed with vendor, category, pricing, docs URL, and launch path.",
              "Installed apps become part of the enterprise operating surface.",
              "Approval policies can require explicit review before third-party apps are enabled.",
            ],
          },
          {
            heading: "Operational guidance",
            bullets: [
              "Use docs links to understand app scope before rollout.",
              "Keep enterprise governance aligned with what apps can change or expose.",
              "Review installation state regularly if you operate under stricter controls.",
            ],
          },
        ],
      },
      {
        id: "enterprise-compliance",
        slug: "enterprise/compliance",
        title: "Enterprise Compliance",
        summary: "Configure policy-level controls for SSO, MFA, integrations, retention, and residency.",
        readTime: "4 min",
        audience: "Security, compliance, enterprise admins",
        routes: ["/enterprise"],
        workflow: {
          eyebrow: "Policy workflow",
          title: "How teams usually roll out enterprise compliance controls",
          description: "The enterprise page lets admins move from identity setup to governance rules without splitting policy work across disconnected screens.",
          steps: [
            {
              title: "Confirm identity posture",
              detail: "Decide whether SSO and MFA are required before tightening downstream app and export controls.",
            },
            {
              title: "Set residency and retention",
              detail: "Choose the data region and retention horizon that match the organization's operating and legal expectations.",
            },
            {
              title: "Lock integration boundaries",
              detail: "Use app approval, IP allowlist, and allowed integration lists to narrow the operational footprint before scale increases.",
            },
          ],
        },
        visual: {
          eyebrow: "Policy map",
          title: "Compliance controls are organized around identity, data, and app boundaries",
          caption: "The enterprise compliance area keeps the most important governance levers visible in one place so admins can reason about tradeoffs before saving policy changes.",
          panels: [
            {
              title: "Identity",
              value: "Require SSO and MFA",
              helper: "Use identity requirements when access consistency matters more than open self-service.",
              emphasis: true,
            },
            {
              title: "Data residency",
              value: "Region and retention horizon",
              helper: "Residency and retention settings define where data should live and how long it should remain.",
            },
            {
              title: "App governance",
              value: "Allowed integrations and approval rules",
              helper: "Third-party app approval prevents enterprise rollout from becoming an unreviewed connector sprawl.",
            },
            {
              title: "Network controls",
              value: "IP allowlist",
              helper: "Use the allowlist when sensitive work must stay behind approved corporate networks.",
            },
          ],
        },
        examplesEyebrow: "Enterprise APIs",
        examplesTitle: "Compliance policy API examples",
        examplesDescription: "These examples reflect the compliance controls currently managed from the Enterprise page.",
        examples: [
          {
            title: "Read current compliance policy",
            method: "GET",
            endpoint: "/api/organizations/enterprise/compliance/",
            description: "The enterprise page loads the persisted policy before showing editable controls.",
            response: {
              id: 9,
              data_residency_region: "eu",
              require_sso: true,
              require_mfa: true,
              audit_export_enabled: true,
              third_party_app_approval_required: true,
              retention_days: 365,
              ip_allowlist: ["203.0.113.10"],
              allowed_integrations: ["github", "jira", "slack"],
            },
          },
          {
            title: "Update enterprise compliance policy",
            method: "PUT",
            endpoint: "/api/organizations/enterprise/compliance/",
            description: "Only admins can update the enterprise compliance policy.",
            request: {
              data_residency_region: "eu",
              require_sso: true,
              require_mfa: true,
              audit_export_enabled: true,
              third_party_app_approval_required: true,
              retention_days: 365,
              ip_allowlist: ["203.0.113.10", "198.51.100.24"],
              allowed_integrations: ["github", "jira", "slack"],
            },
            response: {
              message: "Compliance policy updated",
              id: 9,
            },
          },
        ],
        sections: [
          {
            heading: "What the compliance policy controls",
            bullets: [
              "Data residency region and retention settings.",
              "SSO and MFA requirements.",
              "Audit export availability and third-party app approval rules.",
              "Allowed integrations and IP allowlists where required.",
            ],
          },
          {
            heading: "How to roll it out",
            bullets: [
              "Start with baseline identity and integration rules before expanding restrictions.",
              "Communicate policy changes to admins and managers before enforcement.",
              "Review enterprise docs and legal artifacts alongside product configuration.",
            ],
          },
        ],
      },
      {
        id: "incident-ops",
        slug: "enterprise/incident-ops",
        title: "Incident Ops",
        summary: "Use enterprise incident automation and escalation rules to turn risk signals into trackable operational response.",
        readTime: "5 min",
        audience: "Enterprise admins, operations leaders",
        routes: ["/enterprise"],
        workflow: {
          eyebrow: "Incident workflow",
          title: "How enterprise incident automation moves from signal to response",
          description: "Knoledgr incident ops is meant to convert stale blockers, SLA risk, and delivery pressure into a visible response lane with escalation hooks.",
          steps: [
            {
              title: "Monitor active incident signals",
              detail: "Review open incidents and the enterprise portfolio report to understand where SLA or delivery pressure is building.",
            },
            {
              title: "Run automation or scheduled checks",
              detail: "Automation can create incidents from stale blockers or SLA breaches before teams notice the pattern manually.",
            },
            {
              title: "Escalate with tasks or blockers",
              detail: "Escalation rules can notify admins, create tasks, and create blockers when an incident crosses the configured threshold.",
            },
            {
              title: "Review false positives and rule quality",
              detail: "The system becomes trustworthy when teams tighten the rules after early noisy runs instead of letting alert fatigue grow.",
            },
          ],
        },
        visual: {
          eyebrow: "Response map",
          title: "Incident Ops combines monitoring, automation, and escalation",
          caption: "The goal is to make enterprise risk operationally visible, not just measurable. The page keeps the live incident lane close to the rule system that shapes it.",
          panels: [
            {
              title: "Incident center",
              value: "Open and recent incidents",
              helper: "Track severity, type, status, and source payload across enterprise monitoring events.",
              emphasis: true,
            },
            {
              title: "Automation",
              value: "Blocker and SLA detection",
              helper: "Incident automation scans stale blockers and breached SLA rules to create new incidents.",
            },
            {
              title: "Escalation rules",
              value: "Role-aware response paths",
              helper: "Rules can trigger task creation, blocker creation, and admin notifications when an incident ages or intensifies.",
            },
            {
              title: "Portfolio context",
              value: "Project risk alongside incidents",
              helper: "Portfolio metrics help teams understand whether the incident is local noise or part of a broader execution pattern.",
            },
          ],
        },
        examplesEyebrow: "Incident APIs",
        examplesTitle: "Incident Ops API examples",
        examplesDescription: "These examples map directly to the incident automation and escalation workflows on the enterprise page.",
        examples: [
          {
            title: "List current enterprise incidents",
            method: "GET",
            endpoint: "/api/organizations/enterprise/incidents/",
            description: "Use the incident center feed to review open and recent enterprise incidents.",
            response: [
              {
                id: 17,
                incident_type: "blocker_spike",
                severity: "high",
                status: "open",
                title: "Stale blocker: Payment migration review",
              },
            ],
          },
          {
            title: "Run enterprise incident automation",
            method: "POST",
            endpoint: "/api/organizations/enterprise/incidents/run-automation/",
            description: "Admins and managers can trigger automation to create incidents from stale blockers or SLA risk.",
            response: {
              created_count: 2,
              created_incidents: [
                {
                  id: 17,
                  title: "Stale blocker: Payment migration review",
                  incident_type: "blocker_spike",
                  severity: "high",
                },
              ],
            },
          },
          {
            title: "Create an escalation rule",
            method: "POST",
            endpoint: "/api/organizations/enterprise/incidents/escalation-rules/",
            description: "Escalation rules determine when incidents create blockers, create tasks, or notify admins.",
            request: {
              name: "Critical incident escalation",
              incident_type: "",
              min_severity: "high",
              escalation_delay_minutes: 0,
              create_task: true,
              create_blocker: false,
              notify_admins: true,
              assign_to_role: "admin",
            },
            response: {
              message: "Escalation rule created",
              id: 12,
            },
          },
        ],
        sections: [
          {
            heading: "What incident ops covers",
            bullets: [
              "Incident center visibility for active and recent enterprise incidents.",
              "Automation that creates incidents from stale blockers or SLA risk.",
              "Escalation rules that can create tasks, blockers, and admin notifications.",
            ],
          },
          {
            heading: "Recommended usage",
            bullets: [
              "Use incident ops when teams need more than passive dashboards.",
              "Tie escalation paths to clear ownership and role assignments.",
              "Review false positives early so rules stay trustworthy.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "reference",
    title: "Reference",
    pages: [
      {
        id: "api-highlights",
        slug: "reference/api-highlights",
        title: "API Highlights",
        summary: "Review the major API surfaces that power decisions, knowledge, execution, notifications, and enterprise workflows.",
        readTime: "4 min",
        audience: "Developers, technical admins",
        sections: [
          {
            heading: "Major endpoint families",
            bullets: [
              "/api/decisions/ and related outcome, replay, calibration, and drift endpoints.",
              "/api/knowledge/ search, graph, context, and AI endpoints.",
              "/api/agile/ sprint detail, autopilot, board, blocker, and issue workflows.",
              "/api/organizations/ enterprise, settings, subscription, invitation, and partner endpoints.",
            ],
          },
          {
            heading: "Integration notes",
            bullets: [
              "Most application endpoints are organization-scoped.",
              "Public docs, legal pages, and partner inquiry routes are handled separately from signed-in product flows.",
              "Use the UI first to confirm feature behavior before automating against private APIs.",
            ],
          },
        ],
      },
      {
        id: "troubleshooting",
        slug: "reference/troubleshooting",
        title: "Troubleshooting",
        summary: "Use these checks when docs, AI answers, context quality, or operational confidence feel weak.",
        readTime: "4 min",
        audience: "Admins, operators, power users",
        sections: [
          {
            heading: "Common problems",
            bullets: [
              "Weak Ask Recall answers usually mean low evidence coverage or poor naming.",
              "Sparse knowledge graph context usually means missing links between work artifacts.",
              "Low sprint confidence usually points to blockers, unresolved decisions, or unstable scope.",
              "Shallow docs usage usually means teams are storing context elsewhere instead of linking it inside Knoledgr.",
            ],
          },
          {
            heading: "Where to look next",
            bullets: [
              "Review the linked records first before assuming a ranking or AI problem.",
              "Use documents and decisions as durable anchors for important context.",
              "Check security, integrations, and enterprise settings when behavior differs across roles or workspaces.",
            ],
          },
        ],
      },
    ],
  },
];

export const DOCUMENTATION_GROUPS = [...BASE_DOCUMENTATION_GROUPS, ...DOCUMENTATION_FEATURE_GROUPS];

export const DOCUMENTATION_PAGES = DOCUMENTATION_GROUPS.flatMap((group) =>
  group.pages.map((page, index) => ({
    ...page,
    groupId: group.id,
    groupTitle: group.title,
    order: index,
  }))
);

export function findDocumentationPageBySlug(slug) {
  return DOCUMENTATION_PAGES.find((page) => page.slug === slug) || null;
}
