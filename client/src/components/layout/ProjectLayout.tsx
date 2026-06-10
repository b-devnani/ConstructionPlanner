import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import ThemeToggle from "@/components/ui/theme-toggle";
import {
  CalendarDays, FileQuestion, FileStack, FileText, ClipboardList,
  ListChecks, FileSignature, FileDiff, GitPullRequest, Wallet,
  HardHat, Menu, BookOpen,
} from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Project Management",
    items: [
      { label: "Schedule", path: "/", icon: CalendarDays },
      { label: "Daily Log", path: "/daily-log", icon: ClipboardList },
      { label: "RFIs", path: "/rfis", icon: FileQuestion },
      { label: "Submittals", path: "/submittals", icon: FileStack },
      { label: "Drawings", path: "/drawings", icon: FileText },
      { label: "Specifications", path: "/specifications", icon: BookOpen },
      { label: "Punch List", path: "/punch-list", icon: ListChecks },
    ],
  },
  {
    label: "Financial Management",
    items: [
      { label: "Prime Contract", path: "/prime-contract", icon: FileSignature },
      { label: "Budget", path: "/budget", icon: Wallet },
      { label: "Change Events", path: "/change-events", icon: FileDiff },
      { label: "Change Orders", path: "/change-orders", icon: GitPullRequest },
    ],
  },
];

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="h-14 flex items-center gap-3 px-4 bg-[#f47e42] dark:bg-[#b35420] text-white shadow z-20">
        <button
          className="p-1.5 rounded hover:bg-white/15"
          onClick={() => setSidebarOpen(open => !open)}
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <HardHat className="h-6 w-6" />
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-sm">Riverside Medical Center</span>
          <span className="text-xs text-white/85">Summit Builders Inc. — Project #2024-117</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-56 shrink-0 border-r bg-card overflow-y-auto">
            <nav className="py-3">
              {NAV_GROUPS.map(group => (
                <div key={group.label} className="mb-4">
                  <div className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </div>
                  {group.items.map(item => {
                    const active = location === item.path;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                          active
                            ? "bg-primary/10 text-primary border-r-2 border-primary font-medium"
                            : "text-foreground/80 hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 overflow-x-auto p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
