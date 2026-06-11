import React, { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCrud } from "@/hooks/use-crud";
import {
  ChangeEvent, InsertChangeEvent, ChangeEventLineItem, InsertChangeEventLineItem,
  CHANGE_EVENT_STATUSES, CHANGE_EVENT_SCOPES, CHANGE_EVENT_TYPES,
} from "@shared/procore";
import { RecordPage, KeyValueGrid, RecordSection } from "@/components/procore/RecordPage";
import {
  TextField, SelectField, TextAreaField,
} from "@/components/procore/shared";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Check, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const emptyLine: Omit<InsertChangeEventLineItem, "changeEventId"> = {
  costCode: "", description: "", vendor: "", romAmount: 0,
};

export default function ChangeEventDetailPage() {
  const [, params] = useRoute("/change-events/:id");
  const [, navigate] = useLocation();
  const id = parseInt(params?.id ?? "0");

  const query = useQuery<ChangeEvent>({ queryKey: [`/api/change-events/${id}`] });
  const { update, remove } = useCrud<ChangeEvent, InsertChangeEvent>("change-events", ["/api/budget"]);
  const lines = useCrud<ChangeEventLineItem, InsertChangeEventLineItem>(
    "change-event-lines", ["/api/change-event-line-items", "/api/budget"],
  );
  const allLines = useQuery<ChangeEventLineItem[]>({ queryKey: ["/api/change-event-line-items"] });
  const itemLines = (allLines.data ?? []).filter(l => l.changeEventId === id);
  const linesTotal = itemLines.reduce((acc, l) => acc + l.romAmount, 0);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ChangeEvent | null>(null);
  const [newLine, setNewLine] = useState({ ...emptyLine });

  const event = query.data;
  useEffect(() => { if (event) setDraft(event); }, [event]);

  if (!event || !draft) return null;

  const set = <K extends keyof ChangeEvent>(key: K) => (value: ChangeEvent[K]) =>
    setDraft(d => d ? { ...d, [key]: value } : d);

  const saveEdits = async () => {
    const { id: _, createdAt, ...patch } = draft;
    await update.mutateAsync({ id: event.id, data: patch });
    setEditing(false);
  };

  const detailsTab = editing ? (
    <div className="grid grid-cols-2 gap-4">
      <TextField className="col-span-2" label="Title" value={draft.title} onChange={set("title")} />
      <SelectField label="Status" value={draft.status} onChange={set("status")} options={CHANGE_EVENT_STATUSES} />
      <SelectField label="Scope" value={draft.scope} onChange={set("scope")} options={CHANGE_EVENT_SCOPES} />
      <SelectField label="Event Type" value={draft.eventType} onChange={set("eventType")} options={CHANGE_EVENT_TYPES} />
      <TextField label="Origin" value={draft.origin} onChange={set("origin")} placeholder="e.g. RFI-001" />
      <TextAreaField className="col-span-2" label="Description" value={draft.description} onChange={set("description")} />
      <div className="col-span-2 flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => { setDraft(event); setEditing(false); }}>Cancel</Button>
        <Button onClick={saveEdits} disabled={update.isPending}>
          <Check className="h-4 w-4 mr-1" /> Save Changes
        </Button>
      </div>
    </div>
  ) : (
    <div className="space-y-6">
      {event.description && (
        <RecordSection title="Description">
          <p className="text-sm whitespace-pre-wrap">{event.description}</p>
        </RecordSection>
      )}
      <RecordSection title="Details">
        <KeyValueGrid items={[
          { label: "Status", value: event.status },
          { label: "Scope", value: event.scope },
          { label: "Event Type", value: event.eventType },
          { label: "Origin", value: event.origin },
        ]} />
      </RecordSection>
    </div>
  );

  const linesTab = (
    <div>
      <Table className="dense">
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Cost Code</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead className="text-right w-32">ROM Amount</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {itemLines.map(l => (
            <TableRow key={l.id}>
              <TableCell>{l.costCode}</TableCell>
              <TableCell>{l.description}</TableCell>
              <TableCell>{l.vendor || "—"}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(l.romAmount)}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                  onClick={() => lines.remove.mutate(l.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell>
              <Input className="h-7 text-xs" placeholder="Code" value={newLine.costCode}
                onChange={e => setNewLine(r => ({ ...r, costCode: e.target.value }))} />
            </TableCell>
            <TableCell>
              <Input className="h-7 text-xs" placeholder="Description" value={newLine.description}
                onChange={e => setNewLine(r => ({ ...r, description: e.target.value }))} />
            </TableCell>
            <TableCell>
              <Input className="h-7 text-xs" placeholder="Vendor" value={newLine.vendor}
                onChange={e => setNewLine(r => ({ ...r, vendor: e.target.value }))} />
            </TableCell>
            <TableCell>
              <Input className="h-7 text-xs text-right" type="number" value={newLine.romAmount || ""}
                onChange={e => setNewLine(r => ({ ...r, romAmount: parseFloat(e.target.value) || 0 }))} />
            </TableCell>
            <TableCell>
              <Button size="icon" className="h-7 w-7"
                disabled={!newLine.description.trim() || lines.create.isPending}
                onClick={async () => {
                  await lines.create.mutateAsync({ ...newLine, changeEventId: id });
                  setNewLine({ ...emptyLine });
                }}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3} className="font-semibold">ROM Total</TableCell>
            <TableCell className="text-right font-mono font-semibold">{formatCurrency(linesTotal)}</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );

  return (
    <RecordPage
      backHref="/change-events"
      backLabel="All Change Events"
      number={event.number}
      title={event.title}
      statuses={[event.status, event.scope]}
      headerFields={[
        { label: "Event Type", value: event.eventType },
        { label: "Origin", value: event.origin || "—" },
        { label: "ROM Total", value: formatCurrency(linesTotal) },
      ]}
      actions={
        editing ? null : (
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            <Button
              variant="outline" size="sm" className="text-destructive"
              onClick={async () => { await remove.mutateAsync(event.id); navigate("/change-events"); }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </>
        )
      }
      tabs={[
        { id: "details", label: "Details", content: detailsTab },
        { id: "lines", label: "Line Items", count: itemLines.length, content: linesTab },
      ]}
      entityType="changeEvent"
      entityId={event.id}
      showAttachmentsTab={false}
    />
  );
}
