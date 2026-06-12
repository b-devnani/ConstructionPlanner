import React from "react";
import { Link, useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import { toolByPath } from "@/lib/tools";
import { useBreadcrumbTrailing } from "@/lib/BreadcrumbContext";

interface Crumb {
  label: string;
  path?: string;
}

/**
 * Auto-generates breadcrumbs from the current route. Detail pages (e.g.
 * /rfis/3) prepend the tool name as a clickable parent crumb; the leaf label
 * comes from BreadcrumbContext (the record number, published by RecordPage)
 * and falls back to the raw route segment until the record loads.
 */
export function Breadcrumbs() {
  const [path] = useLocation();
  const tool = toolByPath(path);
  const trailing = useBreadcrumbTrailing() ?? undefined;

  const crumbs: Crumb[] = [{ label: "Project Home", path: "/" }];
  if (tool && tool.path !== "/") crumbs.push({ label: tool.label, path: tool.path });

  // Detail page slug ⇒ leaf crumb (the page may provide a better trailing label)
  if (tool && tool.path !== "/" && path.startsWith(tool.path + "/")) {
    const tail = path.slice(tool.path.length + 1);
    crumbs.push({ label: trailing ?? tail });
  } else if (path === "/" || tool?.path === path) {
    // already at tool root — nothing more to add
  } else if (trailing) {
    crumbs.push({ label: trailing });
  }

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground">
      {crumbs.map((c, i) => (
        <React.Fragment key={`${c.label}-${i}`}>
          {i > 0 && <ChevronRight className="h-3 w-3" />}
          {c.path ? (
            <Link href={c.path} className="hover:text-foreground transition-colors flex items-center gap-1">
              {i === 0 && <Home className="h-3 w-3" />}
              {c.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{c.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
