import React, { useMemo, useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import {
  Drawing, InsertDrawing, DRAWING_DISCIPLINES, DRAWING_STATUSES,
} from "@shared/procore";
import {
  PageHeader, StatusBadge, SearchInput, StatusFilter, EmptyState,
  TextField, SelectField, DateField,
} from "@/components/procore/shared";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2 } from "lucide-react";
import { formatDate, todayString } from "@/lib/format";

const emptyForm: InsertDrawing = {
  number: "", title: "", discipline: "Architectural", revision: "0",
  drawingDate: null, receivedDate: todayString(), drawingSet: "IFC", status: "Current",
};

export default function DrawingsPage() {
  const { query, create, update, remove } = useCrud<Drawing, InsertDrawing>("drawings");
  const [search, setSearch] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState("all");
  const [showSuperseded, setShowSuperseded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Drawing | null>(null);
  const [form, setForm] = useState<InsertDrawing>(emptyForm);

  const drawings = query.data ?? [];
  const filtered = useMemo(
    () => drawings.filter(d =>
      (showSuperseded || d.status === "Current") &&
      (disciplineFilter === "all" || d.discipline === disciplineFilter) &&
      (search === "" ||
        `${d.number} ${d.title} ${d.drawingSet}`.toLowerCase().includes(search.toLowerCase()))),
    [drawings, search, disciplineFilter, showSuperseded],
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, Drawing[]>();
    for (const d of filtered) {
      const list = groups.get(d.discipline) ?? [];
      list.push(d);
      groups.set(d.discipline, list);
    }
    Array.from(groups.values()).forEach((list: Drawing[]) =>
      list.sort((a, b) => a.number.localeCompare(b.number)));
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (d: Drawing) => {
    setEditing(d);
    const { id, createdAt, ...rest } = d;
    setForm(rest);
    setDialogOpen(true);
  };

  const set = <K extends keyof InsertDrawing>(key: K) => (value: InsertDrawing[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.number.trim() || !form.title.trim()) return;
    if (editing) await update.mutateAsync({ id: editing.id, data: form });
    else await create.mutateAsync(form);
    setDialogOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Drawings"
        subtitle={`${drawings.filter(d => d.status === "Current").length} current drawings`}
        onCreate={openCreate}
        createLabel="Upload Drawing"
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search drawings..." />
        <StatusFilter value={disciplineFilter} onChange={setDisciplineFilter}
          options={DRAWING_DISCIPLINES} label="Disciplines" />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={showSuperseded} onCheckedChange={v => setShowSuperseded(v === true)} />
          Show superseded revisions
        </label>
      </div>

      {grouped.length === 0 ? (
        <EmptyState message="No drawings match the current filters." />
      ) : (
        grouped.map(([discipline, items]) => (
          <div key={discipline} className="mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {discipline} ({items.length})
            </h2>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-16">Rev</TableHead>
                    <TableHead>Set</TableHead>
                    <TableHead>Drawing Date</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(d => (
                    <TableRow key={d.id} className={d.status === "Superseded" ? "opacity-60" : ""}>
                      <TableCell className="font-medium">{d.number}</TableCell>
                      <TableCell>{d.title}</TableCell>
                      <TableCell>{d.revision}</TableCell>
                      <TableCell>{d.drawingSet || "—"}</TableCell>
                      <TableCell>{formatDate(d.drawingDate)}</TableCell>
                      <TableCell>{formatDate(d.receivedDate)}</TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                            onClick={() => remove.mutate(d.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit Drawing ${editing.number}` : "Upload Drawing"}</DialogTitle>
          </DialogHeader>
          {!editing && (
            <p className="text-xs text-muted-foreground">
              Uploading a new revision of an existing drawing number automatically supersedes prior revisions.
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Number" value={form.number} onChange={set("number")} placeholder="e.g. A-101" />
            <TextField label="Revision" value={form.revision ?? "0"} onChange={set("revision")} />
            <TextField className="col-span-2" label="Title" value={form.title} onChange={set("title")} />
            <SelectField label="Discipline" value={form.discipline ?? "Architectural"} onChange={set("discipline")} options={DRAWING_DISCIPLINES} />
            <TextField label="Drawing Set" value={form.drawingSet ?? ""} onChange={set("drawingSet")} placeholder="e.g. IFC" />
            <DateField label="Drawing Date" value={form.drawingDate ?? null} onChange={set("drawingDate")} />
            <DateField label="Received Date" value={form.receivedDate ?? null} onChange={set("receivedDate")} />
            {editing && (
              <SelectField label="Status" value={form.status ?? "Current"} onChange={set("status")} options={DRAWING_STATUSES} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}
              disabled={!form.number.trim() || !form.title.trim() || create.isPending || update.isPending}>
              {editing ? "Save Changes" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
