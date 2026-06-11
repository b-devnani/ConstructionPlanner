import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ActivityEvent } from "@shared/procore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, MessageSquare, Paperclip, FileEdit, ArrowRight,
  Circle, UserCheck, FileCheck,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  created: Plus,
  status_changed: ArrowRight,
  field_changed: FileEdit,
  comment: MessageSquare,
  attachment_added: Paperclip,
  attachment_removed: Paperclip,
  workflow_step_added: UserCheck,
  workflow_step_responded: FileCheck,
  ball_in_court_changed: ArrowRight,
};

const ICON_COLORS: Record<string, string> = {
  created: "bg-blue-100 text-blue-700",
  status_changed: "bg-amber-100 text-amber-700",
  comment: "bg-slate-100 text-slate-700",
  attachment_added: "bg-emerald-100 text-emerald-700",
  attachment_removed: "bg-rose-100 text-rose-700",
  workflow_step_added: "bg-violet-100 text-violet-700",
  workflow_step_responded: "bg-emerald-100 text-emerald-700",
  ball_in_court_changed: "bg-indigo-100 text-indigo-700",
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diff = (now - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ActivityFeed({ entityType, entityId }: {
  entityType: string;
  entityId: number;
}) {
  const { toast } = useToast();
  const key = `/api/activity?entityType=${entityType}&entityId=${entityId}`;
  const query = useQuery<ActivityEvent[]>({ queryKey: [key] });
  const [draft, setDraft] = useState("");

  const post = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/activity/comment", {
        entityType, entityId, body: draft,
      });
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: [key] });
    },
    onError: (error: Error) =>
      toast({ title: "Failed to post comment", description: error.message, variant: "destructive" }),
  });

  const events = query.data ?? [];

  return (
    <div className="space-y-4">
      {/* Comment composer */}
      <div className="border rounded-md p-3 bg-card">
        <Textarea
          rows={2}
          value={draft}
          placeholder="Add a comment, note, or update..."
          onChange={e => setDraft(e.target.value)}
        />
        <div className="flex justify-end mt-2">
          <Button
            size="sm"
            disabled={!draft.trim() || post.isPending}
            onClick={() => post.mutate()}
          >
            Post Comment
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No activity yet.
        </p>
      ) : (
        <ol className="relative pl-6">
          <div className="absolute left-3 top-1 bottom-1 w-px bg-border" />
          {events.map(event => {
            const Icon = ICONS[event.eventType] ?? Circle;
            const colorClass = ICON_COLORS[event.eventType] ?? "bg-slate-100 text-slate-700";
            return (
              <li key={event.id} className="relative mb-4">
                <div
                  className={`absolute -left-6 top-0.5 h-6 w-6 rounded-full flex items-center justify-center ${colorClass}`}
                >
                  <Icon className="h-3 w-3" />
                </div>
                <div className="text-sm font-medium leading-snug">
                  {event.summary}
                </div>
                {event.body && (
                  <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {event.body}
                  </div>
                )}
                <div className="text-2xs text-muted-foreground mt-0.5">
                  {event.actor && <span>{event.actor} · </span>}
                  {formatTime(event.createdAt)}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
