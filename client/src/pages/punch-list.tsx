import React, { useMemo, useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import {
  PunchItem, InsertPunchItem, PUNCH_STATUSES, PUNCH_PRIORITIES,
} from "@shared/procore";
import {
  PageHeader, StatusBadge, SearchInput, StatusFilter, EmptyState,
  TextField, SelectField, DateField, TextAreaField,
} from "@/components/procore/shared";
import { AttachmentsSection } from "@/components/procore/AttachmentsSection";
import { UserSelect } from "@/components/procore/UserSelect";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/format";

const emptyForm: InsertPunchItem = {
  title: "", description: "", status: "Open", priority: "Medium",
  location: "", trade: "", assignee: "", ballInCourt: "",
  dueDate: null, dateClosed: null,
};

export default function PunchListPage() {
  const { query, create, update, remove } = useCrud<PunchItem, InsertPunchItem>("punch-items");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PunchItem | null>(null);
  const [form, setForm] = useState<InsertPunchItem>(emptyForm);

  const items = query.data ?? [];
  const filtered = useMemo(
    () => items.filter(p =>
      (statusFilter === "all" || p.status === statusFilter) &&
      (search === "" ||
        `${p.number} ${p.title} ${p.location} ${p.trade} ${p.assignee}`
          .toLowerCase().includes(search.toLowerCase()))),
    [items, search, statusFilter],
  );

  const openCount = items.filter(p => p.status === "Open").length;
  const reviewCount = items.filter(p => p.status === "Ready for Review").length;

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: PunchItem) => {
    setEditing(p);
    const { id, createdAt, ...rest } = p;
    setForm(rest);
    setDialogOpen(true);
  };

  const set = <K extends keyof InsertPunchItem>(key: K) => (value: InsertPunchItem[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.title.trim()) return;
    if (editing) await update.mutateAsync({ id: editing.id, data: form });
    else await create.mutateAsync(form);
    setDialogOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Punch List"
        subtitle={`${items.length} items — ${openCount} open, ${reviewCount} ready for review`}
        onCreate={openCreate}
        createLabel="Add Punch Item"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search punch items..." />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} options={PUNCH_STATUSES} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No punch items match the current filters." />
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Closed</TableHead>
                <TableHead className="w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => openEdit(p)}>
                  <TableCell className="font-medium">{p.number}</TableCell>
                  <TableCell className="max-w-72 truncate">{p.title}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                  <TableCell><StatusBadge status={p.priority} /></TableCell>
                  <TableCell>{p.location || "—"}</TableCell>
                  <TableCell>{p.trade || "—"}</TableCell>
                  <TableCell>{p.assignee || "—"}</TableCell>
                  <TableCell>{formatDate(p.dueDate)}</TableCell>
                  <TableCell>{formatDate(p.dateClosed)}</TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {p.status !== "Closed" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600"
                          title="Close item"
                          onClick={() => update.mutate({ id: p.id, data: { status: "Closed" } })}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => remove.mutate(p.id)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit Punch Item #${editing.number}` : "Add Punch Item"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <TextField className="col-span-2" label="Title" value={form.title} onChange={set("title")} />
            <TextAreaField className="col-span-2" label="Description" value={form.description ?? ""} onChange={set("description")} />
            <SelectField label="Status" value={form.status ?? "Open"} onChange={set("status")} options={PUNCH_STATUSES} />
            <SelectField label="Priority" value={form.priority ?? "Medium"} onChange={set("priority")} options={PUNCH_PRIORITIES} />
            <TextField label="Location" value={form.location ?? ""} onChange={set("location")} />
            <TextField label="Trade" value={form.trade ?? ""} onChange={set("trade")} />
            <UserSelect label="Assignee" value={form.assignee ?? ""} onChange={set("assignee")} />
            <UserSelect label="Ball in Court" value={form.ballInCourt ?? ""} onChange={set("ballInCourt")} />
            <DateField label="Due Date" value={form.dueDate ?? null} onChange={set("dueDate")} />
          </div>
          {editing && (
            <AttachmentsSection entityType="punchItem" entityId={editing.id} title="Photos & Files" />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.title.trim() || create.isPending || update.isPending}>
              {editing ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
