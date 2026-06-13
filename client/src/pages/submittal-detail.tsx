import React, { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCrud } from "@/hooks/use-crud";
import {
  Submittal, InsertSubmittal, SUBMITTAL_STATUSES, SUBMITTAL_TYPES,
  SubmittalStep, STEP_STATUSES,
} from "@shared/procore";
import {
  RecordPage, KeyValueGrid, RecordSection,
} from "@/components/procore/RecordPage";
import {
  TextField, SelectField, DateField, NumberField, TextAreaField, StatusBadge,
} from "@/components/procore/shared";
import { UserSelect } from "@/components/procore/UserSelect";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Check, Plus } from "lucide-react";
import { formatDate } from "@/lib/format";

function WorkflowTab({ submittal }: { submittal: Submittal }) {
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
    queryClient.invalidateQueries({ queryKey: [`/api/submittals/${submittal.id}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/activity?entityType=submittal&entityId=${submittal.id}`] });
  };

  const addStep = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/submittal-steps", {
        submittalId: submittal.id,
        stepNumber: (steps[steps.length - 1]?.stepNumber ?? 0) + 1,
        approverName: newApprover, approverUserId: null,
        dueDate: newDueDate, status: "Pending", comments: "", respondedAt: null,
      });
    },
    onSuccess: () => { setNewApprover(""); setNewDueDate(null); refresh(); },
  });

  const removeStep = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/submittal-steps/${id}`); },
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
            <li key={step.id} className="border rounded p-3 text-sm flex items-start gap-3 bg-card">
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
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                  onClick={() => removeStep.mutate(step.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
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
        <div className="border rounded p-3 space-y-3 bg-muted/40">
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

export default function SubmittalDetailPage() {
  const [, params] = useRoute("/submittals/:id");
  const [, navigate] = useLocation();
  const id = parseInt(params?.id ?? "0");

  const query = useQuery<Submittal>({ queryKey: [`/api/submittals/${id}`] });
  const { update, remove } = useCrud<Submittal, InsertSubmittal>("submittals", [], "submittal");

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Submittal | null>(null);

  const submittal = query.data;
  useEffect(() => { if (submittal) setDraft(submittal); }, [submittal]);

  if (!submittal || !draft) return null;

  const set = <K extends keyof Submittal>(key: K) => (value: Submittal[K]) =>
    setDraft(d => d ? { ...d, [key]: value } : d);

  const saveEdits = async () => {
    const { id: _, createdAt, ...patch } = draft;
    await update.mutateAsync({ id: submittal.id, data: patch });
    setEditing(false);
  };

  const detailsTab = editing ? (
    <div className="grid grid-cols-2 gap-4">
      <TextField className="col-span-2" label="Title" value={draft.title} onChange={set("title")} />
      <TextField label="Spec Section" value={draft.specSection} onChange={set("specSection")} placeholder="e.g. 03 30 00" />
      <NumberField label="Revision" value={draft.revision} onChange={set("revision")} />
      <SelectField label="Type" value={draft.submittalType} onChange={set("submittalType")} options={SUBMITTAL_TYPES} />
      <SelectField label="Status" value={draft.status} onChange={set("status")} options={SUBMITTAL_STATUSES} />
      <TextField label="Responsible Contractor" value={draft.responsibleContractor} onChange={set("responsibleContractor")} />
      <TextField label="Received From" value={draft.receivedFrom} onChange={set("receivedFrom")} />
      <UserSelect label="Submit By" value={draft.submitBy} onChange={set("submitBy")} />
      <UserSelect label="Ball in Court" value={draft.ballInCourt} onChange={set("ballInCourt")} />
      <DateField label="Date Submitted" value={draft.dateSubmitted} onChange={set("dateSubmitted")} />
      <DateField label="Date Returned" value={draft.dateReturned} onChange={set("dateReturned")} />
      <DateField label="Due Date" value={draft.dueDate} onChange={set("dueDate")} />
      <NumberField label="Lead Time (days)" value={draft.leadTimeDays} onChange={set("leadTimeDays")} />
      <DateField label="Required On Site" value={draft.requiredOnSiteDate} onChange={set("requiredOnSiteDate")} />
      <TextAreaField className="col-span-2" label="Description" value={draft.description} onChange={set("description")} />
      <div className="col-span-2 flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => { setDraft(submittal); setEditing(false); }}>Cancel</Button>
        <Button onClick={saveEdits} disabled={update.isPending}>
          <Check className="h-4 w-4 mr-1" /> Save Changes
        </Button>
      </div>
    </div>
  ) : (
    <div className="space-y-6">
      {submittal.description && (
        <RecordSection title="Description">
          <p className="text-sm whitespace-pre-wrap">{submittal.description}</p>
        </RecordSection>
      )}
      <RecordSection title="Details">
        <KeyValueGrid items={[
          { label: "Revision", value: submittal.revision },
          { label: "Type", value: submittal.submittalType },
          { label: "Spec Section", value: submittal.specSection },
          { label: "Responsible Contractor", value: submittal.responsibleContractor },
          { label: "Received From", value: submittal.receivedFrom },
          { label: "Submit By", value: submittal.submitBy },
          { label: "Ball in Court", value: submittal.ballInCourt },
          { label: "Date Submitted", value: formatDate(submittal.dateSubmitted) },
          { label: "Date Returned", value: formatDate(submittal.dateReturned) },
          { label: "Due Date", value: formatDate(submittal.dueDate) },
          { label: "Lead Time", value: `${submittal.leadTimeDays} days` },
          { label: "Required On Site", value: formatDate(submittal.requiredOnSiteDate) },
        ]} />
      </RecordSection>
    </div>
  );

  return (
    <RecordPage
      backHref="/submittals"
      backLabel="All Submittals"
      number={submittal.number}
      title={submittal.title}
      statuses={[submittal.status]}
      headerFields={[
        { label: "Type", value: submittal.submittalType },
        { label: "Spec Section", value: submittal.specSection || "—" },
        { label: "Ball in Court", value: submittal.ballInCourt || "—" },
        { label: "Due Date", value: formatDate(submittal.dueDate) },
      ]}
      actions={
        editing ? null : (
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            <Button
              variant="outline" size="sm" className="text-destructive"
              onClick={async () => { await remove.mutateAsync(submittal.id); navigate("/submittals"); }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </>
        )
      }
      tabs={[
        { id: "details", label: "Details", content: detailsTab },
        { id: "workflow", label: "Workflow", content: <WorkflowTab submittal={submittal} /> },
      ]}
      entityType="submittal"
      entityId={submittal.id}
    />
  );
}
