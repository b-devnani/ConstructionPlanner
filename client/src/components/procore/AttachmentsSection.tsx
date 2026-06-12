import React, { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Attachment } from "@shared/procore";
import { Button } from "@/components/ui/button";
import { Paperclip, Trash2, Upload, FileText, Image as ImageIcon } from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Upload + list + delete attachments for one entity. Used for submittal
 * attachments, RFI references, drawing files, punch/daily-log photos, etc.
 */
export function AttachmentsSection({
  entityType,
  entityId,
  title = "Attachments",
}: {
  entityType: string;
  entityId: number;
  title?: string;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const listKey = `/api/attachments?entityType=${entityType}&entityId=${entityId}`;

  const query = useQuery<Attachment[]>({ queryKey: [listKey] });
  const attachments = query.data ?? [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [listKey] });
    // uploads/removals emit activity events — keep the feed in sync
    queryClient.invalidateQueries({
      queryKey: [`/api/activity?entityType=${entityType}&entityId=${entityId}`],
    });
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        form.append("entityType", entityType);
        form.append("entityId", String(entityId));
        const res = await fetch("/api/attachments", {
          method: "POST",
          body: form,
          credentials: "include",
        });
        if (!res.ok) throw new Error(await res.text());
      }
      refresh();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/attachments/${id}`, { method: "DELETE", credentials: "include" });
    refresh();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold flex items-center gap-1.5">
          <Paperclip className="h-4 w-4" /> {title} ({attachments.length})
        </div>
        <Button variant="outline" size="sm" disabled={uploading}
          onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-1" /> {uploading ? "Uploading..." : "Upload"}
        </Button>
        <input ref={inputRef} type="file" multiple className="hidden"
          onChange={e => handleUpload(e.target.files)} />
      </div>
      {attachments.length === 0 ? (
        <p className="text-xs text-muted-foreground border border-dashed rounded-md p-3 text-center">
          No files attached. PDFs, photos, and documents up to 50 MB.
        </p>
      ) : (
        <ul className="divide-y border rounded-md">
          {attachments.map(a => (
            <li key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              {a.mimeType.startsWith("image/")
                ? <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
              <a
                href={`/api/attachments/${a.id}/file`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 truncate text-primary hover:underline"
              >
                {a.filename}
              </a>
              <span className="text-xs text-muted-foreground">{formatSize(a.size)}</span>
              {a.uploadedBy && (
                <span className="text-xs text-muted-foreground hidden md:inline">by {a.uploadedBy}</span>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                onClick={() => handleDelete(a.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
