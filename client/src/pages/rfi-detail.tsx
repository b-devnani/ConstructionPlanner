import React, { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCrud } from "@/hooks/use-crud";
import { useAuth } from "@/lib/AuthContext";
import {
  Rfi, InsertRfi, RFI_STATUSES, RFI_PRIORITIES, IMPACT_OPTIONS,
} from "@shared/procore";
import {
  RecordPage, KeyValueGrid, RecordSection,
} from "@/components/procore/RecordPage";
import {
  TextField, SelectField, DateField, NumberField, TextAreaField, FormField,
} from "@/components/procore/shared";
import { UserSelect } from "@/components/procore/UserSelect";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Check, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

export default function RfiDetailPage() {
  const [, params] = useRoute("/rfis/:id");
  const [, navigate] = useLocation();
  const id = parseInt(params?.id ?? "0");
  const { canEditFinancials } = useAuth();

  const query = useQuery<Rfi>({ queryKey: [`/api/rfis/${id}`] });
  const { update, remove } = useCrud<Rfi, InsertRfi>("rfis", [], "rfi");

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Rfi | null>(null);
  const [responseDraft, setResponseDraft] = useState("");

  const rfi = query.data;
  useEffect(() => {
    if (rfi) {
      setDraft(rfi);
      setResponseDraft(rfi.answer);
    }
  }, [rfi]);

  if (!rfi || !draft) return null;

  const set = <K extends keyof Rfi>(key: K) => (value: Rfi[K]) =>
    setDraft(d => d ? { ...d, [key]: value } : d);

  const saveEdits = async () => {
    const { id: _, createdAt, ...patch } = draft;
    await update.mutateAsync({ id: rfi.id, data: patch });
    setEditing(false);
  };

  const submitResponse = async (close: boolean) => {
    await update.mutateAsync({
      id: rfi.id,
      data: { answer: responseDraft, ...(close ? { status: "Closed", ballInCourt: "" } : {}) },
    });
  };

  const detailsTab = editing ? (
    <div className="grid grid-cols-2 gap-4">
      <TextField className="col-span-2" label="Subject" value={draft.subject} onChange={set("subject")} />
      <TextAreaField className="col-span-2" label="Question" value={draft.question} onChange={set("question")} rows={4} />
      <SelectField label="Status" value={draft.status} onChange={set("status")} options={RFI_STATUSES} />
      <SelectField label="Priority" value={draft.priority} onChange={set("priority")} options={RFI_PRIORITIES} />
      <UserSelect label="Assigned To" value={draft.assignedTo} onChange={set("assignedTo")} />
      <UserSelect label="RFI Manager" value={draft.rfiManager} onChange={set("rfiManager")} />
      <TextField label="Received From" value={draft.receivedFrom} onChange={set("receivedFrom")} />
      <TextField label="Responsible Contractor" value={draft.responsibleContractor} onChange={set("responsibleContractor")} />
      <TextField label="Spec Section" value={draft.specSection} onChange={set("specSection")} />
      <TextField label="Drawing Number" value={draft.drawingNumber} onChange={set("drawingNumber")} />
      <TextField label="Location" value={draft.location} onChange={set("location")} />
      <UserSelect label="Ball in Court" value={draft.ballInCourt} onChange={set("ballInCourt")} />
      <DateField label="Date Initiated" value={draft.dateInitiated} onChange={set("dateInitiated")} />
      <DateField label="Due Date" value={draft.dueDate} onChange={set("dueDate")} />
      <SelectField label="Cost Impact" value={draft.costImpact} onChange={set("costImpact")} options={IMPACT_OPTIONS} />
      <NumberField label="Cost Impact Amount ($)" value={draft.costImpactAmount} onChange={set("costImpactAmount")} />
      <SelectField label="Schedule Impact" value={draft.scheduleImpact} onChange={set("scheduleImpact")} options={IMPACT_OPTIONS} />
      <NumberField label="Schedule Impact (days)" value={draft.scheduleImpactDays} onChange={set("scheduleImpactDays")} />
      <div className="col-span-2 flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => { setDraft(rfi); setEditing(false); }}>
          Cancel
        </Button>
        <Button onClick={saveEdits} disabled={update.isPending}>
          <Check className="h-4 w-4 mr-1" /> Save Changes
        </Button>
      </div>
    </div>
  ) : (
    <div className="space-y-6">
      <RecordSection title="Question">
        <div className="text-sm whitespace-pre-wrap bg-muted/40 rounded p-3 border">
          {rfi.question || <span className="text-muted-foreground">No question provided.</span>}
        </div>
      </RecordSection>

      <RecordSection title="Official Response">
        {rfi.status === "Closed" ? (
          <div className="text-sm whitespace-pre-wrap bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded p-3">
            {rfi.answer || <span className="text-muted-foreground">Closed without a response.</span>}
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              rows={4}
              placeholder="Draft the official response..."
              value={responseDraft}
              onChange={e => setResponseDraft(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => submitResponse(false)}
                disabled={update.isPending || responseDraft === rfi.answer}>
                Save Response
              </Button>
              <Button size="sm" onClick={() => submitResponse(true)}
                disabled={update.isPending || !responseDraft.trim()}>
                Respond &amp; Close
              </Button>
            </div>
          </div>
        )}
      </RecordSection>

      <RecordSection title="Details">
        <KeyValueGrid items={[
          { label: "Status", value: rfi.status },
          { label: "Priority", value: rfi.priority },
          { label: "Assigned To", value: rfi.assignedTo },
          { label: "RFI Manager", value: rfi.rfiManager },
          { label: "Received From", value: rfi.receivedFrom },
          { label: "Responsible Contractor", value: rfi.responsibleContractor },
          { label: "Spec Section", value: rfi.specSection },
          { label: "Drawing Number", value: rfi.drawingNumber },
          { label: "Location", value: rfi.location },
          { label: "Ball in Court", value: rfi.ballInCourt },
          { label: "Date Initiated", value: formatDate(rfi.dateInitiated) },
          { label: "Due Date", value: formatDate(rfi.dueDate) },
          { label: "Date Closed", value: formatDate(rfi.dateClosed) },
          { label: "Cost Impact", value: rfi.costImpact === "Yes" ? formatCurrency(rfi.costImpactAmount) : rfi.costImpact },
          { label: "Schedule Impact", value: rfi.scheduleImpact === "Yes" ? `${rfi.scheduleImpactDays} days` : rfi.scheduleImpact },
        ]} />
      </RecordSection>
    </div>
  );

  return (
    <RecordPage
      backHref="/rfis"
      backLabel="All RFIs"
      number={rfi.number}
      title={rfi.subject}
      statuses={[rfi.status, rfi.priority]}
      headerFields={[
        { label: "Assigned To", value: rfi.assignedTo || "—" },
        { label: "Ball in Court", value: rfi.ballInCourt || "—" },
        { label: "Due Date", value: formatDate(rfi.dueDate) },
        { label: "Cost Impact", value: rfi.costImpact === "Yes" ? formatCurrency(rfi.costImpactAmount) : rfi.costImpact },
      ]}
      actions={
        editing ? null : (
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button
              variant="outline" size="sm" className="text-destructive"
              onClick={async () => {
                await remove.mutateAsync(rfi.id);
                navigate("/rfis");
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </>
        )
      }
      tabs={[{ id: "details", label: "Details", content: detailsTab }]}
      entityType="rfi"
      entityId={rfi.id}
    />
  );
}
