import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCrud } from "@/hooks/use-crud";
import {
  ChangeEvent, InsertChangeEvent, ChangeEventLineItem, InsertChangeEventLineItem,
  CHANGE_EVENT_STATUSES, CHANGE_EVENT_SCOPES, CHANGE_EVENT_TYPES,
} from "@shared/procore";
import {
  PageHeader, StatusBadge, SearchInput, StatusFilter, EmptyState,
  TextField, SelectField, TextAreaField, DetailRow,
} from "@/components/procore/shared";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Eye } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

const emptyForm: InsertChangeEvent = {
  title: "", status: "Open", scope: "TBD", eventType: "Owner Change",
  origin: "", description: "",
};
const emptyLine: Omit<InsertChangeEventLineItem, "changeEventId"> = {
  costCode: "", description: "", vendor: "", romAmount: 0,
};

export default function ChangeEventsPage() {
  const events = useCrud<ChangeEvent, InsertChangeEvent>("change-events", ["/api/budget"]);
  const allLines = useQuery<ChangeEventLineItem[]>({
    queryKey: ["/api/change-event-line-items"],
    queryFn: async () => {
      const res = await fetch("/api/change-event-line-items", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
  });
  const lines = useCrud<ChangeEventLineItem, InsertChangeEventLineItem>(
    "change-event-lines", ["/api/change-event-line-items"],
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChangeEvent | null>(null);
  const [form, setForm] = useState<InsertChangeEvent>(emptyForm);
  const [viewing, setViewing] = useState<ChangeEvent | null>(null);
  const [newLine, setNewLine] = useState({ ...emptyLine });

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

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (ev: ChangeEvent) => {
    setEditing(ev);
    const { id, createdAt, ...rest } = ev;
    setForm(rest);
    setDialogOpen(true);
  };

  const set = <K extends keyof InsertChangeEvent>(key: K) => (value: InsertChangeEvent[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.title.trim()) return;
    if (editing) await events.update.mutateAsync({ id: editing.id, data: form });
    else await events.create.mutateAsync(form);
    setDialogOpen(false);
  };

  const viewingLines = viewing
    ? allLineItems.filter(l => l.changeEventId === viewing.id)
    : [];
  const viewingTotal = viewingLines.reduce((acc, l) => acc + l.romAmount, 0);

  return (
    <div>
      <PageHeader
        title="Change Events"
        subtitle={`${allEvents.length} events — ${allEvents.filter(e => e.status === "Open").length} open`}
        onCreate={openCreate}
        createLabel="Create Change Event"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search change events..." />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} options={CHANGE_EVENT_STATUSES} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No change events match the current filters." />
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead className="text-right">ROM Total</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(ev => (
                <TableRow key={ev.id} className="cursor-pointer" onClick={() => setViewing(ev)}>
                  <TableCell className="font-medium">{ev.number}</TableCell>
                  <TableCell className="max-w-72 truncate">{ev.title}</TableCell>
                  <TableCell><StatusBadge status={ev.status} /></TableCell>
                  <TableCell>{ev.scope}</TableCell>
                  <TableCell>{ev.eventType}</TableCell>
                  <TableCell>{ev.origin || "—"}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(eventTotals.get(ev.id) ?? 0)}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewing(ev)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(ev)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => events.remove.mutate(ev.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* View change event detail with line items */}
      <Dialog open={viewing !== null} onOpenChange={open => !open && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {viewing.number}: {viewing.title}
                  <StatusBadge status={viewing.status} />
                </DialogTitle>
              </DialogHeader>
              <div>
                <DetailRow label="Scope">{viewing.scope}</DetailRow>
                <DetailRow label="Event Type">{viewing.eventType}</DetailRow>
                <DetailRow label="Origin">{viewing.origin || "—"}</DetailRow>
                <DetailRow label="Description">{viewing.description || "—"}</DetailRow>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Line Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Cost Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right w-32">ROM ($)</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingLines.map(l => (
                      <TableRow key={l.id}>
                        <TableCell>{l.costCode}</TableCell>
                        <TableCell>{l.description}</TableCell>
                        <TableCell>{l.vendor || "—"}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(l.romAmount)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                            onClick={() => lines.remove.mutate(l.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell>
                        <Input placeholder="Code" value={newLine.costCode}
                          onChange={e => setNewLine(r => ({ ...r, costCode: e.target.value }))} />
                      </TableCell>
                      <TableCell>
                        <Input placeholder="Description" value={newLine.description}
                          onChange={e => setNewLine(r => ({ ...r, description: e.target.value }))} />
                      </TableCell>
                      <TableCell>
                        <Input placeholder="Vendor" value={newLine.vendor}
                          onChange={e => setNewLine(r => ({ ...r, vendor: e.target.value }))} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="text-right" value={newLine.romAmount || ""}
                          onChange={e => setNewLine(r => ({ ...r, romAmount: parseFloat(e.target.value) || 0 }))} />
                      </TableCell>
                      <TableCell>
                        <Button size="icon" className="h-8 w-8"
                          disabled={!newLine.description.trim() || lines.create.isPending}
                          onClick={async () => {
                            await lines.create.mutateAsync({ ...newLine, changeEventId: viewing.id });
                            setNewLine({ ...emptyLine });
                          }}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="font-semibold">ROM Total</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatCurrency(viewingTotal)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.number}` : "Create Change Event"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <TextField className="col-span-2" label="Title" value={form.title} onChange={set("title")} />
            <SelectField label="Status" value={form.status ?? "Open"} onChange={set("status")} options={CHANGE_EVENT_STATUSES} />
            <SelectField label="Scope" value={form.scope ?? "TBD"} onChange={set("scope")} options={CHANGE_EVENT_SCOPES} />
            <SelectField label="Event Type" value={form.eventType ?? "Owner Change"} onChange={set("eventType")} options={CHANGE_EVENT_TYPES} />
            <TextField label="Origin" value={form.origin ?? ""} onChange={set("origin")} placeholder="e.g. RFI-001, Owner meeting" />
            <TextAreaField className="col-span-2" label="Description" value={form.description ?? ""} onChange={set("description")} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.title.trim() || events.create.isPending || events.update.isPending}>
              {editing ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
