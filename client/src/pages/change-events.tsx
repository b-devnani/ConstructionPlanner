import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCrud } from "@/hooks/use-crud";
import {
  ChangeEvent, InsertChangeEvent, ChangeEventLineItem,
  CHANGE_EVENT_STATUSES, CHANGE_EVENT_SCOPES, CHANGE_EVENT_TYPES,
} from "@shared/procore";
import {
  PageHeader, StatusBadge, SearchInput, StatusFilter, EmptyState,
  TextField, SelectField, TextAreaField,
} from "@/components/procore/shared";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const emptyForm: InsertChangeEvent = {
  title: "", status: "Open", scope: "TBD", eventType: "Owner Change",
  origin: "", description: "",
};

export default function ChangeEventsPage() {
  const [, navigate] = useLocation();
  const events = useCrud<ChangeEvent, InsertChangeEvent>("change-events", ["/api/budget"]);
  const allLines = useQuery<ChangeEventLineItem[]>({ queryKey: ["/api/change-event-line-items"] });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<InsertChangeEvent>(emptyForm);

  const allEvents = events.query.data ?? [];
  const allLineItems = allLines.data ?? [];

  const eventTotals = useMemo(() => {
    const map = new Map<number, number>();
    for (const line of allLineItems) {
      map.set(line.changeEventId, (map.get(line.changeEventId) ?? 0) + line.romAmount);
    }
    return map;
  }, [allLineItems]);

  const filtered = useMemo(
    () => allEvents.filter(e =>
      (statusFilter === "all" || e.status === statusFilter) &&
      (search === "" ||
        `${e.number} ${e.title} ${e.origin}`.toLowerCase().includes(search.toLowerCase()))),
    [allEvents, search, statusFilter],
  );

  const openCreate = () => { setForm(emptyForm); setDialogOpen(true); };
  const set = <K extends keyof InsertChangeEvent>(key: K) => (value: InsertChangeEvent[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.title.trim()) return;
    const created = await events.create.mutateAsync(form);
    setDialogOpen(false);
    navigate(`/change-events/${created.id}`);
  };

  return (
    <div>
      <PageHeader
        title="Change Events"
        subtitle={`${allEvents.length} events — ${allEvents.filter(e => e.status === "Open").length} open`}
        onCreate={openCreate}
        createLabel="Create Change Event"
      />

      <div className="flex flex-wrap gap-2 mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search change events..." />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} options={CHANGE_EVENT_STATUSES} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No change events match the current filters." />
      ) : (
        <div className="border rounded">
          <Table className="dense">
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-28">Scope</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead className="text-right">ROM Total</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(ev => (
                <TableRow
                  key={ev.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/change-events/${ev.id}`)}
                >
                  <TableCell className="font-medium text-primary">{ev.number}</TableCell>
                  <TableCell className="max-w-[24rem] truncate">{ev.title}</TableCell>
                  <TableCell><StatusBadge status={ev.status} /></TableCell>
                  <TableCell className="text-xs">{ev.scope}</TableCell>
                  <TableCell className="text-xs">{ev.eventType}</TableCell>
                  <TableCell className="text-xs">{ev.origin || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatCurrency(eventTotals.get(ev.id) ?? 0)}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={() => events.remove.mutate(ev.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Create Change Event</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <TextField className="col-span-2" label="Title" value={form.title} onChange={set("title")} />
            <SelectField label="Status" value={form.status ?? "Open"} onChange={set("status")} options={CHANGE_EVENT_STATUSES} />
            <SelectField label="Scope" value={form.scope ?? "TBD"} onChange={set("scope")} options={CHANGE_EVENT_SCOPES} />
            <SelectField label="Event Type" value={form.eventType ?? "Owner Change"} onChange={set("eventType")} options={CHANGE_EVENT_TYPES} />
            <TextField label="Origin" value={form.origin ?? ""} onChange={set("origin")} placeholder="e.g. RFI-001" />
            <TextAreaField className="col-span-2" label="Description" value={form.description ?? ""} onChange={set("description")} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.title.trim() || events.create.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
