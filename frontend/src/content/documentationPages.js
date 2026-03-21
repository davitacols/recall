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
