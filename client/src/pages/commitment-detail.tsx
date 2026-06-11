import React, { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCrud } from "@/hooks/use-crud";
import { useAuth } from "@/lib/AuthContext";
import {
  Commitment, InsertCommitment, CommitmentLineItem, InsertCommitmentLineItem,
  COMMITMENT_TYPES, COMMITMENT_STATUSES,
} from "@shared/procore";
import { RecordPage, KeyValueGrid, RecordSection } from "@/components/procore/RecordPage";
import {
  TextField, SelectField, DateField, NumberField, TextAreaField,
} from "@/components/procore/shared";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Check, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

const emptyLine: Omit<InsertCommitmentLineItem, "commitmentId"> = {
  costCode: "", description: "", amount: 0,
};

export default function CommitmentDetailPage() {
  const [, params] = useRoute("/commitments/:id");
  const [, navigate] = useLocation();
  const { canEditFinancials } = useAuth();
  const id = parseInt(params?.id ?? "0");

  const query = useQuery<Commitment>({ queryKey: [`/api/commitments/${id}`] });
  const { update, remove } = useCrud<Commitment, InsertCommitment>("commitments", ["/api/budget"]);
  const lines = useCrud<CommitmentLineItem, InsertCommitmentLineItem>(
    "commitment-lines", ["/api/commitment-line-items", "/api/budget"],
  );
  const allLines = useQuery<CommitmentLineItem[]>({ queryKey: ["/api/commitment-line-items"] });
  const itemLines = (allLines.data ?? []).filter(l => l.commitmentId === id);
  const linesTotal = itemLines.reduce((acc, l) => acc + l.amount, 0);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Commitment | null>(null);
  const [newLine, setNewLine] = useState({ ...emptyLine });

  const commitment = query.data;
  useEffect(() => { if (commitment) setDraft(commitment); }, [commitment]);

  if (!commitment || !draft) return null;

  const set = <K extends keyof Commitment>(key: K) => (value: Commitment[K]) =>
    setDraft(d => d ? { ...d, [key]: value } : d);

  const saveEdits = async () => {
    const { id: _, createdAt, ...patch } = draft;
    await update.mutateAsync({ id: commitment.id, data: patch });
    setEditing(false);
  };

  const detailsTab = editing ? (
    <div className="grid grid-cols-2 gap-4">
      <TextField className="col-span-2" label="Title" value={draft.title} onChange={set("title")} />
      <SelectField label="Type" value={draft.commitmentType} onChange={set("commitmentType")} options={COMMITMENT_TYPES} />
      <SelectField label="Status" value={draft.status} onChange={set("status")} options={COMMITMENT_STATUSES} />
      <TextField label="Vendor" value={draft.vendor} onChange={set("vendor")} />
      <NumberField label="Retainage (%)" value={draft.retainagePercent} onChange={set("retainagePercent")} />
      <DateField label="Executed Date" value={draft.executedDate} onChange={set("executedDate")} />
      <TextAreaField className="col-span-2" label="Description" value={draft.description} onChange={set("description")} />
      <div className="col-span-2 flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => { setDraft(commitment); setEditing(false); }}>Cancel</Button>
        <Button onClick={saveEdits} disabled={update.isPending}>
          <Check className="h-4 w-4 mr-1" /> Save Changes
        </Button>
      </div>
    </div>
  ) : (
    <div className="space-y-6">
      {commitment.description && (
        <RecordSection title="Description">
          <p className="text-sm whitespace-pre-wrap">{commitment.description}</p>
        </RecordSection>
      )}
      <RecordSection title="Details">
        <KeyValueGrid items={[
          { label: "Type", value: commitment.commitmentType },
          { label: "Vendor", value: commitment.vendor },
          { label: "Status", value: commitment.status },
          { label: "Retainage", value: `${commitment.retainagePercent}%` },
          { label: "Executed Date", value: formatDate(commitment.executedDate) },
        ]} />
      </RecordSection>
    </div>
  );

  const sovTab = (
    <Table className="dense">
      <TableHeader>
        <TableRow>
          <TableHead className="w-28">Cost Code</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right w-32">Amount</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {itemLines.map(l => (
          <TableRow key={l.id}>
            <TableCell>{l.costCode}</TableCell>
            <TableCell>{l.description}</TableCell>
            <TableCell className="text-right font-mono">{formatCurrency(l.amount)}</TableCell>
            <TableCell>
              {canEditFinancials && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                  onClick={() => lines.remove.mutate(l.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
        {canEditFinancials && (
          <TableRow>
            <TableCell>
              <Input className="h-7 text-xs" placeholder="Code" value={newLine.costCode}
                onChange={e => setNewLine(r => ({ ...r, costCode: e.target.value }))} />
            </TableCell>
            <TableCell>
              <Input className="h-7 text-xs" placeholder="Description" value={newLine.description}
                onChange={e => setNewLine(r => ({ ...r, description: e.target.value }))} />
            </TableCell>
            <TableCell>
              <Input className="h-7 text-xs text-right" type="number" value={newLine.amount || ""}
                onChange={e => setNewLine(r => ({ ...r, amount: parseFloat(e.target.value) || 0 }))} />
            </TableCell>
            <TableCell>
              <Button size="icon" className="h-7 w-7"
                disabled={!newLine.description.trim() || lines.create.isPending}
                onClick={async () => {
                  await lines.create.mutateAsync({ ...newLine, commitmentId: id });
                  setNewLine({ ...emptyLine });
                }}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2} className="font-semibold">Total</TableCell>
          <TableCell className="text-right font-mono font-semibold">{formatCurrency(linesTotal)}</TableCell>
          <TableCell></TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );

  return (
    <RecordPage
      backHref="/commitments"
      backLabel="All Commitments"
      number={commitment.number}
      title={commitment.title}
      statuses={[commitment.status]}
      headerFields={[
        { label: "Type", value: commitment.commitmentType },
        { label: "Vendor", value: commitment.vendor || "—" },
        { label: "Amount", value: formatCurrency(linesTotal) },
        { label: "Executed", value: formatDate(commitment.executedDate) },
      ]}
      actions={
        editing || !canEditFinancials ? null : (
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            <Button
              variant="outline" size="sm" className="text-destructive"
              onClick={async () => { await remove.mutateAsync(commitment.id); navigate("/commitments"); }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </>
        )
      }
      tabs={[
        { id: "details", label: "Details", content: detailsTab },
        { id: "sov", label: "Schedule of Values", count: itemLines.length, content: sovTab },
      ]}
      entityType="commitment"
      entityId={commitment.id}
      attachmentsLabel="Contract Documents"
    />
  );
}
