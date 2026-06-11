import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useCrud } from "@/hooks/use-crud";
import {
  Submittal, InsertSubmittal, SUBMITTAL_STATUSES, SUBMITTAL_TYPES,
} from "@shared/procore";
import {
  PageHeader, StatusBadge, SearchInput, StatusFilter, EmptyState,
  TextField, SelectField, DateField, NumberField, TextAreaField,
} from "@/components/procore/shared";
import { UserSelect } from "@/components/procore/UserSelect";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";

const emptyForm: InsertSubmittal = {
  title: "", revision: 0, specSection: "", submittalType: "Product Data",
  status: "Draft", responsibleContractor: "", receivedFrom: "", submitBy: "",
  ballInCourt: "", dateSubmitted: null, dateReturned: null, dueDate: null,
  leadTimeDays: 0, requiredOnSiteDate: null, description: "",
};

export default function SubmittalsPage() {
  const [, navigate] = useLocation();
  const { query, create, remove } = useCrud<Submittal, InsertSubmittal>("submittals");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const openCreate = () => { setForm(emptyForm); setDialogOpen(true); };

  const set = <K extends keyof InsertSubmittal>(key: K) => (value: InsertSubmittal[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.title.trim()) return;
    const created = await create.mutateAsync(form);
    setDialogOpen(false);
    navigate(`/submittals/${created.id}`);
  };

  return (
    <div>
      <PageHeader
        title="Submittals"
        subtitle={`${submittals.length} submittals — ${submittals.filter(s => !["Approved", "Approved as Noted", "Closed", "Rejected"].includes(s.status)).length} in flight`}
        onCreate={openCreate}
        createLabel="Create Submittal"
      />

      <div className="flex flex-wrap gap-2 mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search submittals..." />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} options={SUBMITTAL_STATUSES} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No submittals match the current filters." />
      ) : (
        <div className="border rounded">
          <Table className="dense">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead className="w-12">Rev</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-28">Spec</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead>Ball in Court</TableHead>
                <TableHead className="w-28">Due Date</TableHead>
                <TableHead className="w-32">Required On Site</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/submittals/${s.id}`)}
                >
                  <TableCell className="font-medium text-primary">{s.number}</TableCell>
                  <TableCell className="text-xs">{s.revision}</TableCell>
                  <TableCell className="max-w-[24rem] truncate">{s.title}</TableCell>
                  <TableCell className="text-xs">{s.specSection || "—"}</TableCell>
                  <TableCell className="text-xs">{s.submittalType}</TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                  <TableCell className="text-xs">{s.ballInCourt || "—"}</TableCell>
                  <TableCell className="text-xs">{formatDate(s.dueDate)}</TableCell>
                  <TableCell className="text-xs">{formatDate(s.requiredOnSiteDate)}</TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={() => remove.mutate(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create dialog (detail + workflow live on /submittals/:id) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Submittal</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <TextField className="col-span-2" label="Title" value={form.title} onChange={set("title")} />
            <TextField label="Spec Section" value={form.specSection ?? ""} onChange={set("specSection")} placeholder="e.g. 03 30 00" />
            <NumberField label="Revision" value={form.revision ?? 0} onChange={set("revision")} />
            <SelectField label="Type" value={form.submittalType ?? "Product Data"} onChange={set("submittalType")} options={SUBMITTAL_TYPES} />
            <SelectField label="Status" value={form.status ?? "Draft"} onChange={set("status")} options={SUBMITTAL_STATUSES} />
            <TextField label="Responsible Contractor" value={form.responsibleContractor ?? ""} onChange={set("responsibleContractor")} />
            <TextField label="Received From" value={form.receivedFrom ?? ""} onChange={set("receivedFrom")} />
            <UserSelect label="Submit By" value={form.submitBy ?? ""} onChange={set("submitBy")} />
            <UserSelect label="Ball in Court" value={form.ballInCourt ?? ""} onChange={set("ballInCourt")} />
            <DateField label="Date Submitted" value={form.dateSubmitted ?? null} onChange={set("dateSubmitted")} />
            <DateField label="Date Returned" value={form.dateReturned ?? null} onChange={set("dateReturned")} />
            <DateField label="Due Date" value={form.dueDate ?? null} onChange={set("dueDate")} />
            <NumberField label="Lead Time (days)" value={form.leadTimeDays ?? 0} onChange={set("leadTimeDays")} />
            <DateField label="Required On Site" value={form.requiredOnSiteDate ?? null} onChange={set("requiredOnSiteDate")} />
            <TextAreaField className="col-span-2" label="Description" value={form.description ?? ""} onChange={set("description")} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.title.trim() || create.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
