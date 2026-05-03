import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  FlagIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import api from "../services/api";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
  WorkspaceToolbar,
} from "../components/WorkspaceChrome";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

function normalizeItems(payload) {
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  return [];
}

function formatDateRange(sprint) {
  if (!sprint?.start_date || !sprint?.end_date) return "Dates unavailable";
  const start = new Date(sprint.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const end = new Date(sprint.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${start} to ${end}`;
}

function safeCompletionRate(velocity) {
  const lastSprint = velocity?.sprints?.[velocity.sprints.length - 1];
  if (!lastSprint?.committed) return 0;
  return Math.round((lastSprint.completed / lastSprint.committed) * 100);
}

function MetricCard({ icon: Icon, label, value, helper, tone, palette }) {
  return (
    <article
      className="ui-card-lift ui-smooth"
      style={{
        borderRadius: 18,
        border: `1px solid ${palette.border}`,
        background: palette.cardAlt,
        padding: 16,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            background: `${tone}18`,
            color: tone,
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icon style={{ width: 18, height: 18 }} />
        </div>
        <strong style={{ fontSize: 28, lineHeight: 1, letterSpacing: "-0.04em", color: palette.text }}>{value}</strong>
      </div>
      <div style={{ display: "grid", gap: 4 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: palette.muted }}>
          {label}
        </p>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: palette.muted }}>{helper}</p>
      </div>
    </article>
  );
}

function BurndownChart({ data, palette }) {
  const width = 520;
  const height = 300;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxY = Math.max(...data.map((item) => Math.max(item.ideal, item.actual)), 1);
  const maxX = Math.max(data.length - 1, 1);

  const getX = (day) => padding + (day / maxX) * chartWidth;
  const getY = (value) => padding + chartHeight - (value / maxY) * chartHeight;

  const idealPath = data.map((item, index) => `${index === 0 ? "M" : "L"} ${getX(item.day)} ${getY(item.ideal)}`).join(" ");
  const actualPath = data.map((item, index) => `${index === 0 ? "M" : "L"} ${getX(item.day)} ${getY(item.actual)}`).join(" ");

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={ratio}
          x1={padding}
          y1={getY(maxY * ratio)}
          x2={width - padding}
          y2={getY(maxY * ratio)}
          stroke={palette.border}
          strokeWidth="1"
        />
      ))}

      <path d={idealPath} fill="none" stroke={palette.muted} strokeWidth="2" strokeDasharray="5,5" />
      <path d={actualPath} fill="none" stroke={palette.info} strokeWidth="3" />

      {data.map((item) => (
        <circle key={item.day} cx={getX(item.day)} cy={getY(item.actual)} r="4" fill={palette.info} />
      ))}

      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke={palette.muted} strokeWidth="1.5" />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={palette.muted} strokeWidth="1.5" />

      <text x={width / 2} y={height - 10} fill={palette.muted} fontSize="12" textAnchor="middle">
        Days
      </text>
      <text x={18} y={height / 2} fill={palette.muted} fontSize="12" textAnchor="middle" transform={`rotate(-90, 18, ${height / 2})`}>
        Story Points
      </text>

      <line x1={width - 160} y1={22} x2={width - 128} y2={22} stroke={palette.muted} strokeWidth="2" strokeDasharray="5,5" />
      <text x={width - 121} y={26} fill={palette.muted} fontSize="12">
        Ideal
      </text>
      <line x1={width - 160} y1={42} x2={width - 128} y2={42} stroke={palette.info} strokeWidth="2.5" />
      <text x={width - 121} y={46} fill={palette.muted} fontSize="12">
        Actual
      </text>
    </svg>
  );
}

function VelocityChart({ data, average, palette }) {
  const width = 520;
  const height = 300;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxY = Math.max(...data.map((item) => Math.max(item.committed, item.completed)), 1);
  const barWidth = chartWidth / Math.max(data.length, 1) / 2.6;
  const groupWidth = chartWidth / Math.max(data.length, 1);

  const getY = (value) => padding + chartHeight - (value / maxY) * chartHeight;
  const getHeight = (value) => (value / maxY) * chartHeight;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={ratio}
          x1={padding}
          y1={getY(maxY * ratio)}
          x2={width - padding}
          y2={getY(maxY * ratio)}
          stroke={palette.border}
          strokeWidth="1"
        />
      ))}

      <line x1={padding} y1={getY(average)} x2={width - padding} y2={getY(average)} stroke={palette.success} strokeWidth="2" strokeDasharray="5,5" />

      {data.map((item, index) => {
        const x = padding + index * groupWidth + groupWidth / 2;
        return (
          <g key={item.name || index}>
            <rect x={x - barWidth - 3} y={getY(item.committed)} width={barWidth} height={getHeight(item.committed)} rx="6" fill={palette.accent} opacity="0.78" />
            <rect x={x + 3} y={getY(item.completed)} width={barWidth} height={getHeight(item.completed)} rx="6" fill={palette.info} />
            <text x={x} y={height - padding + 20} fill={palette.muted} fontSize="10" textAnchor="middle">
              {String(item.name || `S${index + 1}`).replace("Sprint ", "S")}
            </text>
          </g>
        );
      })}

      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke={palette.muted} strokeWidth="1.5" />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={palette.muted} strokeWidth="1.5" />

      <text x={width / 2} y={height - 10} fill={palette.muted} fontSize="12" textAnchor="middle">
        Sprints
      </text>
      <text x={18} y={height / 2} fill={palette.muted} fontSize="12" textAnchor="middle" transform={`rotate(-90, 18, ${height / 2})`}>
        Story Points
      </text>

      <rect x={width - 170} y={16} width={14} height={14} rx="4" fill={palette.accent} opacity="0.78" />
      <text x={width - 149} y={27} fill={palette.muted} fontSize="12">
        Committed
      </text>
      <rect x={width - 170} y={38} width={14} height={14} rx="4" fill={palette.info} />
      <text x={width - 149} y={49} fill={palette.muted} fontSize="12">
        Completed
      </text>
      <line x1={width - 170} y1={62} x2={width - 154} y2={62} stroke={palette.success} strokeWidth="2" strokeDasharray="5,5" />
      <text x={width - 149} y={66} fill={palette.muted} fontSize="12">
        Average
      </text>
    </svg>
  );
}

export default function Reports() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [sprints, setSprints] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState("");
  const [burndown, setBurndown] = useState(null);
  const [velocity, setVelocity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/api/agile/projects/");
        const projectList = normalizeItems(response?.data);
        setProjects(projectList);
        setSelectedProject((current) => current || String(projectList[0]?.id || ""));
      } catch (requestError) {
        console.error("Failed to fetch agile projects:", requestError);
        setProjects([]);
        setError("We could not load agile projects for reporting.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    const fetchProjectContext = async () => {
      if (!selectedProject) {
        setSprints([]);
        setSelectedSprint("");
        setVelocity(null);
        setBurndown(null);
        return;
      }

      setReportLoading(true);
      try {
        const sprintResponse = await api.get(`/api/agile/projects/${selectedProject}/sprints/`).catch(() => ({ data: [] }));
        const sprintList = normalizeItems(sprintResponse?.data);
        setSprints(sprintList);
        setSelectedSprint((current) => {
          const stillValid = sprintList.some((sprint) => String(sprint.id) === String(current));
          return stillValid ? current : String(sprintList[0]?.id || "");
        });

        const velocityResponse = await api.get(`/api/agile/projects/${selectedProject}/velocity/`).catch(() => null);
        setVelocity(velocityResponse?.data || null);
      } catch (requestError) {
        console.error("Failed to fetch reports context:", requestError);
        setVelocity(null);
      } finally {
        setReportLoading(false);
      }
    };

    fetchProjectContext();
  }, [selectedProject]);

  useEffect(() => {
    const fetchBurndown = async () => {
      if (!selectedSprint) {
        setBurndown(null);
        return;
      }

      setReportLoading(true);
      try {
        const response = await api.get(`/api/agile/sprints/${selectedSprint}/burndown/`).catch(() => null);
        setBurndown(response?.data || null);
      } catch (requestError) {
        console.error("Failed to fetch burndown:", requestError);
        setBurndown(null);
      } finally {
        setReportLoading(false);
      }
    };

    fetchBurndown();
  }, [selectedSprint]);

  const selectedProjectRecord = projects.find((project) => String(project.id) === String(selectedProject));
  const selectedSprintRecord = sprints.find((sprint) => String(sprint.id) === String(selectedSprint));
  const completionRate = safeCompletionRate(velocity);
  const currentRemaining = burndown?.data?.[burndown.data.length - 1]?.actual ?? 0;

  const heroStats = [
    {
      label: "Projects",
      value: projects.length,
      helper: selectedProjectRecord ? `${selectedProjectRecord.name} is selected` : "Choose a project to view sprint reporting",
      tone: palette.info,
    },
    {
      label: "Avg Velocity",
      value: velocity?.average || 0,
      helper: "Average points completed per sprint",
      tone: palette.accent,
    },
    {
      label: "Completion",
      value: `${completionRate}%`,
      helper: selectedSprintRecord ? `Current sprint ${selectedSprintRecord.name}` : "Based on the latest sprint trend",
      tone: completionRate >= 90 ? palette.success : completionRate >= 70 ? palette.warn : palette.danger,
    },
  ];

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        variant="execution"
        eyebrow="Delivery Reporting"
        title="Reports and Analytics"
        description="Track sprint progress, velocity, and delivery momentum from live agile data. Empty states are shown when the workspace has not generated reporting data yet."
        stats={heroStats}
        aside={
          <div
            style={{
              minWidth: 230,
              borderRadius: 20,
              border: `1px solid ${palette.border}`,
              background: palette.cardAlt,
              padding: 14,
              display: "grid",
              gap: 6,
            }}
          >
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 800, color: palette.muted }}>
              Reporting Scope
            </p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.text }}>
              Choose a project and sprint to compare committed work, completed work, and the expected burn path.
            </p>
          </div>
        }
      />

      <WorkspaceToolbar palette={palette} darkMode={darkMode} variant="execution">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select
            value={selectedProject}
            onChange={(event) => setSelectedProject(event.target.value)}
            className="ui-focus-ring"
            style={{ ...ui.input, width: "auto", minWidth: 230, padding: "9px 12px", fontSize: 13 }}
          >
            <option value="">Select Project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSprint}
            onChange={(event) => setSelectedSprint(event.target.value)}
            className="ui-focus-ring"
            style={{ ...ui.input, width: "auto", minWidth: 230, padding: "9px 12px", fontSize: 13 }}
            disabled={!sprints.length}
          >
            <option value="">{sprints.length ? "Select Sprint" : "No sprints available"}</option>
            {sprints.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name}
              </option>
            ))}
          </select>
        </div>

        {selectedSprintRecord ? (
          <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
            {selectedSprintRecord.name} · {formatDateRange(selectedSprintRecord)}
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
            Pick a sprint to populate the burndown and sprint history views.
          </p>
        )}
      </WorkspaceToolbar>

      {loading ? (
        <div
          style={{
            minHeight: 240,
            borderRadius: 20,
            border: `1px solid ${palette.border}`,
            background: palette.card,
            opacity: 0.7,
          }}
        />
      ) : null}

      {!loading && error ? (
        <WorkspaceEmptyState
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          title="Reporting is unavailable"
          description={error}
          action={
            <Link to="/projects" className="ui-btn-polish ui-focus-ring" style={{ ...ui.primaryButton, textDecoration: "none" }}>
              Open Projects
            </Link>
          }
        />
      ) : null}

      {!loading && !error && projects.length === 0 ? (
        <WorkspaceEmptyState
          palette={palette}
          darkMode={darkMode}
          variant="execution"
          title="No agile projects yet"
          description="Create a project first so sprint reports, velocity, and burndown trends have a delivery surface to draw from."
          action={
            <Link to="/projects" className="ui-btn-polish ui-focus-ring" style={{ ...ui.primaryButton, textDecoration: "none" }}>
              Create or Open Projects
            </Link>
          }
        />
      ) : null}

      {!loading && !error && projects.length > 0 ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <MetricCard
              icon={ArrowTrendingUpIcon}
              label="Average Velocity"
              value={velocity?.average || 0}
              helper="Average completed story points per sprint"
              tone={palette.info}
              palette={palette}
            />
            <MetricCard
              icon={FlagIcon}
              label="Current Sprint"
              value={currentRemaining}
              helper="Story points currently left in the selected sprint"
              tone={palette.warn}
              palette={palette}
            />
            <MetricCard
              icon={ChartBarIcon}
              label="Completion Rate"
              value={`${completionRate}%`}
              helper="Latest sprint completion ratio"
              tone={completionRate >= 90 ? palette.success : palette.info}
              palette={palette}
            />
            <MetricCard
              icon={CalendarDaysIcon}
              label="Sprint Count"
              value={velocity?.sprints?.length || sprints.length}
              helper="Sprint records available for comparison"
              tone={palette.accent}
              palette={palette}
            />
          </div>

          {!selectedSprint && !reportLoading ? (
            <WorkspaceEmptyState
              palette={palette}
              darkMode={darkMode}
              variant="execution"
              title="Select a sprint to open reporting"
              description="The project has loaded, but we still need a sprint selection before we can draw the burndown chart."
            />
          ) : null}

          {selectedSprint ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 12 }}>
              <WorkspacePanel
                palette={palette}
                darkMode={darkMode}
                variant="execution"
                eyebrow="Burn"
                title="Sprint burndown"
                description="Compare the ideal burndown line with the actual trend so teams can see whether work is clearing at the expected pace."
              >
                {burndown?.data?.length ? (
                  <BurndownChart data={burndown.data} palette={palette} />
                ) : (
                  <WorkspaceEmptyState
                    palette={palette}
                    darkMode={darkMode}
                    variant="execution"
                    title="No burndown data"
                    description="Start a sprint and move work through the board to generate burndown activity."
                  />
                )}
              </WorkspacePanel>

              <WorkspacePanel
                palette={palette}
                darkMode={darkMode}
                variant="execution"
                eyebrow="Throughput"
                title="Team velocity"
                description="Review the difference between committed and completed work across recent sprints."
              >
                {velocity?.sprints?.length ? (
                  <VelocityChart data={velocity.sprints} average={velocity.average} palette={palette} />
                ) : (
                  <WorkspaceEmptyState
                    palette={palette}
                    darkMode={darkMode}
                    variant="execution"
                    title="No velocity history"
                    description="Velocity appears here once sprint history is available."
                  />
                )}
              </WorkspacePanel>
            </div>
          ) : null}

          <WorkspacePanel
            palette={palette}
            darkMode={darkMode}
            variant="execution"
            eyebrow="History"
            title="Sprint history"
            description="Use the latest sprint outcomes to understand consistency, overcommitment, and delivery reliability."
          >
            {velocity?.sprints?.length ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
                      {["Sprint", "Committed", "Completed", "Rate"].map((heading) => (
                        <th
                          key={heading}
                          style={{
                            padding: "12px 10px",
                            textAlign: heading === "Sprint" ? "left" : "right",
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: palette.muted,
                          }}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {velocity.sprints.map((sprint, index) => {
                      const rate = sprint.committed ? Math.round((sprint.completed / sprint.committed) * 100) : 0;
                      return (
                        <tr key={`${sprint.name}-${index}`} style={{ borderBottom: `1px solid ${palette.border}` }}>
                          <td style={{ padding: "12px 10px", fontSize: 14, fontWeight: 700, color: palette.text }}>{sprint.name}</td>
                          <td style={{ padding: "12px 10px", textAlign: "right", fontSize: 14, color: palette.muted }}>{sprint.committed}</td>
                          <td style={{ padding: "12px 10px", textAlign: "right", fontSize: 14, fontWeight: 700, color: palette.text }}>{sprint.completed}</td>
                          <td
                            style={{
                              padding: "12px 10px",
                              textAlign: "right",
                              fontSize: 14,
                              fontWeight: 800,
                              color: rate >= 90 ? palette.success : rate >= 70 ? palette.warn : palette.danger,
                            }}
                          >
                            {rate}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <WorkspaceEmptyState
                palette={palette}
                darkMode={darkMode}
                variant="execution"
                title="No sprint history yet"
                description="Velocity history will appear here after the team closes a few sprints."
              />
            )}
          </WorkspacePanel>
        </>
      ) : null}
    </div>
  );
}
