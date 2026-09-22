import {
  CubeIcon,
  DocumentCheckIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";

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
  if (item.href) return isHrefActive(pathname, item.href);
  return Array.isArray(item.items) && item.items.some((subItem) => isHrefActive(pathname, subItem.href));
}

export function getNavItemCount(item) {
  if (!Array.isArray(item?.items)) return 0;
  return item.items.length;
}

export function getFirstNavTarget(item) {
  if (item?.href) return item.href;
  return item?.items?.[0]?.href || "/dashboard";
}

export function buildUnifiedNavModel({ experienceMode = "standard", canManageIntegrations = false }) {
  const homeItem = {
    name: "Home",
    href: "/dashboard",
    icon: HomeIcon,
    summary: "Decision health, priorities, and live team context",
  };

  const askRecallItem = {
    name: "Ask Recall",
    href: "/ask",
    icon: SparklesIcon,
    description: "Ask questions, draft updates, and take action from workspace memory.",
    summary: "Ask questions and act on workspace memory.",
  };

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
          description: "Committed choices, their reasoning, and the code that implemented them",
        },
      ],
    },
    {
      name: "Explore",
      icon: Squares2X2Icon,
      summary: "Find and understand recorded context",
      items: [
        {
          name: "Search",
          href: "/knowledge",
          icon: MagnifyingGlassIcon,
          description: "Search decisions, discussions, and supporting evidence",
        },
        {
          name: "Graph",
          href: "/knowledge/graph",
          icon: CubeIcon,
          description: "See how decisions, discussions, and code connect",
        },
      ],
    },
    ...(canManageIntegrations
      ? [
          {
            name: "Connect",
            icon: CubeIcon,
            summary: "Bring code context into the decision record",
            items: [
              {
                name: "GitHub",
                href: "/integrations/github",
                icon: CubeIcon,
                description: "Link pull requests and commits to the decisions behind them",
              },
              {
                name: "Integrations",
                href: "/integrations",
                icon: CubeIcon,
                description: "Manage tools connected to this workspace",
              },
            ],
          },
        ]
      : []),
  ];

  const workstreamGroups =
    experienceMode !== "simple"
      ? workstreamGroupsBase
      : workstreamGroupsBase
          .map((group) => {
            if (group.name === "Explore") {
              return {
                ...group,
                items: group.items.filter((item) => item.href === "/knowledge"),
              };
            }
            return group;
          })
          .filter((group) => group.items.length > 0);

  const utilityItems = [];

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
      items: [homeItem, askRecallItem],
    },
    {
      title: "Workspace",
      items: workstreamGroups,
    },
  ];

  return {
    homeItem,
    askRecallItem,
    workstreamGroups,
    utilityItems,
    bottomNavItems,
    mobileMenuSections,
  };
}
