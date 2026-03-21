export const DOCUMENTATION_FEATURE_GROUPS = [
  {
    id: "workspace-features",
    title: "Workspace Features",
    pages: [
      {
        id: "dashboard-activity",
        slug: "workspace/dashboard-and-activity",
        title: "Dashboard and Activity Feed",
        summary: "Use the dashboard and activity feed to orient the team around current signals, execution focus, and recent movement across the workspace.",
        readTime: "4 min",
        audience: "Leads, operators, managers",
        routes: ["/dashboard", "/activity"],
        sections: [
          {
            heading: "What these surfaces do",
            bullets: [
              "The dashboard highlights current operating signals, high-priority follow-up, and workspace momentum.",
              "The activity feed shows recent cross-product changes in one timeline instead of making users check every module separately.",
              "Together they provide situational awareness before people dive into detailed work surfaces.",
            ],
          },
          {
            heading: "How to use them well",
            bullets: [
              "Treat the dashboard as a briefing surface, not a replacement for detailed work pages.",
              "Use activity to validate what changed recently before asking teammates for manual updates.",
              "Pair dashboard checks with decision and sprint review so leadership context stays grounded.",
            ],
          },
        ],
      },
      {
        id: "notifications",
        slug: "workspace/notifications",
        title: "Notifications and Alert Settings",
        summary: "Track mentions, replies, workflow alerts, and operational signals without losing control over notification noise.",
        readTime: "4 min",
        audience: "All users",
        routes: ["/notifications", "/notification-settings"],
        sections: [
          {
            heading: "What notifications cover",
            bullets: [
              "Mentions, replies, decision updates, assignments, reminders, automation, and system notices.",
              "Digest and preference settings that change how email and in-product notifications behave.",
              "Operational alerts that can surface enterprise or delivery issues when configured.",
            ],
          },
          {
            heading: "Recommended setup",
            bullets: [
              "Turn down categories that do not require direct action.",
              "Keep high-signal workflow categories enabled for decisions, tasks, and critical changes.",
              "Review digest frequency regularly so inbox load matches how your team actually works.",
            ],
          },
        ],
      },
      {
        id: "saved-work",
        slug: "workspace/bookmarks-drafts-and-files",
        title: "Bookmarks, Drafts, and Files",
        summary: "Use saved work surfaces to keep in-progress content, quick references, and uploaded assets easy to recover.",
        readTime: "4 min",
        audience: "All users",
        routes: ["/bookmarks", "/drafts", "/files"],
        sections: [
          {
            heading: "What belongs here",
            bullets: [
              "Bookmarks for high-signal records you expect to revisit often.",
              "Drafts for unfinished work that should not disappear into browser history or temporary notes.",
              "Files for uploaded assets that support documents, issues, and other linked records.",
            ],
          },
          {
            heading: "How these surfaces help",
            bullets: [
              "Reduce reliance on manual note-taking or off-platform reminders.",
              "Make in-progress thinking easier to resume after interruptions.",
              "Keep supporting material closer to the Knoledgr record it belongs to.",
            ],
          },
        ],
      },
      {
        id: "profile-onboarding",
        slug: "workspace/profile-and-onboarding",
        title: "Profile and Onboarding",
        summary: "Set up identity, preferences, and first-use guidance so the workspace matches how each user works.",
        readTime: "4 min",
        audience: "All users",
        routes: ["/profile", "/onboarding"],
        sections: [
          {
            heading: "What users control",
            bullets: [
              "Profile data, experience mode, and workspace preferences.",
              "Notification defaults and personal working setup.",
              "Onboarding progress and first-use guidance surfaces.",
            ],
          },
          {
            heading: "Why it matters",
            bullets: [
              "Good profile setup improves collaboration clarity and ownership visibility.",
              "Onboarding should move people into real work quickly, not trap them in a demo path.",
              "Experience mode should align with how much product complexity a person needs day to day.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "knowledge-operations",
    title: "Knowledge Operations",
    pages: [
      {
        id: "knowledge-search",
        slug: "knowledge/search-workspace",
        title: "Knowledge Search Workspace",
        summary: "Search across conversations, decisions, projects, tasks, meetings, documents, and related organizational memory from one place.",
        readTime: "5 min",
        audience: "All users",
        routes: ["/knowledge", "/search"],
        sections: [
          {
            heading: "What this workspace covers",
            bullets: [
              "Unified search across core Knoledgr entities instead of separate module-by-module lookup.",
              "Source filters, relevance cues, and knowledge graph handoff for deeper exploration.",
              "A starting point for investigation when the user knows the topic but not the exact record.",
            ],
          },
          {
            heading: "How to improve results",
            bullets: [
              "Use consistent titles and naming across projects, decisions, and documents.",
              "Link records while work is live so retrieval has stronger evidence later.",
              "Search by project, sprint, meeting, or decision names whenever possible.",
            ],
          },
        ],
      },
      {
        id: "knowledge-analytics",
        slug: "knowledge/analytics-and-health",
        title: "Knowledge Analytics and Health",
        summary: "Monitor search quality, coverage, and memory health so the workspace stays useful as the organization grows.",
        readTime: "4 min",
        audience: "Admins, operators, knowledge owners",
        routes: ["/knowledge/analytics", "/knowledge-health"],
        sections: [
          {
            heading: "What these pages show",
            bullets: [
              "Coverage and quality signals across documentation, links, and retrieval behavior.",
              "Weak points in memory quality where important work is under-linked or under-documented.",
              "A way to review whether the workspace is getting more reusable over time.",
            ],
          },
          {
            heading: "How teams should use them",
            bullets: [
              "Review them as operational signals, not vanity metrics.",
              "Use weak areas to drive better linking, document quality, and decision discipline.",
              "Treat knowledge health drift as a process problem, not just a UI problem.",
            ],
          },
        ],
      },
      {
        id: "knowledge-base-page",
        slug: "knowledge/knowledge-base",
        title: "Knowledge Base",
        summary: "Use the knowledge base as a stable reference surface for durable information that should remain easy to browse over time.",
        readTime: "4 min",
        audience: "All users",
        routes: ["/knowledge-base"],
        sections: [
          {
            heading: "What it is best for",
            bullets: [
              "Long-lived reference material that should be browsable without knowing an exact query first.",
              "Structured knowledge collections that complement search and graph exploration.",
              "A more stable front door into organizational memory for recurring topics.",
            ],
          },
          {
            heading: "How it relates to search and documents",
            bullets: [
              "The knowledge base helps browse; search helps find; documents hold detailed source material.",
              "Strong docs and strong linking make the knowledge base more trustworthy.",
              "Use it to reduce repeated orientation work for teams with shared recurring questions.",
            ],
          },
        ],
      },
      {
        id: "decision-proposals",
        slug: "knowledge/decision-proposals",
        title: "Decision Proposals",
        summary: "Use the proposals queue to review pending direction before it becomes a committed decision record.",
        readTime: "4 min",
        audience: "Managers, approvers, reviewers",
        routes: ["/decision-proposals", "/proposals"],
        sections: [
          {
            heading: "What proposals are for",
            bullets: [
              "Hold candidate decisions before they are fully approved or implemented.",
              "Create a visible review queue instead of relying on private approval threads.",
              "Keep early decision framing connected to the same operating memory system as final decisions.",
            ],
          },
          {
            heading: "Review guidance",
            bullets: [
              "Check whether the proposal has enough context, evidence, and implementation clarity.",
              "Link relevant conversations and documents before approving.",
              "Use proposal grouping and notes to separate rough ideas from ready-to-act decisions.",
            ],
          },
        ],
      },
      {
        id: "decision-detail-replay",
        slug: "knowledge/decision-detail-and-replay",
        title: "Decision Detail and Replay",
        summary: "Work inside decision detail pages to review linked context, outcomes, and replay analysis around important choices.",
        readTime: "5 min",
        audience: "Approvers, operators, leads",
        routes: ["/decisions/:id"],
        sections: [
          {
            heading: "What the decision detail page contains",
            bullets: [
              "Briefing context, linked records, confidence signals, outcomes, and historical review detail.",
              "A place to connect the decision to actual downstream work and evidence.",
              "Tools for replay, export, and context review around the decision lifecycle.",
            ],
          },
          {
            heading: "Why replay matters",
            bullets: [
              "Replay helps teams evaluate how alternate choices might have changed risk or impact.",
              "It is most useful when outcome reviews are honest and evidence quality is strong.",
              "Use replay as structured learning, not retroactive certainty theater.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "delivery-planning",
    title: "Delivery and Planning",
    pages: [
      {
        id: "projects-planning",
        slug: "delivery/projects-and-planning",
        title: "Projects and Planning",
        summary: "Use project surfaces to organize delivery, planning context, ownership, and linked execution work.",
        readTime: "5 min",
        audience: "Product, engineering, operations",
        routes: ["/projects", "/projects/:projectId", "/projects/:projectId/manage", "/projects/:projectId/roadmap"],
        sections: [
          {
            heading: "What these project views cover",
            bullets: [
              "Project listing, project detail, management, and roadmap planning.",
              "Context around sprint work, issues, and related decisions inside one project frame.",
              "A clearer operating surface for teams that need delivery structure without losing history.",
            ],
          },
          {
            heading: "How to use project detail well",
            bullets: [
              "Treat the project as the execution container and link decisions into it early.",
              "Use roadmap and planning views to explain direction changes before they become execution confusion.",
              "Keep project-specific work attached to the project instead of relying on general-purpose threads.",
            ],
          },
        ],
      },
      {
        id: "backlog-releases",
        slug: "delivery/backlog-and-releases",
        title: "Backlog and Releases",
        summary: "Track planned work and release shape without losing the decision history behind prioritization changes.",
        readTime: "4 min",
        audience: "Product and delivery leads",
        routes: ["/projects/:projectId/backlog", "/projects/:projectId/releases"],
        sections: [
          {
            heading: "What these surfaces do",
            bullets: [
              "Backlog keeps planned work visible before sprint commitment.",
              "Release views help track delivery packages and readiness movement.",
              "Together they explain how work moves from intention into shipped output.",
            ],
          },
          {
            heading: "Best practices",
            bullets: [
              "Tie backlog priority shifts to visible decisions whenever the impact is material.",
              "Use release views to summarize movement, not to replace issue-level detail.",
              "Review linked blockers and decisions before changing release scope.",
            ],
          },
        ],
      },
      {
        id: "boards-issues",
        slug: "delivery/boards-issues-and-filters",
        title: "Boards, Issues, Templates, and Saved Filters",
        summary: "Manage issue flow with boards, issue detail, reusable templates, and saved filter views that support repeatable execution.",
        readTime: "5 min",
        audience: "Delivery teams, engineering, ops",
        routes: ["/boards/:boardId", "/issues/:issueId", "/agile/templates", "/agile/filters"],
        sections: [
          {
            heading: "What this feature set covers",
            bullets: [
              "Kanban-style board movement, issue detail review, template setup, and saved operational filters.",
              "A way to standardize issue creation while keeping day-to-day execution flexible.",
              "Issue detail pages that preserve discussion, engineering context, and linked decision signals.",
            ],
          },
          {
            heading: "How to keep board flow trustworthy",
            bullets: [
              "Move work based on true execution state, not reporting pressure.",
              "Use templates for recurring work types so issue quality stays consistent.",
              "Save filters for recurring operational views instead of rebuilding them manually.",
            ],
          },
        ],
      },
      {
        id: "sprint-operations",
        slug: "delivery/sprint-operations",
        title: "Sprint Operations",
        summary: "Run current sprint work, sprint history, and sprint management in a way that stays connected to blockers and unresolved decisions.",
        readTime: "5 min",
        audience: "Delivery leads, scrum leads, managers",
        routes: ["/sprint", "/sprint-history", "/sprint-management", "/sprints/:id"],
        sections: [
          {
            heading: "What sprint surfaces provide",
            bullets: [
              "Current sprint visibility for active execution.",
              "Historical sprint review for pattern recognition and operational memory.",
              "Detailed sprint views for capacity, blockers, and intervention planning.",
            ],
          },
          {
            heading: "How to use sprint history well",
            bullets: [
              "Look for repeated decision and blocker patterns, not just missed dates.",
              "Use history to improve planning assumptions, not to punish teams.",
              "Connect sprint learning back into future project and decision behavior.",
            ],
          },
        ],
      },
      {
        id: "blockers-retrospectives",
        slug: "delivery/blockers-and-retrospectives",
        title: "Blockers and Retrospectives",
        summary: "Track active blockers and preserve retrospective memory so teams can learn from delivery friction instead of just surviving it.",
        readTime: "4 min",
        audience: "Delivery leads, teams, managers",
        routes: ["/blockers", "/retrospectives", "/sprints/:sprintId/retrospective"],
        sections: [
          {
            heading: "What these surfaces are for",
            bullets: [
              "Blockers make delivery friction explicit and traceable.",
              "Retrospectives preserve lessons and prevent repeated rediscovery of the same failure modes.",
              "Together they turn execution problems into reusable organizational learning.",
            ],
          },
          {
            heading: "What good usage looks like",
            bullets: [
              "Log blockers while they are still active, not only after they are resolved.",
              "Use retrospective notes to identify pattern changes, not generic team sentiment only.",
              "Link retrospective lessons back to decisions, docs, or templates when appropriate.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "business-admin",
    title: "Business and Administration",
    pages: [
      {
        id: "goals-page",
        slug: "business/goals",
        title: "Goals",
        summary: "Use goals to track directional outcomes and keep progress tied to real work instead of isolated planning statements.",
        readTime: "4 min",
        audience: "Leads, managers, operators",
        routes: ["/business/goals", "/business/goals/:id"],
        sections: [
          {
            heading: "What goals should represent",
            bullets: [
              "Outcome-oriented direction for a team, function, or initiative.",
              "A place to connect the why of work to operational follow-through.",
              "Progress that stays visible across tasks, meetings, and related work.",
            ],
          },
          {
            heading: "How to keep goals useful",
            bullets: [
              "Avoid vague goals that cannot guide execution choices.",
              "Link goals to the meetings, tasks, and decisions that shape movement.",
              "Review goal health regularly instead of only during planning windows.",
            ],
          },
        ],
      },
      {
        id: "meetings-page",
        slug: "business/meetings",
        title: "Meetings",
        summary: "Use meetings to capture decisions, notes, follow-up, and context from live team discussions.",
        readTime: "4 min",
        audience: "All users",
        routes: ["/business/meetings", "/business/meetings/:id"],
        sections: [
          {
            heading: "What meeting records should preserve",
            bullets: [
              "What was discussed, what changed, and what follow-up was created.",
              "The context that will matter after the meeting ends.",
              "A traceable link between meeting output and downstream tasks or decisions.",
            ],
          },
          {
            heading: "Why meeting discipline matters",
            bullets: [
              "Meeting memory is often where teams lose the earliest version of why something changed.",
              "A good meeting record should make future explanation easier, not create extra admin work.",
              "Promote important meeting outcomes into formal decisions or tasks when needed.",
            ],
          },
        ],
      },
      {
        id: "tasks-templates-page",
        slug: "business/tasks-and-templates",
        title: "Tasks and Templates",
        summary: "Use tasks and templates to keep routine operational work structured and easier to repeat at quality.",
        readTime: "4 min",
        audience: "Operations, PM, team leads",
        routes: ["/business/tasks", "/business/templates"],
        sections: [
          {
            heading: "What these surfaces do",
            bullets: [
              "Tasks track operational follow-through, ownership, and due work.",
              "Templates standardize recurring tasks and business workflows.",
              "Task views work best when linked to goals, meetings, and decisions instead of standing alone.",
            ],
          },
          {
            heading: "How to use them well",
            bullets: [
              "Create templates for repeatable work that should follow the same structure every time.",
              "Use task linking to preserve the context behind what needs to happen next.",
              "Keep template sprawl under control by only standardizing patterns that truly repeat.",
            ],
          },
        ],
      },
      {
        id: "document-workspace",
        slug: "business/document-workspace",
        title: "Document Workspace",
        summary: "Use the documents library and document detail workspace to keep durable written context connected to active operations.",
        readTime: "5 min",
        audience: "All users",
        routes: ["/business/documents", "/business/documents/:id"],
        sections: [
          {
            heading: "What the document surfaces cover",
            bullets: [
              "Document library browsing, creation, and search.",
              "Document detail reading, comments, snapshots, and linked context.",
              "A calmer written-work surface that supports both live collaboration and long-term memory.",
            ],
          },
          {
            heading: "When to use document detail",
            bullets: [
              "When a document needs review history, comments, or evidence of how it changed.",
              "When written context needs to stay close to decisions, meetings, or projects.",
              "When teams need more than a loose file repository or disconnected note.",
            ],
          },
        ],
      },
      {
        id: "team-invitations",
        slug: "admin/team-and-invitations",
        title: "Team Management and Invitations",
        summary: "Manage workspace membership, invite teammates, and keep role ownership clear as the organization grows.",
        readTime: "4 min",
        audience: "Admins and managers",
        routes: ["/team", "/invitations"],
        sections: [
          {
            heading: "What these pages handle",
            bullets: [
              "Team membership visibility, role review, and workspace invitation flows.",
              "A controlled way to bring people into the workspace without ad hoc access sprawl.",
              "The operational side of scaling a Knoledgr workspace responsibly.",
            ],
          },
          {
            heading: "Recommended admin habits",
            bullets: [
              "Keep admin rights narrow and intentional.",
              "Review invitations and team composition periodically, especially during growth.",
              "Use role assignment to match actual operational responsibility, not org-chart prestige alone.",
            ],
          },
        ],
      },
      {
        id: "settings-security-tools",
        slug: "admin/settings-security-and-admin-tools",
        title: "Settings, Security, and Admin Tools",
        summary: "Use the admin toolset for workspace configuration, security review, API access, auditability, and data movement.",
        readTime: "5 min",
        audience: "Admins, security leads",
        routes: ["/settings", "/security", "/api-keys", "/audit-logs", "/export", "/import-export"],
        sections: [
          {
            heading: "What these admin surfaces include",
            bullets: [
              "Workspace settings, security controls, API key management, audit logs, and export/import workflows.",
              "A way to manage governance and integration readiness without leaving the product shell.",
              "Operational tools that become more important as workspace complexity increases.",
            ],
          },
          {
            heading: "How to use them responsibly",
            bullets: [
              "Treat API keys and export tools as sensitive administrative capabilities.",
              "Use audit logs to understand change behavior, not just for incident response.",
              "Review security settings before broadening integrations or admin access.",
            ],
          },
        ],
      },
      {
        id: "integrations-automation-reports",
        slug: "admin/integrations-automation-and-reports",
        title: "Integrations, Automation, and Reports",
        summary: "Configure external connections, workflow automation, and reporting views that support more mature operating models.",
        readTime: "5 min",
        audience: "Admins, operators, platform teams",
        routes: ["/integrations", "/automation", "/reports"],
        sections: [
          {
            heading: "What these features cover",
            bullets: [
              "Integration management for external system connectivity.",
              "Automation rules for repeatable workflow behaviors and operational triggers.",
              "Reporting views for cross-workspace or admin-level visibility.",
            ],
          },
          {
            heading: "Recommended approach",
            bullets: [
              "Stabilize your core process before automating noisy or unclear workflows.",
              "Use reports to explain patterns and risk, not just to broadcast output counts.",
              "Document integration intent so future admins understand why each connection exists.",
            ],
          },
        ],
      },
      {
        id: "subscription-enterprise",
        slug: "admin/subscription-and-enterprise",
        title: "Subscription and Enterprise Console",
        summary: "Manage pricing, plan fit, seats, governance extensions, and enterprise operating controls from the admin layer.",
        readTime: "5 min",
        audience: "Admins, finance owners, enterprise leads",
        routes: ["/subscription", "/enterprise"],
        sections: [
          {
            heading: "What these surfaces handle",
            bullets: [
              "Plan selection, upgrade pathways, and usage or seat-related guidance.",
              "Enterprise controls for identity, compliance, marketplace apps, training, incidents, and escalations.",
              "The highest-control operating surface inside Knoledgr.",
            ],
          },
          {
            heading: "How to use them well",
            bullets: [
              "Match plan upgrades to real usage pressure, not just future speculation.",
              "Use the enterprise console when governance, auditability, or incident response needs become real.",
              "Keep enterprise policy, partner guidance, and admin ownership aligned as controls expand.",
            ],
          },
        ],
      },
    ],
  },
];
