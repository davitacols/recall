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
        workflow: {
          eyebrow: "Operator workflow",
          title: "How teams use the decision detail page in practice",
          description: "Decision detail works best when it becomes the operating record after a choice is made, not just the place where approval happened.",
          steps: [
            {
              title: "Open the decision and read the briefing",
              detail: "Start with the core rationale, confidence, impact level, and linked conversation or context before changing anything else.",
            },
            {
              title: "Review intelligence around the decision",
              detail: "Use impact trail and drift alert data to understand how the decision is affecting downstream work.",
            },
            {
              title: "Record the outcome honestly",
              detail: "If the decision has been implemented, complete outcome review with structured metrics and lessons learned.",
            },
            {
              title: "Run replay and create safeguards",
              detail: "Replay simulation helps the team test alternate framing, then create follow-up tasks if the learning needs operational action.",
            },
          ],
        },
        visual: {
          eyebrow: "Detail map",
          title: "Decision detail balances context, analysis, and action",
          caption: "The page is intentionally split between the narrative record of the decision and the operational controls that help teams learn from it later.",
          panels: [
            {
              title: "Briefing",
              value: "Summary, rationale, and status",
              helper: "The masthead keeps the original decision framing visible before the user drills into outcome or replay tabs.",
              emphasis: true,
            },
            {
              title: "Context rail",
              value: "Linked conversations, work, and documents",
              helper: "Use linked context to see the records that influenced or were influenced by the decision.",
            },
            {
              title: "Outcome review",
              value: "Success, confidence, and lessons",
              helper: "Outcome review formalizes what teams usually leave buried in follow-up meetings or private retrospectives.",
            },
            {
              title: "Replay",
              value: "Counterfactual safeguards",
              helper: "Replay turns hindsight into structured scenarios and recommended follow-up tasks.",
            },
          ],
        },
        examplesEyebrow: "Detail page APIs",
        examplesTitle: "Decision detail implementation examples",
        examplesDescription: "These examples reflect the current interactions available directly from the decision detail view.",
        examples: [
          {
            title: "Load impact trail for a decision",
            method: "GET",
            endpoint: "/api/decisions/:decisionId/impact-trail/?depth=2",
            description: "The page loads impact trail data alongside drift alerts to show how a decision is affecting the surrounding graph.",
            response: {
              nodes: [
                { id: "decision-42", type: "decision", title: "Adopt staged rollout" },
                { id: "issue-118", type: "issue", title: "Billing migration rollout checklist" },
              ],
              edges: [
                { source: "decision-42", target: "issue-118", type: "implements" },
              ],
            },
          },
          {
            title: "Link a pull request to a decision",
            method: "POST",
            endpoint: "/api/decisions/:decisionId/link-pr/",
            description: "Link pull requests when code delivery should stay attached to the decision record.",
            request: {
              pr_url: "https://github.com/knoledgr/product/pull/148",
            },
            response: {
              message: "PR linked",
            },
          },
          {
            title: "Create follow-up tasks from replay safeguards",
            method: "POST",
            endpoint: "/api/decisions/:decisionId/replay-simulator/create-follow-up/",
            description: "After replay returns safeguards, the UI can turn them into task records without leaving the page.",
            request: {
              safeguards: ["Add a rollback checklist", "Require daily telemetry review"],
              scenario_title: "Delay the rollout by one sprint",
            },
            response: {
              created_count: 2,
            },
          },
        ],
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
        workflow: {
          eyebrow: "Project workflow",
          title: "How a project moves from workspace creation to active delivery",
          description: "Projects in Knoledgr are meant to be living execution containers, not static portfolio rows. The project list, detail page, backlog, boards, and sprint routes all build on the same project record.",
          steps: [
            {
              title: "Create the project workspace",
              detail: "Start with a clear project name and short brief so the project opens with usable context instead of becoming another empty tracking shell.",
            },
            {
              title: "Open the project control room",
              detail: "Use project detail to review sprints, issue stream, roadmap links, and team context from one place.",
            },
            {
              title: "Add sprint and issue structure",
              detail: "Create sprints and issues directly from the project page so the delivery system inherits the right board and project ownership automatically.",
            },
            {
              title: "Move into specialized routes",
              detail: "Use backlog, releases, board views, and sprint detail routes when the team needs deeper planning or active execution control.",
            },
          ],
        },
        visual: {
          eyebrow: "Surface map",
          title: "Projects connect planning, sprint cadence, and issue flow",
          caption: "The project area is intentionally split between overview, active detail, and deeper routes so teams can start broad and drill down without losing context.",
          panels: [
            {
              title: "Projects list",
              value: "Workspace inventory and readiness",
              helper: "The list shows how many project workspaces exist, which ones have leads, and which have documented briefs.",
              emphasis: true,
            },
            {
              title: "Project detail",
              value: "Sprints, issues, and roadmap links",
              helper: "The project detail page acts as the front door into active sprint work, issue creation, and roadmap-adjacent routes.",
            },
            {
              title: "Sprint timeline",
              value: "Cadence and active delivery",
              helper: "Sprint creation and timeline review happen inside the project, not in a disconnected planning tool.",
            },
            {
              title: "Execution routes",
              value: "Backlog, releases, and boards",
              helper: "Once the project is alive, teams move into backlog, board, and sprint surfaces without losing project framing.",
            },
          ],
        },
        examplesEyebrow: "Project APIs",
        examplesTitle: "Project and planning API examples",
        examplesDescription: "These examples reflect the list and detail flows used by the current project pages.",
        examples: [
          {
            title: "Create a project",
            method: "POST",
            endpoint: "/api/agile/projects/",
            description: "Creating a project generates the project record and a default board behind the scenes.",
            request: {
              name: "Justice App",
              description: "Delivery workspace for the Justice App rollout and maintenance stream.",
            },
            response: {
              id: 14,
              name: "Justice App",
              key: "JA",
              board_id: 31,
            },
          },
          {
            title: "Create a sprint inside a project",
            method: "POST",
            endpoint: "/api/agile/projects/:projectId/sprints/",
            description: "Project detail uses this endpoint when the team creates a sprint from the project workspace.",
            request: {
              name: "Talking Stage Sprint",
              start_date: "2026-03-17",
              end_date: "2026-03-31",
              goal: "Stabilize onboarding conversations and unblock review flow.",
            },
            response: {
              id: 22,
              name: "Talking Stage Sprint",
              status: "planned",
              project_id: 14,
            },
          },
          {
            title: "Create an issue from project detail",
            method: "POST",
            endpoint: "/api/agile/projects/:projectId/issues/",
            description: "Issues created from the project page inherit the project's board and initial workflow column.",
            request: {
              title: "Add reminder handling for onboarding callbacks",
              description: "Support reminder follow-up for the talking stage workflow.",
              priority: "high",
              sprint_id: 22,
              assignee_id: 7,
            },
            response: {
              id: 118,
              key: "JA-118",
              title: "Add reminder handling for onboarding callbacks",
              status: "todo",
              priority: "high",
            },
          },
        ],
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
        workflow: {
          eyebrow: "Admin workflow",
          title: "How admins move from plan fit to enterprise control",
          description: "Subscription and Enterprise are separate surfaces, but they work best as one administrative workflow: understand plan pressure first, then expand governance only where the operating model needs it.",
          steps: [
            {
              title: "Review plan fit and seat pressure",
              detail: "Use subscription details, invoices, usage, and conversion signals to see whether the current plan still fits the workspace.",
            },
            {
              title: "Upgrade only when real limits appear",
              detail: "Seats, storage, enterprise features, or billing maturity should trigger upgrades, not vague future intent.",
            },
            {
              title: "Open the enterprise console",
              detail: "When the organization needs stronger identity, compliance, marketplace, incident, or SLA controls, move into the enterprise page.",
            },
            {
              title: "Keep governance tied to active work",
              detail: "Enterprise controls matter most when they stay connected to projects, incidents, partner rollouts, and admin ownership.",
            },
          ],
        },
        visual: {
          eyebrow: "Admin map",
          title: "Subscription and enterprise form one control plane",
          caption: "Pricing, seats, billing, governance, and incident response are separate concerns, but Knoledgr keeps them close enough that admins can reason across them in one operating flow.",
          panels: [
            {
              title: "Subscription",
              value: "Plan, billing, and usage",
              helper: "Use the subscription surface to understand current plan details, invoice history, and upgrade pressure.",
              emphasis: true,
            },
            {
              title: "Conversion signals",
              value: "Activation and upgrade readiness",
              helper: "Conversion insights show whether the workspace has reached the milestone depth that makes a plan upgrade worth it.",
            },
            {
              title: "Enterprise controls",
              value: "Identity, compliance, and marketplace",
              helper: "Enterprise extends the admin model when identity, auditability, or rollout governance becomes operationally important.",
            },
            {
              title: "Incident and SLA response",
              value: "Automation and escalation",
              helper: "Enterprise incident automation keeps governance tied to live execution risk instead of static policy only.",
            },
          ],
        },
        examplesEyebrow: "Admin APIs",
        examplesTitle: "Subscription and enterprise API examples",
        examplesDescription: "These examples reflect the current billing and enterprise console flows used by admins in the app.",
        examples: [
          {
            title: "Read current subscription state",
            method: "GET",
            endpoint: "/api/organizations/subscription/",
            description: "The subscription page loads plan details, seat summary, storage usage, and billing capabilities.",
            response: {
              id: 3,
              plan: {
                name: "professional",
                display_name: "Professional",
                max_users: 25,
                storage_gb: 250,
              },
              status: "active",
              user_count: 11,
              storage_used_mb: 981,
              seat_summary: {
                active_users: 11,
                can_add_user: true,
              },
              billing: {
                provider: "stripe",
                portal_enabled: true,
              },
            },
          },
          {
            title: "Upgrade the current plan",
            method: "POST",
            endpoint: "/api/organizations/subscription/upgrade/",
            description: "Admins can move the organization onto a new plan directly from the subscription surface.",
            request: {
              plan_id: 2,
            },
            response: {
              message: "Plan upgraded successfully",
              plan: "professional",
            },
          },
          {
            title: "Create a checkout session for a paid plan",
            method: "POST",
            endpoint: "/api/organizations/stripe/checkout/",
            description: "The upgrade flow can hand off to Stripe checkout when a paid plan needs a billing session.",
            request: {
              plan_name: "enterprise",
              success_url: "https://knoledgr.com/subscription?checkout=success",
              cancel_url: "https://knoledgr.com/subscription?checkout=cancelled",
            },
            response: {
              checkout_url: "https://checkout.stripe.com/c/pay/example",
            },
          },
        ],
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
