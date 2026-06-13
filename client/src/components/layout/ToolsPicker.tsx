import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { LayoutGrid, Search, Star } from "lucide-react";
import { TOOLS } from "@/lib/tools";
import { useFavorites } from "@/lib/FavoritesContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export function ToolsPicker() {
  const { favorites, isFavorite, toggle } = useFavorites();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => TOOLS.filter(t =>
      search === "" ||
      `${t.label} ${t.category}`.toLowerCase().includes(search.toLowerCase())),
    [search],
  );
  const grouped = useMemo(() => {
    const map = new Map<string, typeof TOOLS>();
    for (const t of filtered) {
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 px-2.5 py-1 rounded text-sm hover:bg-white/10 transition-colors">
          <LayoutGrid className="h-4 w-4" />
          Tools
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[28rem] p-0 max-h-[32rem] overflow-hidden flex flex-col"
      >
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search tools..."
              className="pl-8 h-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-y-auto p-1.5">
          {grouped.map(([category, tools]) => (
            <div key={category} className="mb-2">
              <div className="px-2 py-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                {category}
              </div>
              {tools.map(tool => {
                const Icon = tool.icon;
                const pinned = isFavorite(tool.id);
                return (
                  <div
                    key={tool.id}
                    className="flex items-center hover:bg-muted rounded-sm group"
                  >
                    <Link
                      href={tool.path}
                      onClick={() => setOpen(false)}
                      className="flex-1 flex items-center gap-2 px-2 py-1.5 text-sm"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{tool.label}</span>
                    </Link>
                    <button
                      className={`px-2 py-1.5 ${pinned ? "text-amber-500" : "text-muted-foreground/40 group-hover:text-muted-foreground"}`}
                      onClick={() => toggle(tool.id)}
                      title={pinned ? "Unpin from sidebar" : "Pin to sidebar"}
                    >
                      <Star className={`h-3.5 w-3.5 ${pinned ? "fill-current" : ""}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="px-3 py-2 border-t text-2xs text-muted-foreground bg-muted/40">
          {favorites.length} pinned to sidebar · click the star to pin
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
