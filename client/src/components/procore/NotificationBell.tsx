import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Notification } from "@shared/procore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell } from "lucide-react";

const KEY = "/api/notifications";

export function NotificationBell() {
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

  return (
    <DropdownMenu>
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
            notifications.slice(0, 30).map(n => (
              <button
                key={n.id}
                className={`w-full text-left px-3 py-2.5 border-b last:border-0 hover:bg-muted text-sm ${
                  n.read ? "opacity-60" : "bg-primary/5"
                }`}
                onClick={() => !n.read && markRead.mutate(n.id)}
              >
                <div className="font-medium leading-snug">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                <div className="text-[11px] text-muted-foreground mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
