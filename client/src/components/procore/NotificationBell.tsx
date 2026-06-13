import React from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Notification } from "@shared/procore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, ExternalLink } from "lucide-react";

const KEY = "/api/notifications";

/** Maps notification entity types to their detail routes. */
const ENTITY_ROUTES: Record<string, (id: number) => string> = {
  rfi: id => `/rfis/${id}`,
  submittal: id => `/submittals/${id}`,
  punchItem: id => `/punch-list/${id}`,
  changeEvent: id => `/change-events/${id}`,
  changeOrder: id => `/change-orders/${id}`,
  commitment: id => `/commitments/${id}`,
  drawing: id => `/drawings/${id}`,
};

function notificationRoute(n: Notification): string | null {
  if (!n.entityType || n.entityId === null) return null;
  const builder = ENTITY_ROUTES[n.entityType];
  return builder ? builder(n.entityId) : null;
}

export function NotificationBell() {
  const [, navigate] = useLocation();
  const [open, setOpen] = React.useState(false);
  const query = useQuery<Notification[]>({
    queryKey: [KEY],
    refetchInterval: 60_000,
  });
  const notifications = query.data ?? [];
  const unread = notifications.filter(n => !n.read);

  const markRead = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `${KEY}/${id}/read`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `${KEY}/read-all`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });

  const handleClick = (n: Notification) => {
    if (!n.read) markRead.mutate(n.id);
    const route = notificationRoute(n);
    if (route) {
      setOpen(false);
      navigate(route);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative p-1.5 rounded hover:bg-white/15" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center font-semibold">
              {unread.length > 99 ? "99+" : unread.length}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold">Notifications</span>
          {unread.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs"
              onClick={() => markAllRead.mutate()}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No notifications yet.
            </p>
          ) : (
            notifications.slice(0, 30).map(n => {
              const hasRoute = notificationRoute(n) !== null;
              return (
                <button
                  key={n.id}
                  className={`w-full text-left px-3 py-2.5 border-b last:border-0 hover:bg-muted text-sm group ${
                    n.read ? "opacity-60" : "bg-primary/5"
                  }`}
                  onClick={() => handleClick(n)}
                >
                  <div className="font-medium leading-snug flex items-start gap-1.5">
                    <span className="flex-1">{n.title}</span>
                    {hasRoute && (
                      <ExternalLink className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    )}
                  </div>
                  {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
