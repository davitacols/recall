import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../utils/ThemeAndAccessibility";

const DOCS = [
  {
    id: "foundation",
    title: "Foundation",
    pages: [
      {
        id: "platform-overview",
        title: "Platform Overview",
        intro: "Knoledgr is a knowledge-first collaboration platform. Work execution and institutional memory are designed as one system.",
        sections: [
          {
            heading: "What Makes It Different",
            bullets: [
              "Conversations, decisions, agile execution, and business operations are context-linked.",
              "AI ranking and context retrieval use real usage signals and historical outcomes.",
              "Outcome reviews and calibration analytics turn execution into reusable intelligence.",
            ],
          },
          {
            heading: "Core Building Blocks",
            bullets: [
              "Conversations: structured discussion records (question/discussion/decision/blocker).",
              "Decisions: rationale, alternatives, confidence, implementation, outcomes.",
              "Agile: projects, issues, sprints, blockers, decision impacts.",
              "Business: goals, meetings, tasks, documents.",
              "Knowledge layer: content links, unified activity, context panel.",
            ],
          },
        ],
      },
      {
        id: "architecture",
        title: "Architecture and Data Flow",
        intro: "Knoledgr uses domain models per module and a shared cross-module memory layer.",
        sections: [
          {
            heading: "Cross-Module Memory Layer",
            bullets: [
              "ContentLink: directed link between any supported objects.",
              "UnifiedActivity: behavior stream used for timeline and recommendation relevance.",
              "ContextPanel: precomputed related content, experts, risks, and outcome patterns.",
            ],
          },
          {
            heading: "Knowledge Loop",
            bullets: [
              "Capture intent in conversation.",
              "Commit direction via decision.",
              "Execute in issues/tasks/projects.",
              "Review outcomes and store lessons.",
              "Reuse memory in future recommendations and risk surfaces.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "workflows",
    title: "Workflows",
    pages: [
      {
        id: "conversations",
        title: "Conversations",
        intro: "Conversations are the default entry point for collaborative discovery and early risk surfacing.",
        sections: [
          {
            heading: "Operational Guidance",
            bullets: [
              "Use explicit titles and rich context to improve search and AI relevance.",
              "Tag threads with meaningful domain terms.",
              "Promote high-signal threads into decisions when commitment is needed.",
            ],
          },
        ],
      },
      {
        id: "decisions",
        title: "Decision Lifecycle",
        intro: "Decisions track strategic and tactical choices with explainability and outcome accountability.",
        sections: [
          {
            heading: "Lifecycle",
            bullets: [
              "proposed -> under_review -> approved -> implemented -> reviewed outcome",
              "rejected/cancelled states are preserved for institutional learning",
            ],
          },
          {
            heading: "Outcome Intelligence",
            bullets: [
              "Outcome reviews validate success metrics and lessons learned.",
              "Reliability scoring estimates confidence in the review evidence quality.",
              "Drift alerts surface signs that a decision path is degrading.",
              "Calibration analytics compare reviewer confidence to actual outcomes.",
            ],
          },
        ],
      },
      {
        id: "replay",
        title: "Decision Replay Simulator",
        intro: "Replay Simulator evaluates alternatives using historical decision outcomes.",
        sections: [
          {
            heading: "Inputs and Outputs",
            bullets: [
              "Inputs: alternative summary, risk tolerance, execution speed, impact level.",
              "Outputs: predicted failure risk, expected impact score, confidence, affected teams.",
              "Safeguards are generated and can be converted into tasks automatically.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "agile",
    title: "Agile Execution",
    pages: [
      {
        id: "agile-model",
        title: "Projects, Issues, and Sprints",
        intro: "Agile models are integrated with decisions and knowledge graph links.",
        sections: [
          {
            heading: "Entities",
            bullets: [
              "Project, Board, Column, Issue, Sprint, Blocker, Retrospective.",
              "DecisionImpact maps explicit decision-to-issue/sprint effect.",
            ],
          },
          {
            heading: "Issue Workflow",
            bullets: [
              "backlog, todo, in_progress, in_review, testing, done",
              "Issue detail tracks assignee, story points, sprint assignment, and code metadata.",
            ],
          },
        ],
      },
      {
        id: "autopilot",
        title: "Decision-Coupled Sprint Autopilot",
        intro: "Autopilot uses delivery and decision signals to forecast sprint success and recommend scope changes.",
        sections: [
          {
            heading: "What It Computes",
            bullets: [
              "Goal probability and confidence band.",
              "Risk signals (pace vs time, blockers, unresolved decisions, WIP pressure).",
              "Suggested scope swaps (drop/add candidates).",
              "Decision dependency heatmap per issue.",
            ],
          },
          {
            heading: "Apply Plan",
            bullets: [
              "Moves selected issues out of or into sprint.",
              "Optionally creates decision follow-up tasks.",
              "Preserves traceability by linking actions to decision context.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "knowledge",
    title: "Knowledge and AI",
    pages: [
      {
        id: "context-engine",
        title: "Context Engine",
        intro: "Context engine computes related artifacts, experts, and risks around any object.",
        sections: [
          {
            heading: "Context Payload",
            bullets: [
              "Related conversations, decisions, tasks, documents.",
              "Expert users and historical similarity.",
              "Outcome patterns and risk indicators.",
            ],
          },
        ],
      },
      {
        id: "recommendations",
        title: "Recommendation Ranking",
        intro: "AI recommendations are weighted by behavior, links, recency decay, and validated outcomes.",
        sections: [
          {
            heading: "Major Ranking Signals",
            bullets: [
              "Trending activity and pending decision urgency.",
              "Linked-from-views strength and viewed-affinity decay.",
              "Outcome history calibration (bonus/penalty for validated outcomes).",
              "Source breakdown returned for transparency.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "operations",
    title: "Operations and Admin",
    pages: [
      {
        id: "business-module",
        title: "Business Module",
        intro: "Goals, meetings, tasks, and documents align operational planning with decision context.",
        sections: [
          {
            heading: "Cross-Linking",
            bullets: [
              "Tasks can link to goals, meetings, conversations, and decisions.",
              "Documents can anchor long-term knowledge and be linked to execution entities.",
              "Meeting outputs can become tasks and decision inputs.",
            ],
          },
        ],
      },
      {
        id: "roles-governance",
        title: "Roles and Governance",
        intro: "Role-based access controls sensitive operations while preserving team collaboration speed.",
        sections: [
          {
            heading: "Roles",
            bullets: [
              "Admin: global management and approval authority.",
              "Manager: operational leadership controls.",
              "Contributor: standard execution and collaboration flows.",
            ],
          },
          {
            heading: "Governance Checklist",
            bullets: [
              "Review pending outcomes weekly.",
              "Track drift and calibration monthly.",
              "Require decision-task linkage for high-impact changes.",
              "Resolve unresolved sprint decisions before midpoint.",
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
        title: "API Highlights",
        intro: "High-value endpoints that power major platform workflows.",
        sections: [
          {
            heading: "Decisions",
            bullets: [
              "/api/decisions/, /api/decisions/<id>/",
              "/api/decisions/<id>/outcome-review/",
              "/api/decisions/outcomes/stats/, /pending/, /drift-alerts/, /calibration/",
              "/api/decisions/<id>/replay-simulator/",
              "/api/decisions/<id>/replay-simulator/create-follow-up/",
            ],
          },
          {
            heading: "Agile and Knowledge",
            bullets: [
              "/api/agile/sprints/<id>/detail/",
              "/api/agile/sprints/<id>/autopilot/, /autopilot/apply/",
              "/api/knowledge/context/<app.model>/<id>/",
              "/api/knowledge/search-all/, /graph/, /timeline/",
              "/api/knowledge/ai/recommendations/",
            ],
          },
        ],
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        intro: "Use these checks when relevance, context quality, or prediction confidence appears weak.",
        sections: [
          {
            heading: "Diagnostics",
            bullets: [
              "Low recommendation quality: verify links, activity freshness, and outcome review coverage.",
              "Missing context: confirm object relationships and metadata completeness.",
              "Weak autopilot confidence: reduce unresolved decisions and active blockers.",
              "Sparse calibration: enforce outcome review discipline post-implementation.",
            ],
          },
        ],
      },
    ],
  },
];

export default function Documentation() {
  const { darkMode } = useTheme();
  const [query, setQuery] = useState("");
  const [activePageId, setActivePageId] = useState("platform-overview");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 980);
  const [isTablet, setIsTablet] = useState(window.innerWidth < 1240);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 980);
      setIsTablet(window.innerWidth < 1240);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const palette = useMemo(
    () =>
      darkMode
        ? { page: "#0f0b0d", panel: "#171215", panelAlt: "#1f181c", border: "rgba(255,225,193,0.14)", text: "#f4ece0", muted: "#baa892", link: "#8dc6ff" }
        : { page: "#f6f1ea", panel: "#fffaf3", panelAlt: "#ffffff", border: "#eadfce", text: "#231814", muted: "#7d6d5a", link: "#2563eb" },
    [darkMode]
  );

  const flatPages = DOCS.flatMap((group) => group.pages.map((page) => ({ ...page, groupTitle: group.title })));
  const activePage = flatPages.find((p) => p.id === activePageId) || flatPages[0];
  const filteredDocs = DOCS.map((group) => ({
    ...group,
    pages: group.pages.filter((p) => `${group.title} ${p.title} ${p.intro}`.toLowerCase().includes(query.toLowerCase())),
  })).filter((group) => group.pages.length > 0);

  return (
    <div style={{ padding: "clamp(12px,2.2vw,24px)", background: palette.page }}>
      <div style={{ borderRadius: 16, minHeight: "calc(100vh - 110px)", border: `1px solid ${palette.border}`, background: palette.panel, display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "280px minmax(0,1fr)" : "300px minmax(0,1fr) 230px", overflow: "hidden" }}>
        <aside style={{ borderRight: `1px solid ${palette.border}`, display: "grid", gridTemplateRows: "auto 1fr" }}>
          <div style={{ padding: 14, borderBottom: `1px solid ${palette.border}` }}>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.1em", color: palette.muted }}>KNOLEDGR MANUAL</p>
            <h1 style={{ margin: "6px 0 0", fontSize: 20, color: palette.text }}>Documentation</h1>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search docs..." style={{ marginTop: 10, width: "100%", borderRadius: 10, border: `1px solid ${palette.border}`, background: palette.panelAlt, color: palette.text, padding: "8px 10px", fontSize: 12 }} />
          </div>
          <div style={{ overflowY: "auto", padding: 12 }}>
            {filteredDocs.map((group) => (
              <div key={group.id} style={{ marginBottom: 12 }}>
                <p style={{ margin: "0 0 6px", fontSize: 11, color: palette.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{group.title}</p>
                <div style={{ display: "grid", gap: 4 }}>
                  {group.pages.map((page) => (
                    <button key={page.id} onClick={() => setActivePageId(page.id)} style={{ borderRadius: 8, border: `1px solid ${activePage?.id === page.id ? palette.border : "transparent"}`, background: activePage?.id === page.id ? "rgba(255,170,110,0.14)" : "transparent", color: activePage?.id === page.id ? palette.text : palette.muted, textAlign: "left", padding: "7px 8px", fontSize: 12, cursor: "pointer" }}>
                      {page.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main style={{ minWidth: 0, overflowY: "auto", padding: "20px clamp(14px,2.4vw,30px)" }}>
          <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{activePage.groupTitle}</p>
          <h2 style={{ margin: "4px 0 10px", fontSize: "clamp(1.55rem,2.8vw,2.3rem)", color: palette.text }}>{activePage.title}</h2>
          <p style={{ margin: "0 0 14px", fontSize: 14, color: palette.muted, lineHeight: 1.65 }}>{activePage.intro}</p>
          {activePage.sections.map((section) => (
            <section key={section.heading} style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.panelAlt, padding: 12, marginBottom: 10 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: 15, color: palette.text }}>{section.heading}</h3>
              {(section.paragraphs || []).map((paragraph, i) => (
                <p key={i} style={{ margin: "0 0 7px", fontSize: 13, lineHeight: 1.65, color: palette.muted }}>{paragraph}</p>
              ))}
              {(section.bullets || []).length > 0 && (
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: palette.muted, fontSize: 13, lineHeight: 1.55 }}>
                  {section.bullets.map((bullet, i) => (
                    <li key={i} style={{ marginBottom: 5 }}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </main>

        {!isTablet ? (
          <aside style={{ borderLeft: `1px solid ${palette.border}`, padding: 14 }}>
            <div style={{ position: "sticky", top: 74 }}>
              <p style={{ margin: "0 0 8px", fontSize: 11, color: palette.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>On This Page</p>
              <div style={{ display: "grid", gap: 5 }}>
                {activePage.sections.map((s) => (
                  <span key={s.heading} style={{ color: palette.link, fontSize: 12 }}>{s.heading}</span>
                ))}
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

