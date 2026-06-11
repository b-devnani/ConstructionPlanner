import React, { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCrud } from "@/hooks/use-crud";
import {
  PunchItem, InsertPunchItem, PUNCH_STATUSES, PUNCH_PRIORITIES,
} from "@shared/procore";
import { RecordPage, KeyValueGrid, RecordSection } from "@/components/procore/RecordPage";
import {
  TextField, SelectField, DateField, TextAreaField,
} from "@/components/procore/shared";
import { UserSelect } from "@/components/procore/UserSelect";
import { Button } from "@/components/ui/button";
import { Trash2, Check, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function PunchDetailPage() {
  const [, params] = useRoute("/punch-list/:id");
  const [, navigate] = useLocation();
  const id = parseInt(params?.id ?? "0");

  const query = useQuery<PunchItem>({ queryKey: [`/api/punch-items/${id}`] });
  const { update, remove } = useCrud<PunchItem, InsertPunchItem>("punch-items");

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PunchItem | null>(null);

  const item = query.data;
  useEffect(() => { if (item) setDraft(item); }, [item]);

  if (!item || !draft) return null;

  const set = <K extends keyof PunchItem>(key: K) => (value: PunchItem[K]) =>
    setDraft(d => d ? { ...d, [key]: value } : d);

  const saveEdits = async () => {
    const { id: _, createdAt, ...patch } = draft;
    await update.mutateAsync({ id: item.id, data: patch });
    setEditing(false);
  };

  const detailsTab = editing ? (
    <div className="grid grid-cols-2 gap-4">
      <TextField className="col-span-2" label="Title" value={draft.title} onChange={set("title")} />
      <TextAreaField className="col-span-2" label="Description" value={draft.description} onChange={set("description")} />
      <SelectField label="Status" value={draft.status} onChange={set("status")} options={PUNCH_STATUSES} />
      <SelectField label="Priority" value={draft.priority} onChange={set("priority")} options={PUNCH_PRIORITIES} />
      <TextField label="Location" value={draft.location} onChange={set("location")} />
      <TextField label="Trade" value={draft.trade} onChange={set("trade")} />
      <UserSelect label="Assignee" value={draft.assignee} onChange={set("assignee")} />
      <UserSelect label="Ball in Court" value={draft.ballInCourt} onChange={set("ballInCourt")} />
      <DateField label="Due Date" value={draft.dueDate} onChange={set("dueDate")} />
      <div className="col-span-2 flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => { setDraft(item); setEditing(false); }}>Cancel</Button>
        <Button onClick={saveEdits} disabled={update.isPending}>
          <Check className="h-4 w-4 mr-1" /> Save Changes
        </Button>
      </div>
    </div>
  ) : (
    <div className="space-y-6">
      {item.description && (
        <RecordSection title="Description">
          <p className="text-sm whitespace-pre-wrap">{item.description}</p>
        </RecordSection>
      )}
      <RecordSection title="Details">
        <KeyValueGrid items={[
          { label: "Status", value: item.status },
          { label: "Priority", value: item.priority },
          { label: "Location", value: item.location },
          { label: "Trade", value: item.trade },
          { label: "Assignee", value: item.assignee },
          { label: "Ball in Court", value: item.ballInCourt },
          { label: "Due Date", value: formatDate(item.dueDate) },
          { label: "Date Closed", value: formatDate(item.dateClosed) },
        ]} />
      </RecordSection>
    </div>
  );

  return (
    <RecordPage
      backHref="/punch-list"
      backLabel="All Punch Items"
      number={`#${item.number}`}
      title={item.title}
      statuses={[item.status, item.priority]}
      headerFields={[
        { label: "Location", value: item.location || "—" },
        { label: "Trade", value: item.trade || "—" },
        { label: "Assignee", value: item.assignee || "—" },
        { label: "Due Date", value: formatDate(item.dueDate) },
      ]}
      actions={
        editing ? null : (
          <>
            {item.status !== "Closed" && (
              <Button variant="outline" size="sm" className="text-green-700"
                onClick={() => update.mutate({ id: item.id, data: { status: "Closed" } })}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Close Item
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            <Button
              variant="outline" size="sm" className="text-destructive"
              onClick={async () => { await remove.mutateAsync(item.id); navigate("/punch-list"); }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </>
        )
      }
      tabs={[{ id: "details", label: "Details", content: detailsTab }]}
      entityType="punchItem"
      entityId={item.id}
      attachmentsLabel="Photos & Files"
    />
  );
}
