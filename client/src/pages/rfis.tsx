import React, { useMemo, useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import {
  Rfi, InsertRfi, RFI_STATUSES, RFI_PRIORITIES, IMPACT_OPTIONS,
} from "@shared/procore";
import {
  PageHeader, StatusBadge, SearchInput, StatusFilter, EmptyState, DetailRow,
  TextField, SelectField, DateField, NumberField, TextAreaField,
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
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Eye } from "lucide-react";
import { formatDate, formatCurrency, todayString } from "@/lib/format";

const emptyForm: InsertRfi = {
  subject: "", question: "", answer: "", status: "Draft", priority: "Medium",
  assignedTo: "", rfiManager: "", receivedFrom: "", responsibleContractor: "",
  specSection: "", drawingNumber: "", location: "", costImpact: "TBD",
  costImpactAmount: 0, scheduleImpact: "TBD", scheduleImpactDays: 0,
  ballInCourt: "", dateInitiated: null, dueDate: null, dateClosed: null,
};

export default function RfisPage() {
  const { query, create, update, remove } = useCrud<Rfi, InsertRfi>("rfis");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Rfi | null>(null);
  const [form, setForm] = useState<InsertRfi>(emptyForm);
  const [viewing, setViewing] = useState<Rfi | null>(null);
  const [responseDraft, setResponseDraft] = useState("");

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
    setEditing(null);
    setForm({ ...emptyForm, dateInitiated: todayString(), status: "Open" });
    setDialogOpen(true);
  };
  const openEdit = (r: Rfi) => {
    setEditing(r);
    const { id, createdAt, ...rest } = r;
    setForm(rest);
    setDialogOpen(true);
  };
  const openView = (r: Rfi) => { setViewing(r); setResponseDraft(r.answer); };

  const set = <K extends keyof InsertRfi>(key: K) => (value: InsertRfi[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.subject.trim()) return;
    if (editing) await update.mutateAsync({ id: editing.id, data: form });
    else await create.mutateAsync(form);
    setDialogOpen(false);
  };

  const submitResponse = async (close: boolean) => {
    if (!viewing) return;
    const updated = await update.mutateAsync({
      id: viewing.id,
      data: { answer: responseDraft, ...(close ? { status: "Closed" as const, ballInCourt: "" } : {}) },
    });
    setViewing(updated);
  };

  return (
    <div>
      <PageHeader
        title="RFIs"
        subtitle={`${rfis.length} RFIs — ${rfis.filter(r => r.status === "Open").length} open`}
        onCreate={openCreate}
        createLabel="Create RFI"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search RFIs..." />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} options={RFI_STATUSES} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No RFIs match the current filters." />
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Ball in Court</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Cost Impact</TableHead>
                <TableHead className="w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => openView(r)}>
                  <TableCell className="font-medium">{r.number}</TableCell>
                  <TableCell className="max-w-80 truncate">{r.subject}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell><StatusBadge status={r.priority} /></TableCell>
                  <TableCell>{r.assignedTo || "—"}</TableCell>
                  <TableCell>{r.ballInCourt || "—"}</TableCell>
                  <TableCell>{formatDate(r.dueDate)}</TableCell>
                  <TableCell>
                    {r.costImpact === "Yes" ? formatCurrency(r.costImpactAmount) : r.costImpact}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => remove.mutate(r.id)}>
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

      {/* Detail / respond dialog */}
      <Dialog open={viewing !== null} onOpenChange={open => !open && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {viewing.number}: {viewing.subject}
                  <StatusBadge status={viewing.status} />
                </DialogTitle>
              </DialogHeader>
              <div>
                <DetailRow label="Priority"><StatusBadge status={viewing.priority} /></DetailRow>
                <DetailRow label="Assigned To">{viewing.assignedTo || "—"}</DetailRow>
                <DetailRow label="RFI Manager">{viewing.rfiManager || "—"}</DetailRow>
                <DetailRow label="Received From">{viewing.receivedFrom || "—"}</DetailRow>
                <DetailRow label="Ball in Court">{viewing.ballInCourt || "—"}</DetailRow>
                <DetailRow label="Spec / Drawing">{viewing.specSection || "—"} / {viewing.drawingNumber || "—"}</DetailRow>
                <DetailRow label="Location">{viewing.location || "—"}</DetailRow>
                <DetailRow label="Dates">
                  Initiated {formatDate(viewing.dateInitiated)} · Due {formatDate(viewing.dueDate)}
                  {viewing.dateClosed && <> · Closed {formatDate(viewing.dateClosed)}</>}
                </DetailRow>
                <DetailRow label="Cost Impact">
                  {viewing.costImpact === "Yes" ? formatCurrency(viewing.costImpactAmount) : viewing.costImpact}
                </DetailRow>
                <DetailRow label="Schedule Impact">
                  {viewing.scheduleImpact === "Yes" ? `${viewing.scheduleImpactDays} days` : viewing.scheduleImpact}
                </DetailRow>
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-semibold">Question</div>
                <div className="text-sm whitespace-pre-wrap bg-muted rounded-md p-3">
                  {viewing.question || "No question provided."}
                </div>
              </div>
              <AttachmentsSection entityType="rfi" entityId={viewing.id} />
              <div className="space-y-1.5">
                <div className="text-sm font-semibold">Official Response</div>
                {viewing.status === "Closed" ? (
                  <div className="text-sm whitespace-pre-wrap bg-muted rounded-md p-3">
                    {viewing.answer || "Closed without a response."}
                  </div>
                ) : (
                  <Textarea
                    rows={4}
                    placeholder="Draft the official response..."
                    value={responseDraft}
                    onChange={e => setResponseDraft(e.target.value)}
                  />
                )}
              </div>
              <DialogFooter>
                {viewing.status !== "Closed" && (
                  <>
                    <Button variant="outline" onClick={() => submitResponse(false)} disabled={update.isPending}>
                      Save Response
                    </Button>
                    <Button onClick={() => submitResponse(true)} disabled={update.isPending}>
                      Respond &amp; Close
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit RFI ${editing.number}` : "Create RFI"}</DialogTitle>
          </DialogHeader>
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
            <Button onClick={save} disabled={!form.subject.trim() || create.isPending || update.isPending}>
              {editing ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
