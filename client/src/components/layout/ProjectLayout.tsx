import React from "react";
import { Link, useLocation } from "wouter";
import ThemeToggle from "@/components/ui/theme-toggle";
import { useAuth } from "@/lib/AuthContext";
import { NotificationBell } from "@/components/procore/NotificationBell";
import { ToolsPicker } from "@/components/layout/ToolsPicker";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useFavorites } from "@/lib/FavoritesContext";
import { BreadcrumbProvider } from "@/lib/BreadcrumbContext";
import { TOOLS, type Tool } from "@/lib/tools";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HardHat, LogOut, Star } from "lucide-react";

function SidebarItem({ tool, active }: { tool: Tool; active: boolean }) {
  const Icon = tool.icon;
  return (
    <Link
      href={tool.path}
      className={`flex items-center gap-2.5 px-3 py-1.5 text-sm rounded transition-colors ${
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground/80 hover:bg-muted"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{tool.label}</span>
    </Link>
  );
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { favorites } = useFavorites();

  const isActive = (tool: Tool) =>
    tool.path === "/" ? location === "/" : location.startsWith(tool.path);

  const favoriteTools = favorites
    .map(id => TOOLS.find(t => t.id === id))
    .filter((t): t is Tool => Boolean(t));

  return (
    <BreadcrumbProvider>
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar — slate, dense, with tool picker */}
      <header
        className="h-12 flex items-center gap-3 px-3 shadow-sm z-30 text-[color:rgb(var(--topbar-fg))]"
        style={{ backgroundColor: "rgb(var(--topbar-bg))" }}
      >
        <Link href="/" className="flex items-center gap-2 pr-2 border-r border-white/10 mr-1">
          <HardHat className="h-5 w-5" />
          <span className="font-semibold text-sm">ConstructionPlanner</span>
        </Link>
        <ToolsPicker />
        <div className="hidden md:flex flex-col leading-tight ml-2">
          <span className="text-xs text-white/90 font-medium">Riverside Medical Center</span>
          <span className="text-2xs text-white/60">Summit Builders Inc. · #2024-117</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell />
          <ThemeToggle />
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded hover:bg-white/10">
                  <span className="h-7 w-7 rounded-full bg-white/15 flex items-center justify-center text-xs font-semibold">
                    {user.name.split(" ").map(part => part[0]).slice(0, 2).join("")}
                  </span>
                  <span className="text-sm hidden md:inline">{user.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>{user.name}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {user.role} · {user.company}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar — favorites only; everything else is in the top-bar Tools picker */}
        <aside className="w-52 shrink-0 border-r bg-card overflow-y-auto">
          <nav className="py-2 px-1.5">
            <div className="mb-3">
              <div className="flex items-center justify-between px-2 py-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3" /> Pinned
                </span>
              </div>
              {favoriteTools.length === 0 ? (
                <p className="text-2xs text-muted-foreground px-2 py-2">
                  Open Tools above and star items to pin them here.
                </p>
              ) : (
                favoriteTools.map(tool => (
                  <SidebarItem key={tool.id} tool={tool} active={isActive(tool)} />
                ))
              )}
            </div>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 overflow-x-auto flex flex-col">
          <div className="px-6 py-2 border-b bg-card/40">
            <Breadcrumbs />
          </div>
          <div className="flex-1 px-6 py-4">{children}</div>
        </main>
      </div>
    </div>
    </BreadcrumbProvider>
  );
}
