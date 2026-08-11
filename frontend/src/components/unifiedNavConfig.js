import {
  BoltIcon,
  CalendarIcon,
  ChartBarIcon,
  ChatBubbleLeftIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CpuChipIcon,
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

  const agentItem = {
    name: "Agent",
    href: "/agent",
    icon: CpuChipIcon,
    description: "Autonomous tool-using copilot that plans multi-step work and asks for approval before write actions.",
    summary: "Autonomous workspace agent with tool use.",
  };

  // Memory leads. The navigation opened with "Knowledge" — the search tooling —
  // while the decision record sat under "Collaborate", a name that describes an
  // activity rather than the thing being built. The record *is* the product;
  // search is how you get back into it. Ordering them the other way round asked
  // every new user to find the point of the tool on their own.
  const workstreamGroupsBase = [
    {
      name: "Memory",
      icon: DocumentCheckIcon,
      summary: "What the team decided, and why",
      items: [
        {
          name: "Decisions",
          href: "/decisions",
          icon: DocumentCheckIcon,
          description: "Committed choices, the reasoning behind them, and the code that implemented them",
        },
        {
          name: "Conversations",
          href: "/conversations",
          icon: ChatBubbleLeftIcon,
          description: "The discussions decisions come from — written here or captured from merged PRs",
        },
        {
          name: "Decision Intelligence",
          href: "/decisions/intelligence",
          icon: ChartBarIcon,
          description: "Predicted outcomes vs. reality across every decision",
        },
        // Documents sits here rather than in a group of its own. It is not a
        // place to go and write — Notion and Confluence do that better, and ten
        // documents in five months says nobody was using it that way. It is the
        // material the record cites: indexed for search, and already the target
        // of 41 content links. So it belongs beside the record, quietly.
        {
          name: "Documents",
          href: "/business/documents",
          icon: DocumentTextIcon,
          description: "Briefs and specs the record cites — indexed, so Ask Recall can quote them",
        },
      ],
    },
    {
      name: "Explore",
      icon: Squares2X2Icon,
      summary: "Ways back into the record",
      items: [
        {
          name: "Search",
          href: "/knowledge",
          icon: MagnifyingGlassIcon,
          description: "Find the source context behind AI answers",
        },
        {
          name: "Browse",
          href: "/knowledge/base",
          icon: CubeIcon,
          description: "Browse the workspace knowledge base",
        },
        {
          name: "Graph",
          href: "/knowledge/graph",
          icon: CubeIcon,
          description: "Trace the context graph AI uses to reason",
        },
        {
          name: "Insights",
          href: "/knowledge/insights",
          icon: ChartBarIcon,
          description: "Measure AI context coverage, freshness, and flow",
        },
      ],
    },
  ];

  const workstreamGroups =
    experienceMode !== "simple"
      ? workstreamGroupsBase
      : workstreamGroupsBase
          .map((group) => {
            if (group.name === "Explore") {
              return {
                ...group,
                items: group.items.filter((item) => ["/knowledge"].includes(item.href)),
              };
            }
            // Two arms used to live here, for Execute and Resources. Both
            // filtered groups that have since been dissolved, so both went on
            // matching nothing — the same dead branch twice over. Simple mode
            // now only has to narrow Explore.
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
    // Staff and admin tooling moved here from the Resources group when that
    // group was dissolved. Hiding them outright would have left them reachable
    // only by typing a URL, which is not the same thing as tidying up — and
    // the footer is where workspace tooling already lives.
    ...(user?.is_staff || user?.is_superuser
      ? [
          {
            name: "Feedback Inbox",
            href: "/feedback/inbox",
            icon: ChatBubbleLeftIcon,
            description: "Review incoming customer product feedback.",
          },
          {
            name: "Partner Inbox",
            href: "/partners/inbox",
            icon: ClipboardDocumentListIcon,
            description: "Track partner-facing operational conversations.",
          },
        ]
      : []),
    ...(user?.role === "admin"
      ? [
          {
            name: "Import/Export",
            href: "/import-export",
            icon: DocumentTextIcon,
            description: "Move structured data into and out of the workspace.",
          },
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

  // Three tabs, so each should earn its place. "Collab" pointed at
  // Conversations while claiming Decisions in its match list, which meant the
  // tab lit up for a page it would not take you to. Decisions is the
  // destination that matters, and Ask Recall is the fastest way back into the
  // record on a phone.
  const bottomNavItems = [
    { path: homeItem.href, icon: homeItem.icon, label: "Home", match: [homeItem.href] },
    {
      path: "/decisions",
      icon: DocumentCheckIcon,
      label: "Decisions",
      match: ["/decisions", "/conversations"],
    },
    { path: askRecallItem.href, icon: SparklesIcon, label: "Ask", match: [askRecallItem.href] },
  ];

  const mobileMenuSections = [
    {
      title: "Overview",
      items: [homeItem, askRecallItem, agentItem],
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
    agentItem,
    workstreamGroups,
    appsItem,
    utilityItems,
    bottomNavItems,
    mobileMenuSections,
  };
}
