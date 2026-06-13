import { DOCUMENTATION_FEATURE_GROUPS } from "./documentationFeaturePages";

const BASE_DOCUMENTATION_GROUPS = [
  {
    id: "getting-started",
    title: "Getting Started",
    pages: [
      {
        id: "overview",
        slug: "getting-started/overview",
        title: "What is Knoledgr",
        summary: "The two-minute version: what Knoledgr does, who it's for, and the four things you'll actually use.",
        readTime: "3 min",
        audience: "Everyone",
        sections: [
          {
            heading: "The short version",
            paragraphs: [
              "Knoledgr is where your team keeps decisions, conversations, meeting notes, and documents linked together. Six months from now, when someone asks \"why did we pick Postgres?\", the answer is one search away — with the original discussion, the rationale, and what happened after.",
              "It's a workspace, not a wiki. Pages get rewritten and forgotten. Knoledgr is built around the events that matter: a thread that turned into a decision, a decision that turned into work, work that turned into a lesson.",
            ],
          },
          {
            heading: "The four surfaces you'll use",
            bullets: [
              "Conversations — open threads, questions, proposals, and meeting capture. Where the team thinks out loud.",
              "Decisions — once the team commits, the rationale and alternatives get pinned here with the people who decided.",
              "Documents — specs, briefs, playbooks. Reference material that points to the decisions behind it.",
              "Projects, issues, sprints — the execution side. Every piece links back to the decision that drove it.",
            ],
          },
          {
            heading: "What makes it different",
            bullets: [
              "Ask Recall answers in plain English with sources attached — no hunting through old threads.",
              "Decisions ship with a prediction, so you can check later whether the choice actually worked.",
              "Everything is connected by default. You don't tag anything — Knoledgr links it as you write.",
            ],
          },
          {
            heading: "Who it's for",
            paragraphs: [
              "Teams between 10 and 200 people that ship real work, make consequential choices, and lose context every time someone leaves. If you've ever rewritten the same decision twice because nobody could find the original, this is for you.",
            ],
          },
        ],
      },
      {
        id: "workspace-setup",
        slug: "getting-started/workspace-setup",
        title: "Set up your workspace",
        summary: "Get a working workspace in about ten minutes. Skip the planning theater — start with one team and one type of work.",
        readTime: "4 min",
        audience: "Workspace admins",
        sections: [
          {
            heading: "Before you invite anyone",
            paragraphs: [
              "Start narrow. Pick one team that already makes real decisions — usually engineering, product, or ops — and one kind of work where the why gets lost: tech choices, vendor selections, scope changes. You can always widen later. You can't easily walk back \"everyone, start using this.\"",
            ],
          },
          {
            heading: "Step 1 — Name the workspace",
            paragraphs: [
              "Use your company name plus the team if you'll have more than one workspace later (\"Acme — Platform\"). The workspace name shows up in invites, email subjects, and the top-left of every page.",
            ],
          },
          {
            heading: "Step 2 — Invite the first three people",
            bullets: [
              "Yourself and the team lead — both as admins.",
              "One person who's good at writing things down. They'll set the bar for everyone else.",
              "Don't invite the whole team yet. Three people for the first week is enough to find the friction before you scale.",
            ],
          },
          {
            heading: "Step 3 — Seed two real things",
            bullets: [
              "One decision you've already made — write it down as if you were making it today. Include alternatives and what you actually picked.",
              "One conversation thread for a real open question. Use it instead of Slack for the next two days.",
            ],
            paragraphs: [
              "Don't seed test data. Real content makes Ask Recall useful immediately and shows the team what \"good\" looks like.",
            ],
          },
          {
            heading: "Skip these on day one",
            bullets: [
              "Integrations. Connect Slack/GitHub/Jira after the basic loop works.",
              "Custom roles and permission tiers. Default admin + member is fine for a 3-person pilot.",
              "Naming conventions documents. Establish them by example, not by rule.",
            ],
          },
        ],
      },
      {
        id: "first-rollout",
        slug: "getting-started/first-rollout",
        title: "Roll it out to the team",
        summary: "Take a working pilot and expand to the rest of the team without it dying in week three.",
        readTime: "5 min",
        audience: "Team leads, rollout owners",
        sections: [
          {
            heading: "Roll out around one upcoming decision",
            paragraphs: [
              "The fastest way to make Knoledgr stick: pick an upcoming decision your team has to make anyway — a vendor pick, a scope cut, an architecture call — and require that it goes through Knoledgr. Not as an archive after the fact. As the place the decision actually happens.",
              "This works because the team gets a visible win (\"we used the new system and it worked\") instead of a maintenance burden (\"we have to copy everything over now\").",
            ],
          },
          {
            heading: "Week 1 — Pick the decision, set the expectation",
            bullets: [
              "Announce in the team's normal channel: \"For the X decision this month, the discussion, alternatives, and final call live in Knoledgr.\"",
              "Open the conversation thread yourself. First post should frame the question and link any relevant background.",
              "When someone replies in Slack instead, gently redirect: \"Can you drop this in the thread? I want to make sure it's findable later.\"",
            ],
          },
          {
            heading: "Week 2 — Close the loop visibly",
            bullets: [
              "When the decision is made, promote the thread to a formal decision record. Use the \"Convert to decision\" button on the conversation.",
              "Log a prediction with the decision — what you expect to happen, by when. Even a rough one is better than none.",
              "Link the resulting work (tickets, PRs, docs) back to the decision. This is the moment context starts to compound.",
            ],
          },
          {
            heading: "Week 3 — Use Ask Recall in a meeting",
            paragraphs: [
              "Next time someone asks \"wait, why did we decide X?\", open Ask Recall in front of the room and answer it in fifteen seconds. This single moment converts more skeptics than any rollout deck.",
            ],
          },
          {
            heading: "How to tell it's working",
            bullets: [
              "People stop asking \"where do we put this?\" — they just open Knoledgr.",
              "Newer teammates ramp on context without 1:1 catch-ups.",
              "When you revisit an old decision, the rationale is still readable six months later.",
            ],
          },
          {
            heading: "Common ways it dies",
            bullets: [
              "Treating it as documentation, not a decision tool. If it's just a place to file things after, nobody opens it.",
              "Letting Slack stay the source of truth. The redirect step in week one is the most important habit.",
              "Skipping predictions. Without them, decisions don't compound into lessons — they just become a list.",
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
        summary: "Open threads for questions, proposals, and meeting notes — the place your team thinks before it decides.",
        readTime: "4 min",
        audience: "Everyone",
        routes: ["/conversations", "/conversations/new", "/conversations/:id"],
        sections: [
          {
            heading: "What a conversation is for",
            paragraphs: [
              "Conversations are where work starts as a question and ends as a decision (or a decision not to decide). They're not chat — they're persistent, threaded, and searchable. Think of them as the lighter weight cousin of a decision: not yet committed, but worth remembering.",
            ],
            bullets: [
              "A question with no obvious answer (\"Should we move billing to Stripe?\")",
              "A proposal that needs review (\"Here's how I want to restructure the auth flow.\")",
              "Meeting notes that capture what was discussed and what's still open.",
              "An update the team should see but doesn't need to act on yet.",
            ],
          },
          {
            heading: "The pipeline view",
            paragraphs: [
              "The Conversations page groups threads by what they need from you, not by recency. The buckets are:",
            ],
            bullets: [
              "Awaiting you — threads where you're the owner or were mentioned and someone's waiting.",
              "Urgent — flagged as urgent or crisis-tagged. Eat the oxygen until resolved.",
              "Ready to decide — proposals with momentum. One click from becoming a decision.",
              "Needs follow-up — promises made, not yet kept.",
              "In progress — active threads moving this week.",
              "Stalled — open but quiet for over a week. Revisit or close.",
              "Recently harvested — resolved threads whose takeaways are now part of the workspace's memory.",
            ],
          },
          {
            heading: "Starting a good conversation",
            bullets: [
              "Title it like a question or a claim, not a topic. \"Move billing to Stripe?\" beats \"Billing.\"",
              "First post: state the question, what you know, what you don't, what would help.",
              "Tag the people you actually need from. Tagging the whole team is the same as tagging nobody.",
              "Pick the right post type — discussion, question, proposal, update. It changes the icon and how it's bucketed.",
            ],
          },
          {
            heading: "Turning a conversation into a decision",
            paragraphs: [
              "When the team has agreed (or you've made the call), open the thread and click \"Convert to decision.\" Knoledgr drafts a decision record from the thread — title, summary, alternatives discussed, owner — and you fill in the rationale and prediction.",
              "The original thread stays linked. Six months later, someone reading the decision can click back to the conversation that produced it.",
            ],
          },
          {
            heading: "When not to use a conversation",
            bullets: [
              "Real-time pings or pure social chat — Slack is still better at that.",
              "Long-lived reference material — that's a document.",
              "An already-made decision — go straight to a decision record.",
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
            heading: "What goes in a decision",
            paragraphs: [
              "A good decision record has five things. If any of them are missing, you'll regret it later.",
            ],
            bullets: [
              "The question — what were you actually choosing between?",
              "What you picked, and the rationale in two or three sentences.",
              "Alternatives considered and why they lost. Not just the runner-up — the rejected options matter.",
              "A prediction. What do you expect to happen, by when, measured how? \"We'll cut latency by 30% within four weeks\" is good. \"It'll be better\" is not.",
              "Owner — who's on the hook for making it happen and reviewing the outcome.",
            ],
          },
          {
            heading: "Decisions vs proposals",
            paragraphs: [
              "Proposals are decisions-in-waiting. Use one when you want explicit review before commitment — when the team is bigger than three, when the impact is wide, or when you want a paper trail of the approval.",
              "Most everyday decisions skip the proposal step. Write the decision, mark it approved, move on. The proposal queue is for the choices that warrant ceremony.",
            ],
          },
          {
            heading: "The prediction is the whole point",
            paragraphs: [
              "Without a prediction, a decision is just an opinion that got typed up. The prediction is what lets Knoledgr come back to you in six weeks and say \"you said latency would drop 30% — what actually happened?\"",
              "Predictions don't have to be precise. Three useful shapes:",
            ],
            bullets: [
              "A number with a target (\"weekly active users above 5,000 by end of Q2\").",
              "A yes/no with a deadline (\"the migration finishes before Aug 1, no rollback needed\").",
              "A qualitative outcome with a check-at date (\"team morale improves — survey in 60 days\").",
            ],
          },
          {
            heading: "After it's implemented",
            paragraphs: [
              "When the work ships, come back to the decision and run an outcome review. It takes about two minutes: was it successful (yes/no/mixed), what's the score (1–5), what did you learn?",
              "The point isn't a grade. It's that the lesson gets stored next to the decision, so the next time someone considers a similar choice, the Before You Decide panel surfaces it — \"hey, you tried something like this; here's how it went.\"",
            ],
          },
          {
            heading: "Where to go deeper",
            paragraphs: [
              "This page covers the everyday decision flow. For the mechanics behind drift, retros, predictions, and the Before You Decide panel:",
            ],
            bullets: [
              "intelligence/decision-loop — the full draft → predict → check → retro → learn cycle.",
              "intelligence/predictions-and-drift — how drift is calculated and the on-track / drifting / off-track bands.",
              "intelligence/retrospectives-and-lessons — how lessons get pulled forward into future decisions.",
              "intelligence/before-you-decide — what the panel checks while you type, and why.",
              "intelligence/autonomous-agent — running long-form analyses across your decision history.",
            ],
          },
        ],
      },
      {
        id: "documents",
        slug: "workflows/documents",
        title: "Documents",
        summary: "Specs, briefs, playbooks. Reference material that stays linked to the decisions and work it describes.",
        readTime: "3 min",
        audience: "Everyone",
        routes: ["/business/documents", "/business/documents/:id"],
        sections: [
          {
            heading: "When to write a document instead of a conversation",
            paragraphs: [
              "Use a document when the content needs to outlive the discussion. A conversation is volatile — it's where you think. A document is durable — it's where you record what's true.",
            ],
            bullets: [
              "A spec for something being built.",
              "An onboarding playbook for a recurring process.",
              "A briefing that gets shared across teams or with new hires.",
              "Architecture notes that need to stay current as the system evolves.",
            ],
          },
          {
            heading: "Link aggressively",
            paragraphs: [
              "A document on its own is just a page. A document linked to the three decisions that shaped it and the six tickets that implemented it is a piece of context. The links are what make documents searchable later and what make Ask Recall trust them as sources.",
            ],
            bullets: [
              "Use @-mention to link decisions, conversations, people, and other documents inline.",
              "When you write \"per DEC-128…\", make the reference a real link. Future readers can click through.",
              "If a decision changes the document's recommendations, link the new decision and add a date.",
            ],
          },
          {
            heading: "Keeping documents from rotting",
            bullets: [
              "If a decision invalidates part of the document, update the document. Don't write a new one.",
              "If the whole document is stale, archive it and link the replacement. Don't leave wrong information searchable.",
              "Use the \"last reviewed\" stamp at the top of long-lived documents. A reader needs to know if they're reading something from last month or last year.",
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
            heading: "What Ask Recall is good at",
            paragraphs: [
              "Ask Recall answers questions about your workspace using your workspace as the source. It's not a chatbot reaching for the open web — every answer is built from your team's conversations, decisions, documents, projects, and meetings, with the sources cited.",
            ],
            bullets: [
              "\"Why did we decide to use Postgres?\" — pulls the decision record and the discussion that produced it.",
              "\"What's blocking the Q3 rollout?\" — pulls open issues, recent blockers, and their owners.",
              "\"Summarize last week's product meetings.\" — reads the meeting threads and gives you the actual outcomes.",
              "\"Who knows about our auth setup?\" — finds the people who've written about it, decided on it, or owned it.",
            ],
          },
          {
            heading: "How to ask a question it can answer",
            paragraphs: [
              "Plain English works. But specific is better than general. Three rules:",
            ],
            bullets: [
              "Use names you'd recognize on the surface — project names, sprint names, decision titles, people. Ask Recall anchors retrieval on those terms.",
              "Ask one question per prompt. \"Why did we pick X, and what should we do about Y?\" gets a worse answer than two separate prompts.",
              "Ask about specific time windows when it matters. \"What changed in the billing project last month?\" beats \"What's happening with billing?\"",
            ],
          },
          {
            heading: "The three modes",
            paragraphs: [
              "Same question, different shape of answer. Switch with the mode selector under the prompt:",
            ],
            bullets: [
              "Ground (default) — answer with citations. Use this when you want to know what's true.",
              "Draft — write a polished version of the answer. Use this for status updates, summaries, or emails you're about to send.",
              "Plan — propose next steps with owners. Use this when the question is \"what should we do?\"",
            ],
          },
          {
            heading: "Reading the answer",
            paragraphs: [
              "Every answer comes with three signals you should glance at before acting:",
            ],
            bullets: [
              "Confidence — high / medium / low. Low confidence usually means thin evidence, not a wrong answer.",
              "Evidence count — how many workspace records the answer is built from. One source is a starting point, six is a real answer.",
              "Coverage — whether the workspace had enough material to answer the question at all. Low coverage is a documentation gap, not an Ask Recall bug.",
            ],
          },
          {
            heading: "What it can't do",
            bullets: [
              "Make stuff up confidently. If there's no evidence in your workspace, the answer will say so instead of guessing.",
              "Answer about things outside your workspace. It doesn't know your industry, your competitors, or the public web.",
              "Take actions on its own. Suggested actions on Plan-mode answers require explicit confirmation before anything runs.",
            ],
          },
          {
            heading: "When something feels off",
            bullets: [
              "If the model is slow or unreachable, the answer falls back to the rules engine instead of hanging.",
              "If the answer cites the wrong sources, use the thumbs-down with a one-line note — that feedback shapes future retrieval.",
              "If you keep getting low coverage on a topic, that's a signal to write the document, not to ask differently.",
            ],
          },
        ],
      },
      {
        id: "knowledge-graph",
        slug: "intelligence/knowledge-graph",
        title: "Knowledge Graph",
        summary: "See how your decisions, conversations, documents, and people are connected. Use it when you want the shape of the context, not a single answer.",
        readTime: "4 min",
        audience: "Leads, researchers, anyone investigating",
        routes: ["/knowledge/graph"],
        sections: [
          {
            heading: "What you can do with the graph",
            paragraphs: [
              "Ask Recall gives you an answer. The graph gives you the territory. Use it when you want to understand how a decision connects to the work it spawned, who's involved across a project, or which areas of the workspace are well-connected versus orphaned.",
            ],
            bullets: [
              "Start from a decision and trace forward to every linked conversation, document, and ticket.",
              "Start from a person and see what they've decided, written, and owned.",
              "Spot orphans — decisions with no linked work, documents nobody references. Usually a sign something is stale or never got followed through.",
            ],
          },
          {
            heading: "Reading what you see",
            bullets: [
              "Nodes are entities: decisions, conversations, documents, people, projects.",
              "Edges are real links — created by @-mentions, by the Convert-to-decision flow, by linking tickets to decisions. Knoledgr doesn't infer connections it can't show you the source of.",
              "Cluster density matters. A tight cluster around a decision means the team kept the context attached. A lonely node means the decision happened in isolation and probably can't be reconstructed later.",
            ],
          },
          {
            heading: "Missing links are a signal",
            paragraphs: [
              "If the graph shows a decision floating alone, that's not a graph bug — it's an information bug in your workspace. The fix is to go link the work it produced (or admit the decision never went anywhere).",
              "Use this to find the parts of your workspace that are quietly losing context, then go fix them.",
            ],
          },
        ],
      },
      {
        id: "decision-loop",
        slug: "intelligence/decision-loop",
        title: "The Decision Intelligence Loop",
        summary: "Every Knoledgr decision is a contract with reality. Predictions are logged at decision time, reality is observed, drift is computed, and retrospectives auto-open when the gap is large enough to learn from.",
        readTime: "7 min",
        audience: "CTOs, engineering leads, product leadership",
        routes: ["/decisions/intelligence", "/decisions/:id"],
        workflow: {
          eyebrow: "Closed loop",
          title: "The six stages of the loop",
          description: "This is the moat. Every other primitive in Knoledgr exists either to feed this loop or act on its output.",
          steps: [
            {
              title: "Draft",
              detail: "On every keystroke of a new decision, the workspace searches past decisions for similar ones and surfaces them in the Before-You-Decide panel.",
            },
            {
              title: "Predict",
              detail: "The author logs one or more predictions: dimension, statement, metric kind (number/percent/binary/text), target value, and check-at date.",
            },
            {
              title: "Observe",
              detail: "When the check-at date arrives, anyone with the right permission posts an outcome check with the observed value.",
            },
            {
              title: "Classify",
              detail: "Knoledgr computes signed drift % from target and classifies it into a band: on_track, drifting, off_track, or exceeded.",
            },
            {
              title: "Retro",
              detail: "Off-track checks auto-open a DecisionRetrospective tied to the check. The team fills in summary, root cause, and lesson.",
            },
            {
              title: "Surface",
              detail: "The lesson feeds back into the Before-You-Decide search index. The next decision that touches the same area sees it inline.",
            },
          ],
        },
        sections: [
          {
            heading: "Why the loop matters",
            paragraphs: [
              "Teams make 30 decisions a week. In a year that's 1,500 decisions, of which a team remembers maybe 50. Without a loop, the team makes the same mistakes twice and loses days relitigating them. The loop converts ephemeral team memory into a durable, queryable record of what was predicted, what happened, and what was learned.",
              "Crucially, the loop closes automatically. The team doesn't have to remember to learn from a missed prediction — when drift exceeds the threshold, Knoledgr opens the retrospective on its own and adds it to the *Awaiting you* bucket in the relevant owner's pipeline.",
            ],
          },
          {
            heading: "What a good first prediction looks like",
            bullets: [
              "Specific: \"60% of teams will use LaunchDarkly within 6 weeks\" (not \"adoption will be high\").",
              "Numeric: a value with a unit. Binary (yes/no) and text are supported but harder to check.",
              "Time-bounded: a check_at date that's actually in the future and realistic.",
              "Falsifiable: someone other than the author should be able to verify the observation.",
            ],
          },
          {
            heading: "Drift bands",
            bullets: [
              "on_track — within 15% of target (signed).",
              "drifting — between 15% and 50% off in either direction.",
              "off_track — more than 50% off target (or below target for cost/error metrics).",
              "exceeded — more than 50% above target on positive metrics like adoption or revenue.",
              "unknown — text/binary metrics where numeric drift can't be computed.",
            ],
          },
          {
            heading: "Decision lineage (informed_by)",
            paragraphs: [
              "Every decision can carry a list of past decisions whose lessons informed it. When a draft acknowledges a past retrospective from the Before-You-Decide panel, that decision id is persisted in informed_by_decisions on the new decision. This creates an auditable graph of how lessons propagate forward.",
              "The lineage is queryable: you can ask \"which decisions descend from the failed Q2 caching rollout?\" and get a real answer instead of a guess.",
            ],
          },
        ],
      },
      {
        id: "predictions-and-drift",
        slug: "intelligence/predictions-and-drift",
        title: "Predictions and Drift",
        summary: "The math behind drift bands, the data model for predictions, and the rules for when an outcome auto-opens a retrospective.",
        readTime: "5 min",
        audience: "Engineers, data leads, operators",
        routes: [
          "/api/decisions/:id/predictions/",
          "/api/decisions/predictions/:id/checks/",
          "/api/decisions/:id/drift/",
        ],
        examplesEyebrow: "Predictions API",
        examplesTitle: "Logging predictions and outcome checks",
        examples: [
          {
            title: "Log a prediction on a decision",
            method: "POST",
            endpoint: "/api/decisions/:decisionId/predictions/",
            description: "Predictions are the contract with reality. One decision can carry multiple predictions across different dimensions.",
            request: {
              dimension: "adoption",
              statement: "60% of teams will be using LaunchDarkly within 6 weeks",
              metric_kind: "percent",
              target_value: { value: 60 },
              baseline_value: { value: 12 },
              check_at: "2026-07-15",
            },
            response: {
              id: 318,
              decision_id: 42,
              dimension: "adoption",
              statement: "60% of teams will be using LaunchDarkly within 6 weeks",
              metric_kind: "percent",
              target_value: { value: 60 },
              check_at: "2026-07-15",
              created_at: "2026-06-03T14:22:10Z",
            },
          },
          {
            title: "Post an outcome check",
            method: "POST",
            endpoint: "/api/decisions/predictions/:predictionId/checks/",
            description: "Drift is computed automatically. If the band lands at off_track, a retrospective opens on its own and the id is returned inline.",
            request: {
              observed_value: { value: 10 },
              notes: "Slack export sampled on 2026-07-15. 8 of 80 teams active.",
            },
            response: {
              id: 612,
              prediction_id: 318,
              observed_value: { value: 10 },
              drift_pct: -83.33,
              drift_band: "off_track",
              auto_opened_retrospective_id: 47,
            },
          },
          {
            title: "Read the decision drift report",
            method: "GET",
            endpoint: "/api/decisions/:decisionId/drift/",
            description: "Aggregates the latest check on every prediction tied to the decision and returns a headline band (worst-case of off_track > drifting > on_track).",
            response: {
              decision_id: 42,
              title: "Adopt LaunchDarkly",
              status: "approved",
              headline_band: "off_track",
              predictions: [
                {
                  prediction_id: 318,
                  dimension: "adoption",
                  statement: "60% of teams will be using LaunchDarkly within 6 weeks",
                  check_at: "2026-07-15",
                  latest_check: {
                    observed_value: { value: 10 },
                    drift_pct: -83.33,
                    drift_band: "off_track",
                  },
                },
              ],
            },
          },
        ],
        sections: [
          {
            heading: "The drift formula",
            paragraphs: [
              "For numeric and percent metrics: drift_pct = ((observed - target) / |target|) * 100. The result is signed — a negative number means you came in below target, positive means above.",
              "The sign matters. For adoption or revenue, exceeded (over 50% above target) is good news; for cost or error rate, the same number is a fire. Knoledgr does not assume direction; the dimension name is yours to interpret.",
            ],
          },
          {
            heading: "Bands as policy, not just labels",
            bullets: [
              "The 15% and 50% thresholds are the defaults. You can override them per workspace in the intelligence settings — strict teams set the off_track band at 25%.",
              "When a band lands off_track, an outcome-logged webhook fires and a retrospective auto-opens — unless one already exists for that check.",
              "Repeat off-track observations on the same prediction do not duplicate retrospectives if one is already linked to that check. They do open new retros if a fresh check lands off-track.",
            ],
          },
          {
            heading: "Binary and text metrics",
            paragraphs: [
              "binary metrics check observed.value === target.value. They classify as on_track or off_track only — no drift_pct.",
              "text metrics never compute drift. They're useful for qualitative predictions like \"customer feedback will be positive\" but they don't trigger auto-retros. Treat them as documentation, not accountability.",
            ],
          },
        ],
      },
      {
        id: "retrospectives-and-lessons",
        slug: "intelligence/retrospectives-and-lessons",
        title: "Retrospectives and Lessons",
        summary: "Auto-opened retrospectives are the moment the loop closes. The lesson captured in one becomes the warning that prevents the next mistake.",
        readTime: "4 min",
        audience: "Tech leads, EMs, ops owners",
        routes: ["/decisions/:id", "/api/decisions/:id/retrospectives/"],
        examplesEyebrow: "Retrospectives API",
        examplesTitle: "Writing a retrospective",
        examples: [
          {
            title: "List retrospectives on a decision",
            method: "GET",
            endpoint: "/api/decisions/:decisionId/retrospectives/",
            description: "Returns every retrospective tied to the decision, manual or auto-opened.",
            response: {
              results: [
                {
                  id: 47,
                  decision_id: 42,
                  triggered_by: "drift",
                  triggered_by_check: 612,
                  summary: "Adoption stalled at 16%. Spec mismatch between flag service and team rollouts.",
                  root_cause: "We did not audit existing flag count before sizing the migration.",
                  lesson: "For any future migration, audit existing usage by team in the first sprint before committing a target adoption percent.",
                  confidence_delta: -25,
                  tags: ["migration", "discovery"],
                  closed_at: null,
                },
              ],
            },
          },
          {
            title: "Open a manual retrospective",
            method: "POST",
            endpoint: "/api/decisions/:decisionId/retrospectives/",
            description: "Authors can open a retro any time — not just when drift triggers it. Useful for milestone reviews or pre-mortems.",
            request: {
              triggered_by: "milestone",
              summary: "End-of-quarter review of the LaunchDarkly migration.",
              root_cause: "",
              lesson: "",
              tags: ["q3-review"],
            },
            response: {
              id: 51,
              triggered_by: "milestone",
              created_at: "2026-09-30T09:00:00Z",
            },
          },
        ],
        sections: [
          {
            heading: "The four fields that matter",
            bullets: [
              "summary — what happened, in one paragraph. Optional, but writing it forces clarity.",
              "root_cause — your honest answer for why the prediction missed. Vague root causes produce vague lessons.",
              "lesson — the one sentence that should reach the next person drafting a similar decision. This is the only field that compounds.",
              "confidence_delta — an integer between -100 and +100 representing how much this experience should shift your confidence in similar future decisions.",
            ],
          },
          {
            heading: "How lessons surface in future drafts",
            paragraphs: [
              "When someone opens a new decision draft, the Before-You-Decide panel runs a semantic similarity search over the workspace's decision corpus. Decisions whose retrospectives have a non-empty lesson field are weighted higher in the ranking — the platform treats a learned lesson as more valuable evidence than a plain decision record.",
              "Acknowledging a surfaced past decision (clicking it in the panel) persists the past decision id into the new decision's informed_by_decisions field. This is how lineage is built without imposing manual tagging discipline.",
            ],
          },
          {
            heading: "Closing a retrospective",
            paragraphs: [
              "A retrospective stays open until someone sets closed_at. Open retros appear in the owner's pipeline as *Awaiting you* items. Closing one signals \"we've learned what we can; the lesson is captured.\"",
              "Closing a retro does not remove it from search. Old lessons still surface on relevant future drafts.",
            ],
          },
        ],
      },
      {
        id: "before-you-decide",
        slug: "intelligence/before-you-decide",
        title: "Before You Decide",
        summary: "The panel that runs on every keystroke of a new decision draft and surfaces past decisions whose lessons should change the call you're about to make.",
        readTime: "3 min",
        audience: "All teams writing decisions",
        routes: ["/decisions/new", "/api/decisions/intelligence/similar/"],
        visual: {
          eyebrow: "Surface map",
          title: "What the panel shows",
          caption: "Up to five results, ranked by semantic similarity to the draft. Each result has the past decision's title, drift band, and the one-sentence lesson from any retrospective.",
          panels: [
            {
              title: "Search input",
              value: "Title + description",
              helper: "The draft form fires a debounced fetch on each keystroke after the title hits 12 characters.",
              emphasis: true,
            },
            {
              title: "Ranking signal",
              value: "Similarity × outcome weight",
              helper: "Decisions with retrospectives and lessons are scored higher than plain decision records.",
            },
            {
              title: "Drift indicator",
              value: "Color-coded band",
              helper: "Past decisions show the headline drift band from their predictions so the team can see which lessons are battle-tested.",
            },
            {
              title: "Acknowledgement",
              value: "informed_by_decisions",
              helper: "Clicking a past decision adds its id to the new draft's lineage when the decision is saved.",
            },
          ],
        },
        examplesEyebrow: "Similar decisions API",
        examplesTitle: "How the panel calls the backend",
        examples: [
          {
            title: "Search for similar past decisions",
            method: "POST",
            endpoint: "/api/decisions/intelligence/similar/",
            description: "Sent from the draft form on every debounced keystroke. The backend uses the same search engine that powers Ask Recall, scoped to the decision corpus.",
            request: {
              title: "Adopt LaunchDarkly for feature flags",
              description: "We need a centralized way to roll out features safely.",
              limit: 5,
            },
            response: {
              results: [
                {
                  id: 17,
                  title: "Adopt internal flag service",
                  outcome_label: "off_track",
                  summary: "Migration cost 3x estimate, sunset after 6 months.",
                  lesson: "Audit existing flag count by team before sizing the migration.",
                  similarity_score: 0.81,
                },
                {
                  id: 33,
                  title: "Move analytics to ClickHouse",
                  outcome_label: "on_track",
                  summary: "Adoption hit 78% within 4 weeks.",
                  similarity_score: 0.42,
                },
              ],
            },
          },
        ],
        sections: [
          {
            heading: "Why it runs on every keystroke",
            paragraphs: [
              "Surfacing the lesson after the decision is drafted is too late. The author has already committed cognitively to a direction. The panel runs on the *draft* surface — while the author is still open to new information — so the lesson lands at the moment it can still change the call.",
              "The fetch is debounced at 350ms and the in-flight request is cancelled if a newer keystroke fires. This keeps the panel responsive without thrashing the backend.",
            ],
          },
          {
            heading: "When the panel shows nothing",
            bullets: [
              "Title is under 12 characters — too short to compute meaningful similarity.",
              "No past decisions match above the relevance floor.",
              "On a fresh workspace with zero decisions, this is normal. The wedge compounds over months.",
            ],
          },
        ],
      },
      {
        id: "autonomous-agent",
        slug: "intelligence/autonomous-agent",
        title: "Autonomous Agent",
        summary: "A multi-step Claude tool-use agent with five specialist profiles and human approval gates on every write action. Different surface from Ask Recall: long-running, traceable, optionally autonomous.",
        readTime: "8 min",
        audience: "Admins, managers, power users",
        routes: ["/agent", "/agent/audit", "/api/knowledge/ai/agent/start/", "/ws/agent/runs/:id/"],
        workflow: {
          eyebrow: "Run lifecycle",
          title: "How an agent run unfolds",
          description: "An agent run is a finite-state machine with explicit human checkpoints. It can finish completely, pause for approval, or fail — never silently mutate state.",
          steps: [
            {
              title: "Goal + profile",
              detail: "Caller submits a goal and picks a profile (general, sprint-coach, decision-reviewer, doc-drafter, standup). The profile gates which tools the run can use.",
            },
            {
              title: "Tool-use loop",
              detail: "The agent calls read tools freely (search, fetch, summarize). Steps are recorded to the AgentStep table and pushed live to any open trace via WebSocket.",
            },
            {
              title: "Approval gate",
              detail: "If the model wants to call a write tool, the run pauses with status=awaiting_approval and the pending_tool_calls list. No write happens without a human approving from the agent panel.",
            },
            {
              title: "Resume or cancel",
              detail: "On approval, the writes execute and the loop resumes. On cancel, the run terminates and the audit log records who decided what.",
            },
            {
              title: "Completion",
              detail: "When the model emits a final answer, the run is marked completed and the final_answer is rendered as markdown in the trace.",
            },
          ],
        },
        visual: {
          eyebrow: "Specialist profiles",
          title: "Five built-in profiles, each scoped to a different operating context",
          panels: [
            {
              title: "general",
              value: "All tools, broadest scope",
              helper: "Default profile. Good when you don't know which lane the answer lives in.",
              emphasis: true,
            },
            {
              title: "sprint-coach",
              value: "Sprint + issue tools",
              helper: "Diagnoses sprint health, identifies stalls, recommends rebalances. Read-only by default.",
            },
            {
              title: "decision-reviewer",
              value: "Decision intelligence tools",
              helper: "Runs counterfactual analyses (twin runs) and reviews drift across the decision corpus.",
            },
            {
              title: "doc-drafter",
              value: "Conversations + documents",
              helper: "Drafts notes, status updates, retrospectives. Requires approval to publish.",
            },
            {
              title: "standup",
              value: "Activity + pipeline tools",
              helper: "Builds Friday-update style summaries. Output is markdown ready to paste into Slack.",
            },
          ],
        },
        examplesEyebrow: "Agent API",
        examplesTitle: "Starting and resuming a run",
        examples: [
          {
            title: "Start a new run",
            method: "POST",
            endpoint: "/api/knowledge/ai/agent/start/",
            description: "Kicks off a run. Returns the serialized run after the first batch of iterations. The run may be completed, awaiting_approval, or failed.",
            request: {
              goal: "Summarize this week's decisions and flag any with drifted predictions.",
              profile_slug: "decision-reviewer",
            },
            response: {
              id: 904,
              status: "completed",
              profile_slug: "decision-reviewer",
              iterations: 4,
              final_answer: "This week 6 decisions were approved. 1 is showing drift (#42, LaunchDarkly).",
            },
          },
          {
            title: "Approve pending write tools",
            method: "POST",
            endpoint: "/api/knowledge/ai/agent/runs/:runId/approve/",
            description: "When a run is awaiting_approval, this endpoint approves the listed tool calls and resumes the loop. Approving an empty array cancels the writes and resumes anyway.",
            request: {
              approved_tool_call_ids: ["tu_01", "tu_02"],
            },
            response: {
              id: 904,
              status: "running",
            },
          },
          {
            title: "Check workspace agent budget",
            method: "GET",
            endpoint: "/api/knowledge/ai/agent/budget/",
            description: "Per-org budget for agent runs and copilot calls. Returns the cap, the used count, and whether new runs are still allowed this month.",
            response: {
              run: { allowed: true, used: 47, limit: 200, remaining: 153 },
              copilot: { allowed: true, used: 1218, limit: 5000, remaining: 3782 },
            },
          },
        ],
        sections: [
          {
            heading: "Approval gates, not auto-execution",
            paragraphs: [
              "Every write tool in the registry is marked is_write=True. When the model wants to call one, the agent records the call in pending_tool_calls, returns a synthetic tool_result that says \"awaiting_human_approval\", and pauses the run. The model never observes the actual side-effect happening — it only sees the placeholder.",
              "This design is intentional. It means the model cannot use the result of a prior write to chain into another write. Every mutation requires a fresh, explicit human approval — which keeps autonomous-feeling runs safely audited.",
            ],
          },
          {
            heading: "Live trace over WebSocket",
            paragraphs: [
              "When the agent panel is open on a run, it connects to /ws/agent/runs/:runId/ and receives every step and status change as it happens. The connection is authenticated against the run's organization at connect time. Disconnection is graceful; polling resumes as a fallback.",
              "The push payload mirrors the AgentStep schema: { type: 'step', kind, payload, ts } for steps and { type: 'status', status, final_answer, pending_tool_calls } for lifecycle changes.",
            ],
          },
          {
            heading: "Budget controls",
            bullets: [
              "Per-org monthly cap for run starts and copilot calls.",
              "When the cap is hit, /api/knowledge/ai/agent/start/ returns 402 with a budget breakdown.",
              "Budget is enforced at start_run; in-flight runs always finish.",
              "The budget meter on the agent page reads from /api/knowledge/ai/agent/budget/ — show it to the team so they understand the constraint.",
            ],
          },
          {
            heading: "The audit page",
            paragraphs: [
              "Admins and managers can open /agent/audit to see every run in the workspace: who started it, with which profile, the final answer, and the list of pending or executed writes. Useful for compliance reviews and for spotting which profiles are doing the most useful work.",
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
        summary: "Where the work lives. Same ticketing flow you know — but every issue carries the decision and discussion that produced it.",
        readTime: "5 min",
        audience: "Product, engineering, operations",
        routes: ["/projects", "/projects/:id", "/business/tasks"],
        sections: [
          {
            heading: "Why issues live here instead of Jira",
            paragraphs: [
              "You can keep using Jira if you want — Knoledgr integrates with it. But for new projects, keeping the issues in Knoledgr means each one has the decision that created it, the conversation it came out of, and the document that spec'd it, all linked by default. The why isn't a separate system.",
              "If a teammate opens an issue and wonders \"what was the original thinking?\", they click the linked decision. They don't ping you.",
            ],
          },
          {
            heading: "Creating an issue from a decision",
            paragraphs: [
              "The fastest path: open the decision, click \"Create issue from this decision.\" The issue is pre-populated with the decision's title and links back automatically. The decision now shows the issue under \"Linked work\" — and as the issue progresses, the decision page reflects it.",
              "If the work is already underway, you can add the back-link from either side. The relationship is symmetric.",
            ],
          },
          {
            heading: "Good issue hygiene",
            bullets: [
              "Title the issue as the unit of work, not the symptom. \"Migrate billing to Stripe\" beats \"Stripe migration ticket.\"",
              "Link the decision that drove it. If there isn't one, you might be doing work without a documented choice.",
              "When you close the issue, mention how it went on the linked decision. That's how the loop closes.",
              "Use blockers as first-class records, not as Slack messages. Blockers show up in dashboards and trigger sprint risk signals.",
            ],
          },
          {
            heading: "Blockers are a signal, not a chore",
            paragraphs: [
              "When something is stuck, log it as a blocker on the issue. Yes, it's an extra click. But that blocker now appears in the sprint board, in the dashboard, and in any \"what's blocking us?\" question to Ask Recall. Untracked blockers cost twice — once when they slip and again when nobody can explain why the sprint missed.",
            ],
          },
        ],
      },
      {
        id: "sprints-autopilot",
        slug: "execution/sprints-and-autopilot",
        title: "Sprints and Autopilot",
        summary: "Sprint boards plus an opinionated assistant that tells you what to drop, add, or worry about — with the evidence for each call.",
        readTime: "5 min",
        audience: "Delivery leads, managers",
        routes: ["/business/sprints", "/business/sprints/:id", "/business/sprints/:id/history"],
        sections: [
          {
            heading: "Sprints, in one paragraph",
            paragraphs: [
              "Each sprint has a board (issues moving through states), a detail page (capacity, blockers, decisions in flight), and a history view that survives the sprint closing. The board behaves the way you'd expect — drag, status changes, swimlanes. The interesting part is what Knoledgr does around it.",
            ],
          },
          {
            heading: "What Autopilot is actually doing",
            paragraphs: [
              "Autopilot is the assistant that watches the sprint and tells you, mid-sprint, what's likely to slip and what to do about it. It's not magic — it's looking at four things:",
            ],
            bullets: [
              "Pace — how much you've burned down vs. how much time is left.",
              "Blockers — how many are open, how long they've been open, who owns them.",
              "Unresolved decisions — work in the sprint that depends on a decision still being debated.",
              "Work in progress — how many items each person is juggling. WIP creep is the leading indicator of a missed sprint.",
            ],
          },
          {
            heading: "When to drop or add",
            paragraphs: [
              "Autopilot recommends drops when the math says you'll miss otherwise — too much WIP, too many blockers, too little time. It recommends adds when burndown is ahead and the team has bandwidth. Each recommendation has a one-line reason.",
              "Take the recommendation, or don't. The point is that you're making the call with visible evidence instead of vibes.",
            ],
          },
          {
            heading: "Closing the sprint",
            bullets: [
              "Run the retro. Capture what shipped, what slipped, what surprised you.",
              "If a decision contributed to slippage (\"we underestimated the migration\"), link it. That goes back into the decision's outcome review.",
              "The history view stays — six months later, you can come back and ask Recall \"what did we ship in Q2 sprints?\" and get a real answer.",
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
        title: "Teams, roles, and access",
        summary: "Three roles, sensible defaults, and the few places it's worth being strict about access.",
        readTime: "4 min",
        audience: "Admins and managers",
        routes: ["/settings/team", "/settings/security"],
        sections: [
          {
            heading: "The three roles",
            paragraphs: [
              "Knoledgr keeps the role model deliberately thin. Most workspaces don't need a custom permission tier — they need clarity on who can do what.",
            ],
            bullets: [
              "Admin — workspace settings, billing, security, integrations, invites, and audit. Usually 1–2 people.",
              "Manager — can edit any decision or document, run sprints, approve proposals. Department leads, EM, PM.",
              "Member — can create and edit their own decisions, conversations, and documents; can read everyone else's. The default for everyone else on the team.",
            ],
          },
          {
            heading: "Don't over-engineer access",
            paragraphs: [
              "The temptation in a knowledge tool is to lock things down. Resist it. The whole value is that context is findable — if half the workspace is private, Ask Recall can't answer questions about it, and the team will route around the tool.",
              "The two places restriction makes sense: HR/people topics, and pre-announcement strategy. Everything else is more useful open.",
            ],
          },
          {
            heading: "Inviting people",
            bullets: [
              "Use the team's email domain in workspace settings — anyone with that domain can self-join.",
              "For everyone else, send an invite with a role pre-set. The invite shows them what they'll get access to before they accept.",
              "Audit pending invites monthly. Old pending invites are a small but real attack surface.",
            ],
          },
          {
            heading: "When someone leaves",
            paragraphs: [
              "Deactivate, don't delete. Their decisions, documents, and conversations should stay — that's the workspace's memory. Their name shows as \"former member\" on records they authored, and their account can no longer sign in.",
              "If you're required to fully purge their authorship, that's a separate admin action and produces an audit log entry.",
            ],
          },
        ],
      },
      {
        id: "security-compliance",
        slug: "admin/security-and-compliance",
        title: "Security and compliance",
        summary: "SSO, MFA, audit logs, data export — the controls your security team will ask about, in plain terms.",
        readTime: "4 min",
        audience: "Admins, security leads",
        routes: ["/settings/security", "/settings/audit", "/security-annex"],
        sections: [
          {
            heading: "The controls that exist",
            bullets: [
              "SSO — SAML 2.0 with any compatible IdP (Okta, Azure AD, Google Workspace). Available on team and enterprise plans.",
              "MFA — required workspace-wide or optional per-user. Set the policy under Security → Authentication.",
              "Audit log — every admin action and high-impact write. Exportable as JSON or CSV.",
              "API keys — scoped per integration, revocable individually, never re-displayed after creation.",
              "Data export — full workspace export as JSON; available to admins on demand.",
            ],
          },
          {
            heading: "What's in the audit log",
            paragraphs: [
              "Anything that materially changes the workspace or its access: invites sent and accepted, role changes, integration installs and removals, security policy edits, exports, and API key lifecycle events.",
              "Not in the audit log: routine reads, regular content edits, conversation replies. The audit log is meant to answer \"who did this admin thing?\" not \"who read this document?\"",
            ],
          },
          {
            heading: "Compliance posture",
            paragraphs: [
              "Knoledgr is SOC 2 Type II compliant; the report is available under NDA. Data residency for enterprise workspaces is US (default) or EU, set at workspace creation and not movable after. Encryption: TLS 1.2+ in transit, AES-256 at rest.",
              "For the full security details — subprocessors, retention windows, breach notification — see the Security Annex linked from the footer.",
            ],
          },
          {
            heading: "When to escalate to enterprise controls",
            bullets: [
              "You need integration installs to require admin approval.",
              "You need workspace-wide retention policies (auto-archive after N years).",
              "You need to enforce SSO with no password fallback.",
              "You need IP allowlisting or session length policies.",
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
        title: "GitHub Integration",
        summary: "Connect a repository to your workspace so pull requests, commits, and deployments stay tied to the decisions and issues that drove them.",
        readTime: "6 min",
        audience: "Engineering leads, platform teams, admins",
        routes: ["/integrations/github"],
        workflow: {
          eyebrow: "Connection workflow",
          title: "How GitHub connects to your organization",
          description: "The integration is scoped to the whole workspace, not a single user. One repository is linked per workspace, credentials are stored encrypted, and incoming events are signature-verified before they touch your data.",
          steps: [
            {
              title: "Connect the repository",
              detail: "On /integrations/github, enter the repository as owner/repo and a GitHub personal access token with repo scope. The token is encrypted at rest and never returned by the API.",
            },
            {
              title: "Add a webhook secret",
              detail: "Set a webhook secret in Knoledgr and the matching secret in GitHub. Knoledgr verifies the X-Hub-Signature-256 HMAC on every delivery and rejects anything that doesn't match.",
            },
            {
              title: "Point GitHub at the payload URL",
              detail: "Copy the payload URL shown on the page into your repository's webhook settings and subscribe to pull_request and push events.",
            },
            {
              title: "Let auto-linking do the work",
              detail: "With auto-link enabled, PRs and commits that reference a decision (e.g. DEC-128 in the title or message) are attached automatically, and a merged PR can advance the decision to implemented.",
            },
          ],
        },
        visual: {
          eyebrow: "Workspace dashboard",
          title: "The integration page is a live operations view, not just a settings form",
          caption: "Once connected, /integrations/github shows engineering signal, recent activity, and webhook health side by side so you can tell at a glance whether code context is flowing.",
          panels: [
            {
              title: "Connection",
              value: "Repo, enabled, auto-link",
              helper: "Toggle the integration on/off and auto-linking, or disconnect (history is kept) without leaving the page.",
              emphasis: true,
            },
            {
              title: "Engineering signal",
              value: "PRs, commits, deployments",
              helper: "Counts of decision PRs, issue PRs, tracked commits, and recorded deployments for the workspace.",
            },
            {
              title: "Recent activity",
              value: "Commits and pull requests",
              helper: "A merged feed of the latest repository activity with author, state, and a link out to GitHub.",
            },
            {
              title: "Webhooks",
              value: "Health and delivery log",
              helper: "Payload URL, secret status, and the recent delivery log with processed / ignored / failed states.",
            },
          ],
        },
        examplesEyebrow: "Integration APIs",
        examplesTitle: "GitHub integration API examples",
        examplesDescription: "These endpoints back the integration page and the decision/issue engineering timelines. All require an authenticated workspace session except the public webhook receiver.",
        examples: [
          {
            title: "Read or update the connection",
            method: "GET",
            endpoint: "/api/integrations/fresh/github/config/",
            description: "Returns the current connection, engineering summary, recent activity, webhook readiness, and webhook observability. POST the same endpoint to connect or update settings; DELETE to disconnect.",
            response: {
              configured: true,
              enabled: true,
              repo_slug: "acme/recall",
              auto_link_prs: true,
              has_webhook_secret: true,
              engineering_summary: { decision_pull_requests: 12, commits: 188, deployments: 9 },
              webhook_readiness: { state: "ready", webhook_url: "https://api.example.com/api/integrations/github/webhook/" },
            },
          },
          {
            title: "Connect a repository",
            method: "POST",
            endpoint: "/api/integrations/fresh/github/config/",
            description: "Stores encrypted credentials for the workspace. access_token is required on first connect; omit it later to keep the existing token while changing other settings.",
            request: {
              repo_owner: "acme",
              repo_name: "recall",
              access_token: "ghp_xxxxxxxxxxxxxxxxxxxx",
              webhook_secret: "a-long-random-string",
              auto_link_prs: true,
              enabled: true,
            },
            response: { message: "GitHub integration configured" },
          },
          {
            title: "Receive a signed webhook delivery",
            method: "POST",
            endpoint: "/api/integrations/github/webhook/",
            description: "Public endpoint GitHub posts to. When a webhook secret is set, the X-Hub-Signature-256 HMAC must match or the delivery is rejected and logged as failed. pull_request and push events are processed; others are acknowledged and ignored.",
            request: {
              headers: { "X-GitHub-Event": "pull_request", "X-Hub-Signature-256": "sha256=..." },
              body: { action: "closed", pull_request: { merged: true, title: "Implement DEC-128 rollout window" } },
            },
            response: { message: "PR processed", decision_updated: true },
          },
          {
            title: "Pull a decision's engineering timeline",
            method: "GET",
            endpoint: "/api/integrations/fresh/github/decisions/:id/timeline/",
            description: "Returns the commits, pull requests, deployments, and linked issues for a decision, plus an implementation status derived from those signals. Used by the decision detail page.",
            response: {
              implementation_status: "in_progress",
              summary: { commits: 7, decision_pull_requests: 2, deployments: 1, linked_issues: 3 },
            },
          },
        ],
        sections: [
          {
            heading: "What the integration adds",
            bullets: [
              "Pull requests and commits linked to the decisions and issues that motivated them.",
              "A merged PR can automatically move its decision to an implemented state.",
              "Per-decision and per-issue engineering timelines (commits, PRs, deployments) on their detail pages.",
              "Recorded deployments that connect a release back to the decision behind it.",
            ],
          },
          {
            heading: "Security model",
            bullets: [
              "Access tokens and webhook secrets are encrypted at rest and never returned by the API.",
              "Every webhook delivery is HMAC-verified with X-Hub-Signature-256 when a secret is configured.",
              "Failed-signature deliveries are rejected and recorded in the delivery log for audit.",
              "The connection is workspace-scoped, so it follows your organization's access controls.",
            ],
          },
          {
            heading: "Recommended usage",
            bullets: [
              "Reference the decision key (e.g. DEC-128) in PR titles and commit messages so auto-linking can attach them.",
              "Always set a webhook secret in both GitHub and Knoledgr before relying on delivery.",
              "Check the webhook delivery log if linked code stops appearing — failed or ignored states explain why.",
              "Disconnecting keeps linked history; it only stops new events from syncing.",
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
      {
        id: "webhooks",
        slug: "integrations/webhooks",
        title: "Outbound Webhooks",
        summary: "Subscribe to workspace events and have Knoledgr POST signed payloads to a URL you control. Turn the decision intelligence loop into something other tools can react to.",
        readTime: "6 min",
        audience: "Engineers, platform teams, integrators",
        routes: ["/api/organizations/webhooks/"],
        visual: {
          eyebrow: "Event catalog",
          title: "Eight events fire today",
          panels: [
            {
              title: "decision.created",
              value: "A new decision was saved",
              helper: "Fires after the row is committed. Payload includes the full decision plus informed_by lineage.",
              emphasis: true,
            },
            {
              title: "decision.status_changed",
              value: "Approve, implement, or reject",
              helper: "Use this to mirror status into your project tracker or to gate a CI deploy on decision approval.",
            },
            {
              title: "decision.prediction_logged",
              value: "Reality contract recorded",
              helper: "Useful for piping predictions into your own analytics pipeline alongside the metric system that will observe them.",
            },
            {
              title: "decision.outcome_logged",
              value: "Reality observed",
              helper: "Carries the drift band. Wire this to Slack to broadcast off_track decisions to a channel.",
            },
            {
              title: "decision.retro_opened",
              value: "Auto or manual retrospective",
              helper: "The triggered_by field distinguishes drift-opened from milestone-opened retros.",
            },
            {
              title: "agent.run_completed",
              value: "Final answer ready",
              helper: "Lets you forward agent output to a different surface (dashboard, digest, knowledge base).",
            },
            {
              title: "agent.run_awaiting_approval",
              value: "Human action needed",
              helper: "Page the right person when the agent has pending writes — especially useful for off-hours autonomous runs.",
            },
            {
              title: "issue.created",
              value: "Issue tracker mirror",
              helper: "Mirror new issues into Jira or Linear via your own bridge code.",
            },
          ],
        },
        examplesEyebrow: "Webhooks API",
        examplesTitle: "Managing subscriptions",
        examples: [
          {
            title: "List subscriptions and the available events",
            method: "GET",
            endpoint: "/api/organizations/webhooks/",
            description: "Returns every subscription in the workspace plus the canonical list of event names. Admin or manager role required.",
            response: {
              available_events: [
                "decision.created",
                "decision.status_changed",
                "decision.prediction_logged",
                "decision.outcome_logged",
                "decision.retro_opened",
                "agent.run_completed",
                "agent.run_awaiting_approval",
                "issue.created",
              ],
              results: [
                {
                  id: 12,
                  url: "https://example.com/hooks/knoledgr",
                  event: "decision.outcome_logged",
                  is_active: true,
                  description: "Slack alert for off-track decisions",
                  fail_count: 0,
                  last_fired_at: "2026-06-04T11:13:02Z",
                  created_at: "2026-05-18T08:30:00Z",
                  secret: null,
                },
              ],
            },
          },
          {
            title: "Create a subscription",
            method: "POST",
            endpoint: "/api/organizations/webhooks/",
            description: "The secret is returned once on create and never again. Store it immediately — it's required to verify signatures on incoming payloads.",
            request: {
              url: "https://example.com/hooks/knoledgr",
              event: "decision.outcome_logged",
              description: "Slack alert for off-track decisions",
            },
            response: {
              id: 12,
              url: "https://example.com/hooks/knoledgr",
              event: "decision.outcome_logged",
              is_active: true,
              secret: "rZSk_2BoF3Yb9tH...",
              created_at: "2026-06-04T15:11:22Z",
            },
          },
          {
            title: "Read delivery history",
            method: "GET",
            endpoint: "/api/organizations/webhooks/:subscriptionId/deliveries/",
            description: "Returns the last 50 delivery attempts for a subscription: attempt count, HTTP status received, response body excerpt, error message if any.",
            response: {
              results: [
                {
                  id: 4811,
                  event: "decision.outcome_logged",
                  attempt: 1,
                  status: "succeeded",
                  response_status: 200,
                  response_body: "ok",
                  created_at: "2026-06-04T11:13:02Z",
                  last_attempt_at: "2026-06-04T11:13:03Z",
                },
              ],
            },
          },
        ],
        sections: [
          {
            heading: "Signature verification",
            paragraphs: [
              "Every request carries an X-Knoledgr-Signature header of the form sha256=<hex>. The hex value is the HMAC-SHA256 of the raw request body using the subscription's shared secret. Reject any payload whose recomputed signature does not match.",
              "Also check X-Knoledgr-Event (the event name) and X-Knoledgr-Delivery (the WebhookDelivery row id, useful for deduplication and replay).",
            ],
            bullets: [
              "Use a constant-time comparison when verifying the signature. Don't use ==.",
              "Reject requests with a User-Agent other than Knoledgr-Webhooks/1.0 if you want to be strict.",
              "Treat the delivery id as an idempotency key — if you've seen it, skip processing.",
            ],
          },
          {
            heading: "Retry policy",
            bullets: [
              "Attempt 1 fires immediately when the event happens.",
              "Attempts 2 and 3 are retried by a Celery beat task with backoffs of 30s, 5m, and 30m measured from the previous attempt.",
              "Any delivery still failing after attempt 3 is marked failed and never retried.",
              "Subscriptions that accumulate 25 consecutive failures get auto-disabled at the nightly sweep. An admin must explicitly reactivate.",
            ],
          },
          {
            heading: "Payload shape",
            paragraphs: [
              "All payloads share the structure { event, payload, actor_id, ts }. The payload object varies by event. For decision.outcome_logged, payload.check contains the DecisionOutcomeCheck serialization including drift_pct and drift_band; for agent.run_completed, payload.run_id and payload.final_answer are the primary fields.",
              "We never include workspace secrets, user passwords, or full conversation transcripts in the payload. If you need richer context, follow up with an authenticated API call using the ids in the payload.",
            ],
          },
          {
            heading: "Operational notes",
            bullets: [
              "Webhook fan-out is best-effort and synchronous from the request that triggered the event. A slow receiver can add ~10s to the request unless your endpoint returns 2xx fast. Aim to ack within 200ms and process async on your side.",
              "Both the request that triggered the event and the delivery dispatcher run inside the same Django process. Webhook failures never roll back the underlying create.",
              "When the workspace is under suspicion of webhook spam, the fail_count auto-disable threshold can be tightened in the disable_failing_webhooks Celery task.",
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
        summary: "The problems most teams hit, and what they actually mean.",
        readTime: "4 min",
        audience: "Everyone",
        sections: [
          {
            heading: "Ask Recall keeps saying \"low coverage\"",
            paragraphs: [
              "This isn't a model problem. It means the workspace doesn't have enough material on the topic for an answer to be built. Three things to check, in order:",
            ],
            bullets: [
              "Is the topic actually documented somewhere? If everyone's been discussing it in Slack and nobody wrote it down, Ask Recall has nothing to retrieve.",
              "Are the relevant decisions and documents using the same names? \"Stripe migration\" and \"billing rewrite\" don't match each other. Pick one and rename.",
              "Is the question phrased around terms that appear in the workspace? \"Why did we do that thing?\" can't anchor on anything. \"Why did we pick Stripe over Adyen?\" can.",
            ],
          },
          {
            heading: "The Knowledge Graph looks empty around a decision",
            paragraphs: [
              "An isolated node means the decision was made and nothing got linked to it after. Two paths:",
            ],
            bullets: [
              "Go back to the decision and add links to the tickets, documents, and conversations that came out of it. The graph updates immediately.",
              "If there's actually nothing downstream — the decision was made and never acted on — that's its own signal. Either close the decision as cancelled or pick it back up.",
            ],
          },
          {
            heading: "Decisions don't show up in the dashboard \"awaiting outcome review\" list",
            bullets: [
              "Check that the decision has a prediction with a check-at date. No prediction → nothing to review.",
              "Check that the check-at date has actually passed. Predictions don't surface as overdue until then.",
              "Check that the decision status is \"implemented.\" Proposed or under-review decisions don't get outcome review prompts.",
            ],
          },
          {
            heading: "Sprint Autopilot says we're at risk and I don't think we are",
            paragraphs: [
              "Autopilot looks at four signals — pace, blockers, unresolved decisions, WIP. If the warning feels wrong, hover the risk indicator and check which one is firing.",
            ],
            bullets: [
              "If it's WIP: someone has too many issues in progress. Often a leadership member with everything assigned to them by default.",
              "If it's blockers: there are open blockers nobody's logged the resolution for. Close the resolved ones.",
              "If it's unresolved decisions: a ticket in the sprint depends on a decision still being debated. Force the decision or pull the ticket.",
            ],
          },
          {
            heading: "An integration installed but isn't syncing",
            bullets: [
              "Check the integration's status page under Settings → Integrations. Most issues show up there with a one-line reason.",
              "For GitHub: the linked app may have been removed on the GitHub side. Reinstall.",
              "For Slack: webhook URLs expire if the channel is archived. Recreate the webhook.",
              "For Jira: token-based auth eventually requires re-auth. The notice in the integration panel will tell you.",
            ],
          },
          {
            heading: "Something's broken and none of the above fits",
            paragraphs: [
              "Send a note from the Feedback page with the URL you were on and what happened. Include the rough time so we can match it to logs. We read every one.",
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
