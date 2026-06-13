import {
  CalendarDays, FileQuestion, FileStack, FileText, ClipboardList,
  ListChecks, FileSignature, FileDiff, GitPullRequest, Wallet,
  BookOpen, Users, Handshake, Receipt,
  type LucideIcon,
} from "lucide-react";

export interface Tool {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  category: "Project Management" | "Financial Management";
}

export const TOOLS: Tool[] = [
  { id: "schedule", label: "Schedule", path: "/", icon: CalendarDays, category: "Project Management" },
  { id: "daily-log", label: "Daily Log", path: "/daily-log", icon: ClipboardList, category: "Project Management" },
  { id: "rfis", label: "RFIs", path: "/rfis", icon: FileQuestion, category: "Project Management" },
  { id: "submittals", label: "Submittals", path: "/submittals", icon: FileStack, category: "Project Management" },
  { id: "drawings", label: "Drawings", path: "/drawings", icon: FileText, category: "Project Management" },
  { id: "specs", label: "Specifications", path: "/specifications", icon: BookOpen, category: "Project Management" },
  { id: "punch", label: "Punch List", path: "/punch-list", icon: ListChecks, category: "Project Management" },
  { id: "directory", label: "Directory", path: "/directory", icon: Users, category: "Project Management" },
  { id: "contract", label: "Prime Contract", path: "/prime-contract", icon: FileSignature, category: "Financial Management" },
  { id: "budget", label: "Budget", path: "/budget", icon: Wallet, category: "Financial Management" },
  { id: "ce", label: "Change Events", path: "/change-events", icon: FileDiff, category: "Financial Management" },
  { id: "co", label: "Change Orders", path: "/change-orders", icon: GitPullRequest, category: "Financial Management" },
  { id: "commitments", label: "Commitments", path: "/commitments", icon: Handshake, category: "Financial Management" },
  { id: "invoicing", label: "Invoicing", path: "/invoicing", icon: Receipt, category: "Financial Management" },
];

/** Default tools pinned to the sidebar; the rest live in the top-bar Tools picker. */
export const DEFAULT_FAVORITES = [
  "schedule", "daily-log", "rfis", "submittals", "drawings", "punch", "budget",
];

const STORAGE_KEY = "cp.favorite-tools";

export function readFavorites(): string[] {
  if (typeof window === "undefined") return DEFAULT_FAVORITES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FAVORITES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_FAVORITES;
  } catch {
    return DEFAULT_FAVORITES;
  }
}

export function writeFavorites(ids: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function toolByPath(path: string): Tool | undefined {
  // Pick the most specific match (longest path that the URL starts with)
  let best: Tool | undefined;
  for (const tool of TOOLS) {
    if (path === tool.path) return tool;
    if (tool.path !== "/" && path.startsWith(tool.path + "/")) {
      if (!best || tool.path.length > best.path.length) best = tool;
    }
  }
  return best;
}
