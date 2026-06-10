import React, { useMemo, useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import {
  Submittal, InsertSubmittal, SUBMITTAL_STATUSES, SUBMITTAL_TYPES,
} from "@shared/procore";
import {
  PageHeader, StatusBadge, SearchInput, StatusFilter, EmptyState,
  TextField, SelectField, DateField, NumberField, TextAreaField,
} from "@/components/procore/shared";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";

const emptyForm: InsertSubmittal = {
  title: "", revision: 0, specSection: "", submittalType: "Product Data",
  status: "Draft", responsibleContractor: "", receivedFrom: "", submitBy: "",
  ballInCourt: "", dateSubmitted: null, dateReturned: null, dueDate: null,
  leadTimeDays: 0, requiredOnSiteDate: null, description: "",
};

export default function SubmittalsPage() {
  const { query, create, update, remove } = useCrud<Submittal, InsertSubmittal>("submittals");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Submittal | null>(null);
  const [form, setForm] = useState<InsertSubmittal>(emptyForm);

  const submittals = query.data ?? [];
  const filtered = useMemo(
    () => submittals.filter(s =>
      (statusFilter === "all" || s.status === statusFilter) &&
      (search === "" ||
        `${s.number} ${s.title} ${s.specSection} ${s.responsibleContractor}`
          .toLowerCase().includes(search.toLowerCase()))),
    [submittals, search, statusFilter],
  );

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (s: Submittal) => {
    setEditing(s);
    const { id, createdAt, ...rest } = s;
    setForm(rest);
    setDialogOpen(true);
  };

  const set = <K extends keyof InsertSubmittal>(key: K) => (value: InsertSubmittal[K]) =>
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
        title="Submittals"
        subtitle={`${submittals.length} submittals — ${submittals.filter(s => !["Approved", "Approved as Noted", "Closed", "Rejected"].includes(s.status)).length} in flight`}
        onCreate={openCreate}
        createLabel="Create Submittal"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search submittals..." />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} options={SUBMITTAL_STATUSES} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No submittals match the current filters." />
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Rev</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Spec Section</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ball in Court</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Required On Site</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => openEdit(s)}>
                  <TableCell className="font-medium">{s.number}</TableCell>
                  <TableCell>{s.revision}</TableCell>
                  <TableCell className="max-w-72 truncate">{s.title}</TableCell>
                  <TableCell>{s.specSection || "—"}</TableCell>
                  <TableCell>{s.submittalType}</TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                  <TableCell>{s.ballInCourt || "—"}</TableCell>
                  <TableCell>{formatDate(s.dueDate)}</TableCell>
                  <TableCell>{formatDate(s.requiredOnSiteDate)}</TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => remove.mutate(s.id)}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit Submittal ${editing.number}` : "Create Submittal"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <TextField className="col-span-2" label="Title" value={form.title} onChange={set("title")} />
            <TextField label="Spec Section" value={form.specSection ?? ""} onChange={set("specSection")} placeholder="e.g. 03 30 00" />
            <NumberField label="Revision" value={form.revision ?? 0} onChange={set("revision")} />
            <SelectField label="Type" value={form.submittalType ?? "Product Data"} onChange={set("submittalType")} options={SUBMITTAL_TYPES} />
            <SelectField label="Status" value={form.status ?? "Draft"} onChange={set("status")} options={SUBMITTAL_STATUSES} />
            <TextField label="Responsible Contractor" value={form.responsibleContractor ?? ""} onChange={set("responsibleContractor")} />
            <TextField label="Received From" value={form.receivedFrom ?? ""} onChange={set("receivedFrom")} />
            <TextField label="Submit By" value={form.submitBy ?? ""} onChange={set("submitBy")} />
            <TextField label="Ball in Court" value={form.ballInCourt ?? ""} onChange={set("ballInCourt")} />
            <DateField label="Date Submitted" value={form.dateSubmitted ?? null} onChange={set("dateSubmitted")} />
            <DateField label="Date Returned" value={form.dateReturned ?? null} onChange={set("dateReturned")} />
            <DateField label="Due Date" value={form.dueDate ?? null} onChange={set("dueDate")} />
            <NumberField label="Lead Time (days)" value={form.leadTimeDays ?? 0} onChange={set("leadTimeDays")} />
            <DateField label="Required On Site" value={form.requiredOnSiteDate ?? null} onChange={set("requiredOnSiteDate")} />
            <TextAreaField className="col-span-2" label="Description" value={form.description ?? ""} onChange={set("description")} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.title.trim() || create.isPending || update.isPending}>
              {editing ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
