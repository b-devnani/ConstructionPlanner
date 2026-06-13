import React, { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useCrud } from "@/hooks/use-crud";
import {
  Rfi, InsertRfi, RFI_STATUSES, RFI_PRIORITIES, IMPACT_OPTIONS,
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
import { formatDate, formatCurrency, todayString } from "@/lib/format";

const emptyForm: InsertRfi = {
  subject: "", question: "", answer: "", status: "Draft", priority: "Medium",
  assignedTo: "", rfiManager: "", receivedFrom: "", responsibleContractor: "",
  specSection: "", drawingNumber: "", location: "", costImpact: "TBD",
  costImpactAmount: 0, scheduleImpact: "TBD", scheduleImpactDays: 0,
  ballInCourt: "", dateInitiated: null, dueDate: null, dateClosed: null,
};

export default function RfisPage() {
  const [, navigate] = useLocation();
  const { query, create, remove } = useCrud<Rfi, InsertRfi>("rfis");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<InsertRfi>(emptyForm);

  const rfis = query.data ?? [];
  const filtered = useMemo(
    () => rfis.filter(r =>
      (statusFilter === "all" || r.status === statusFilter) &&
      (search === "" ||
        `${r.number} ${r.subject} ${r.specSection} ${r.drawingNumber} ${r.assignedTo}`
          .toLowerCase().includes(search.toLowerCase()))),
    [rfis, search, statusFilter],
  );

  const openCreate = () => {
    setForm({ ...emptyForm, dateInitiated: todayString(), status: "Open" });
    setDialogOpen(true);
  };

  const set = <K extends keyof InsertRfi>(key: K) => (value: InsertRfi[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.subject.trim()) return;
    const created = await create.mutateAsync(form);
    setDialogOpen(false);
    navigate(`/rfis/${created.id}`);
  };

  return (
    <div>
      <PageHeader
        title="RFIs"
        subtitle={`${rfis.length} RFIs — ${rfis.filter(r => r.status === "Open").length} open`}
        onCreate={openCreate}
        createLabel="Create RFI"
      />

      <div className="flex flex-wrap gap-2 mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search RFIs..." />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} options={RFI_STATUSES} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No RFIs match the current filters." />
      ) : (
        <div className="border rounded">
          <Table className="dense">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-24">Priority</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Ball in Court</TableHead>
                <TableHead className="w-28">Due Date</TableHead>
                <TableHead className="text-right w-28">Cost Impact</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/rfis/${r.id}`)}
                >
                  <TableCell className="font-medium text-primary">{r.number}</TableCell>
                  <TableCell className="max-w-[28rem] truncate">{r.subject}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell><StatusBadge status={r.priority} /></TableCell>
                  <TableCell className="text-xs">{r.assignedTo || "—"}</TableCell>
                  <TableCell className="text-xs">{r.ballInCourt || "—"}</TableCell>
                  <TableCell className="text-xs">{formatDate(r.dueDate)}</TableCell>
                  <TableCell className="text-right text-xs">
                    {r.costImpact === "Yes" ? formatCurrency(r.costImpactAmount) : r.costImpact}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={() => remove.mutate(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create dialog (detail view + edits live on /rfis/:id) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create RFI</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <TextField className="col-span-2" label="Subject" value={form.subject} onChange={set("subject")} />
            <TextAreaField className="col-span-2" label="Question" value={form.question ?? ""} onChange={set("question")} rows={4} />
            <SelectField label="Status" value={form.status ?? "Draft"} onChange={set("status")} options={RFI_STATUSES} />
            <SelectField label="Priority" value={form.priority ?? "Medium"} onChange={set("priority")} options={RFI_PRIORITIES} />
            <UserSelect label="Assigned To" value={form.assignedTo ?? ""} onChange={set("assignedTo")} />
            <UserSelect label="RFI Manager" value={form.rfiManager ?? ""} onChange={set("rfiManager")} />
            <TextField label="Received From" value={form.receivedFrom ?? ""} onChange={set("receivedFrom")} />
            <TextField label="Responsible Contractor" value={form.responsibleContractor ?? ""} onChange={set("responsibleContractor")} />
            <TextField label="Spec Section" value={form.specSection ?? ""} onChange={set("specSection")} />
            <TextField label="Drawing Number" value={form.drawingNumber ?? ""} onChange={set("drawingNumber")} />
            <TextField label="Location" value={form.location ?? ""} onChange={set("location")} />
            <TextField label="Ball in Court" value={form.ballInCourt ?? ""} onChange={set("ballInCourt")} />
            <DateField label="Date Initiated" value={form.dateInitiated ?? null} onChange={set("dateInitiated")} />
            <DateField label="Due Date" value={form.dueDate ?? null} onChange={set("dueDate")} />
            <SelectField label="Cost Impact" value={form.costImpact ?? "TBD"} onChange={set("costImpact")} options={IMPACT_OPTIONS} />
            <NumberField label="Cost Impact Amount ($)" value={form.costImpactAmount ?? 0} onChange={set("costImpactAmount")} />
            <SelectField label="Schedule Impact" value={form.scheduleImpact ?? "TBD"} onChange={set("scheduleImpact")} options={IMPACT_OPTIONS} />
            <NumberField label="Schedule Impact (days)" value={form.scheduleImpactDays ?? 0} onChange={set("scheduleImpactDays")} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.subject.trim() || create.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
