import React, { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCrud } from "@/hooks/use-crud";
import {
  Submittal, InsertSubmittal, SUBMITTAL_STATUSES, SUBMITTAL_TYPES,
  SubmittalStep, STEP_STATUSES,
} from "@shared/procore";
import {
  PageHeader, StatusBadge, SearchInput, StatusFilter, EmptyState,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Plus } from "lucide-react";
import { formatDate } from "@/lib/format";

/** Approval chain editor + responder shown when editing a submittal. */
function WorkflowTab({ submittal, onSubmittalChange }: {
  submittal: Submittal;
  onSubmittalChange: () => void;
}) {
  const stepsKey = `/api/submittals/${submittal.id}/steps`;
  const stepsQuery = useQuery<SubmittalStep[]>({ queryKey: [stepsKey] });
  const steps = stepsQuery.data ?? [];

  const [newApprover, setNewApprover] = useState("");
  const [newDueDate, setNewDueDate] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<SubmittalStep | null>(null);
  const [responseStatus, setResponseStatus] = useState<SubmittalStep["status"]>("Approved");
  const [responseComments, setResponseComments] = useState("");

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [stepsKey] });
    onSubmittalChange();
  };

  const addStep = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/submittal-steps", {
        submittalId: submittal.id,
        stepNumber: (steps[steps.length - 1]?.stepNumber ?? 0) + 1,
        approverName: newApprover,
        approverUserId: null,
        dueDate: newDueDate,
        status: "Pending",
        comments: "",
        respondedAt: null,
      });
    },
    onSuccess: () => { setNewApprover(""); setNewDueDate(null); refresh(); },
  });

  const removeStep = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/submittal-steps/${id}`);
    },
    onSuccess: refresh,
  });

  const respond = useMutation({
    mutationFn: async () => {
      if (!respondingTo) return;
      await apiRequest("POST", `/api/submittal-steps/${respondingTo.id}/respond`, {
        status: responseStatus, comments: responseComments,
      });
    },
    onSuccess: () => { setRespondingTo(null); setResponseComments(""); refresh(); },
  });

  const firstPendingId = steps.find(s => s.status === "Pending")?.id;

  return (
    <div className="space-y-4">
      {steps.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No approval workflow yet. Add approvers below — adding the first step submits this
          item for review and moves ball-in-court to the first approver.
        </p>
      ) : (
        <ol className="space-y-2">
          {steps.map(step => (
            <li key={step.id} className="border rounded-md p-3 text-sm flex items-start gap-3">
              <span className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                {step.stepNumber}
              </span>
              <div className="flex-1">
                <div className="font-medium">{step.approverName}</div>
                <div className="text-xs text-muted-foreground">
                  Due {formatDate(step.dueDate)}
                  {step.respondedAt && ` · Responded ${new Date(step.respondedAt).toLocaleDateString()}`}
                </div>
                {step.comments && <div className="text-xs mt-1">{step.comments}</div>}
              </div>
              <StatusBadge status={step.status} />
              {step.status === "Pending" && step.id === firstPendingId && (
                <Button size="sm" variant="outline" onClick={() => setRespondingTo(step)}>
                  Respond
                </Button>
              )}
              {step.status === "Pending" && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                  onClick={() => removeStep.mutate(step.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="flex items-end gap-2 border-t pt-3">
        <div className="flex-1">
          <UserSelect label="Add Approver" value={newApprover} onChange={setNewApprover} allowNone={false} />
        </div>
        <div className="w-44">
          <DateField label="Due Date" value={newDueDate} onChange={setNewDueDate} />
        </div>
        <Button disabled={!newApprover || addStep.isPending} onClick={() => addStep.mutate()}>
          <Plus className="h-4 w-4 mr-1" /> Add Step
        </Button>
      </div>

      {respondingTo && (
        <div className="border rounded-md p-3 space-y-3 bg-muted/40">
          <div className="text-sm font-semibold">
            Respond as {respondingTo.approverName} (step {respondingTo.stepNumber})
          </div>
          <SelectField label="Response" value={responseStatus}
            onChange={setResponseStatus}
            options={STEP_STATUSES.filter(s => s !== "Pending")} />
          <Textarea rows={2} placeholder="Comments..."
            value={responseComments} onChange={e => setResponseComments(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setRespondingTo(null)}>Cancel</Button>
            <Button size="sm" onClick={() => respond.mutate()} disabled={respond.isPending}>
              Submit Response
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

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
          {(() => {
            const detailsForm = (
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
            );
            const footer = (
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={!form.title.trim() || create.isPending || update.isPending}>
                  {editing ? "Save Changes" : "Create"}
                </Button>
              </DialogFooter>
            );
            if (!editing) return <>{detailsForm}{footer}</>;
            return (
              <Tabs defaultValue="details">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="workflow">Approval Workflow</TabsTrigger>
                  <TabsTrigger value="attachments">Attachments</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="mt-4 space-y-4">
                  {detailsForm}
                  {footer}
                </TabsContent>
                <TabsContent value="workflow" className="mt-4">
                  <WorkflowTab
                    submittal={editing}
                    onSubmittalChange={() =>
                      queryClient.invalidateQueries({ queryKey: ["/api/submittals"] })}
                  />
                </TabsContent>
                <TabsContent value="attachments" className="mt-4">
                  <AttachmentsSection entityType="submittal" entityId={editing.id} />
                </TabsContent>
              </Tabs>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
