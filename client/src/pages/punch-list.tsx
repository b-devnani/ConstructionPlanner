import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useCrud } from "@/hooks/use-crud";
import {
  PunchItem, InsertPunchItem, PUNCH_STATUSES, PUNCH_PRIORITIES,
} from "@shared/procore";
import {
  PageHeader, StatusBadge, SearchInput, StatusFilter, EmptyState,
  TextField, SelectField, DateField, TextAreaField,
} from "@/components/procore/shared";
import { UserSelect } from "@/components/procore/UserSelect";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/format";

const emptyForm: InsertPunchItem = {
  title: "", description: "", status: "Open", priority: "Medium",
  location: "", trade: "", assignee: "", ballInCourt: "",
  dueDate: null, dateClosed: null,
};

export default function PunchListPage() {
  const [, navigate] = useLocation();
  const { query, create, update, remove } = useCrud<PunchItem, InsertPunchItem>("punch-items");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const openCreate = () => { setForm(emptyForm); setDialogOpen(true); };
  const set = <K extends keyof InsertPunchItem>(key: K) => (value: InsertPunchItem[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.title.trim()) return;
    const created = await create.mutateAsync(form);
    setDialogOpen(false);
    navigate(`/punch-list/${created.id}`);
  };

  return (
    <div>
      <PageHeader
        title="Punch List"
        subtitle={`${items.length} items — ${openCount} open, ${reviewCount} ready for review`}
        onCreate={openCreate}
        createLabel="Add Punch Item"
      />

      <div className="flex flex-wrap gap-2 mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search punch items..." />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} options={PUNCH_STATUSES} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No punch items match the current filters." />
      ) : (
        <div className="border rounded">
          <Table className="dense">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-24">Priority</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead className="w-24">Due</TableHead>
                <TableHead className="w-24">Closed</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/punch-list/${p.id}`)}
                >
                  <TableCell className="font-medium text-primary">{p.number}</TableCell>
                  <TableCell className="max-w-[24rem] truncate">{p.title}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                  <TableCell><StatusBadge status={p.priority} /></TableCell>
                  <TableCell className="text-xs">{p.location || "—"}</TableCell>
                  <TableCell className="text-xs">{p.trade || "—"}</TableCell>
                  <TableCell className="text-xs">{p.assignee || "—"}</TableCell>
                  <TableCell className="text-xs">{formatDate(p.dueDate)}</TableCell>
                  <TableCell className="text-xs">{formatDate(p.dateClosed)}</TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {p.status !== "Closed" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600"
                          title="Close item"
                          onClick={() => update.mutate({ id: p.id, data: { status: "Closed" } })}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        onClick={() => remove.mutate(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
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
          <DialogHeader><DialogTitle>Add Punch Item</DialogTitle></DialogHeader>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.title.trim() || create.isPending}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
