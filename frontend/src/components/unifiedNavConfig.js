import {
  CalendarIcon,
  ChartBarIcon,
  ChatBubbleLeftIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CubeIcon,
  DocumentCheckIcon,
  DocumentTextIcon,
  FlagIcon,
  HeartIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  RocketLaunchIcon,
  SparklesIcon,
  Squares2X2Icon,
  TicketIcon,
  UserCircleIcon,
  RectangleGroupIcon,
} from "@heroicons/react/24/outline";

export function getAppLaunchTarget(app) {
  const launchPath = (app?.launch_path || "").trim();
  if (launchPath) {
    if (launchPath.startsWith("http://") || launchPath.startsWith("https://")) {
      return { type: "external", href: launchPath };
    }
    return { type: "internal", href: launchPath };
  }
  if (app?.docs_url) {
    return { type: "external", href: app.docs_url };
  }
  return { type: "internal", href: "/enterprise" };
}

export function formatWorkspaceName(orgSlug) {
  if (!orgSlug) return "Team navigation";
  return orgSlug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function isHrefActive(pathname, href) {
  if (!href) return false;
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export function isNavItemActive(pathname, item) {
  if (!item) return false;
  if (item.special === "apps") {
    return isHrefActive(pathname, "/enterprise");
  }
  if (item.href) {
    return isHrefActive(pathname, item.href);
  }
  return Array.isArray(item.items) && item.items.some((subItem) => isHrefActive(pathname, subItem.href));
}

export function getNavItemCount(item) {
  if (!Array.isArray(item?.items)) return 0;
  return item.items.length;
}

export function getFirstNavTarget(item) {
  if (item?.special === "apps") return "/enterprise";
  if (item?.href) return item.href;
  return item?.items?.[0]?.href || "/dashboard";
}

export function buildUnifiedNavModel({ user, experienceMode = "standard", installedApps = [] }) {
  const homeItem = {
    name: "Home",
    href: "/dashboard",
    icon: HomeIcon,
    summary: "AI workspace, priorities, and live team context",
  };

  const askRecallItem = {
    name: "Ask Recall",
    href: "/ask",
    icon: SparklesIcon,
    description: "Ask, summarize, draft, and reason over workspace memory with grounded AI.",
    summary: "AI assistant for memory, work, and decisions.",
  };

  const workstreamGroupsBase = [
    {
      name: "Knowledge",
      icon: Squares2X2Icon,
      summary: "The context engine behind grounded AI",
      items: [
        {
          name: "Search",
          href: "/knowledge",
          icon: MagnifyingGlassIcon,
          description: "Find the source context behind AI answers",
        },
        {
          name: "Graph",
          href: "/knowledge/graph",
          icon: CubeIcon,
          description: "Trace the context graph AI uses to reason",
        },
        {
          name: "Analytics",
          href: "/knowledge/analytics",
          icon: ChartBarIcon,
          description: "Measure AI context coverage, freshness, and flow",
        },
      ],
    },
    {
      name: "Collaborate",
      icon: ChatBubbleLeftIcon,
      summary: "Conversations, decisions, and meetings in motion",
      items: [
        {
          name: "Conversations",
          href: "/conversations",
          icon: ChatBubbleLeftIcon,
          description: "Review discussion threads and linked follow-through",
        },
        {
          name: "Decisions",
          href: "/decisions",
          icon: DocumentCheckIcon,
          description: "Track committed choices, rationale, and owners",
        },
        {
          name: "Meetings",
          href: "/business/meetings",
          icon: CalendarIcon,
          description: "Capture meetings and keep follow-up visible",
        },
      ],
    },
    {
      name: "Execute",
      icon: RocketLaunchIcon,
      summary: "Projects, goals, tasks, and sprint delivery",
      items: [
        {
          name: "Projects",
          href: "/projects",
          icon: CubeIcon,
          description: "Monitor project health, scope, and execution lanes",
        },
        {
          name: "Goals",
          href: "/business/goals",
          icon: FlagIcon,
          description: "Track outcomes, owners, and performance targets",
        },
        {
          name: "Tasks",
          href: "/business/tasks",
          icon: ClipboardDocumentListIcon,
          description: "Move day-to-day execution and ownership forward",
        },
        {
          name: "Journeys",
          href: "/business/journeys",
          icon: Squares2X2Icon,
          description: "Map work from signal to decision to delivered outcome",
        },
        {
          name: "Calendar",
          href: "/business/calendar",
          icon: CalendarIcon,
          description: "Find time, connect calendars, and slot work into the week",
        },
        {
          name: "Team Health",
          href: "/business/team-health",
          icon: HeartIcon,
          description: "Review load, sentiment, and burnout risk signals",
        },
        {
          name: "Service Desk",
          href: "/service-desk",
          icon: TicketIcon,
          description: "Capture support, access, bug, incident, and change requests",
        },
        {
          name: "Sprints",
          href: "/sprint-history",
          icon: RocketLaunchIcon,
          description: "Inspect sprint progress, rhythm, and delivery health",
        },
      ],
    },
    {
      name: "Resources",
      icon: DocumentTextIcon,
      summary: "Docs, templates, and operational assets",
      items: [
        {
          name: "Docs",
          href: "/docs",
          icon: DocumentTextIcon,
          description: "Reference product docs, guides, and system notes",
        },
        {
          name: "Documents",
          href: "/business/documents",
          icon: DocumentTextIcon,
          description: "Open working documents, briefs, and deliverables",
        },
        {
          name: "Templates",
          href: "/business/templates",
          icon: DocumentTextIcon,
          description: "Reuse structured working documents and starter assets",
        },
        ...(user?.is_staff || user?.is_superuser
          ? [
              {
                name: "Feedback Inbox",
                href: "/feedback/inbox",
                icon: ChatBubbleLeftIcon,
                description: "Review incoming customer product feedback",
              },
              {
                name: "Partner Inbox",
                href: "/partners/inbox",
                icon: ClipboardDocumentListIcon,
                description: "Track partner-facing operational conversations",
              },
            ]
          : []),
        ...(user?.role === "admin"
          ? [
              {
                name: "Import/Export",
                href: "/import-export",
                icon: DocumentTextIcon,
                description: "Move structured data into and out of the workspace",
              },
            ]
          : []),
      ],
    },
  ];

  const workstreamGroups =
    experienceMode !== "simple"
      ? workstreamGroupsBase
      : workstreamGroupsBase
          .map((group) => {
            if (group.name === "Knowledge") {
              return {
                ...group,
                items: group.items.filter((item) => ["/knowledge"].includes(item.href)),
              };
            }
            if (group.name === "Execute") {
              return {
                ...group,
                items: group.items.filter((item) =>
                  ["/projects", "/business/goals", "/business/tasks", "/business/calendar", "/service-desk"].includes(item.href)
                ),
              };
            }
            if (group.name === "Resources") {
              return {
                ...group,
                items: group.items.filter((item) => ["/docs"].includes(item.href)),
              };
            }
            return group;
          })
          .filter((group) => group.items.length > 0);

  const appItems = installedApps.map((app) => {
    const target = getAppLaunchTarget(app);
    return {
      id: `app-${app.id}`,
      name: app.name,
      href: target.href,
      external: target.type === "external",
      icon: CubeIcon,
      description: app.tagline || app.short_description || app.description || "Open installed app",
    };
  });

  const appsItem = {
    name: "Apps",
    href: "/enterprise",
    icon: CubeIcon,
    special: "apps",
    summary: appItems.length
      ? `${appItems.length} installed tool${appItems.length === 1 ? "" : "s"} and extensions`
      : "Install workspace tools and workflow extensions",
    items: appItems,
  };

  const utilityItems = [
    {
      name: "Profile",
      href: "/profile",
      icon: UserCircleIcon,
      description: "Identity, personal preferences, and how you work across Knoledgr.",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Cog6ToothIcon,
      description: "Workspace configuration, access, and experience controls.",
    },
    {
      name: "Integrations",
      href: "/integrations",
      icon: CubeIcon,
      description: "Connected tools, credentials, and service setup.",
    },
    ...(user?.role === "admin"
      ? [
          {
            name: "Analytics",
            href: "/analytics",
            icon: ChartBarIcon,
            description: "Workspace metrics, briefing signals, and activity trends.",
          },
          {
            name: "Dashboards",
            href: "/dashboards",
            icon: RectangleGroupIcon,
            description: "Reusable dashboard views for operating reviews.",
          },
        ]
      : []),
  ];

  const bottomNavItems = [
    { path: homeItem.href, icon: homeItem.icon, label: "Home", match: [homeItem.href] },
    { path: "/knowledge", icon: Squares2X2Icon, label: "Knowledge", match: ["/knowledge"] },
    {
      path: "/conversations",
      icon: ChatBubbleLeftIcon,
      label: "Collab",
      match: ["/conversations", "/decisions", "/business/meetings"],
    },
    {
      path: "/projects",
      icon: RocketLaunchIcon,
      label: "Execute",
      match: ["/projects", "/business/goals", "/business/tasks", "/business/journeys", "/business/calendar", "/business/team-health", "/service-desk", "/sprint-history", "/sprints", "/sprint"],
    },
  ];

  const mobileMenuSections = [
    {
      title: "Overview",
      items: [homeItem, askRecallItem],
    },
    {
      title: "Workstreams",
      items: workstreamGroups,
    },
    {
      title: "Workspace",
      items: [appsItem, ...utilityItems],
    },
  ];

  return {
    homeItem,
    askRecallItem,
    workstreamGroups,
    appsItem,
    utilityItems,
    bottomNavItems,
    mobileMenuSections,
  };
}
