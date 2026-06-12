import React, { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCrud } from "@/hooks/use-crud";
import {
  ChangeOrder, InsertChangeOrder, ChangeOrderLineItem, InsertChangeOrderLineItem,
  ChangeEvent, CHANGE_ORDER_STATUSES,
} from "@shared/procore";
import { RecordPage, KeyValueGrid, RecordSection } from "@/components/procore/RecordPage";
import {
  TextField, SelectField, DateField, NumberField, TextAreaField, FormField,
} from "@/components/procore/shared";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2, Check, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

const emptyLine: Omit<InsertChangeOrderLineItem, "changeOrderId"> = {
  costCode: "", description: "", amount: 0,
};

export default function ChangeOrderDetailPage() {
  const [, params] = useRoute("/change-orders/:id");
  const [, navigate] = useLocation();
  const id = parseInt(params?.id ?? "0");

  const query = useQuery<ChangeOrder>({ queryKey: [`/api/change-orders/${id}`] });
  const events = useQuery<ChangeEvent[]>({ queryKey: ["/api/change-events"] });
  const { update, remove } = useCrud<ChangeOrder, InsertChangeOrder>(
    "change-orders", ["/api/budget", "/api/prime-contract/financials"], "changeOrder",
  );
  const lines = useCrud<ChangeOrderLineItem, InsertChangeOrderLineItem>(
    "change-order-lines",
    ["/api/change-order-line-items", "/api/budget", "/api/prime-contract/financials"],
  );
  const allLines = useQuery<ChangeOrderLineItem[]>({ queryKey: ["/api/change-order-line-items"] });
  const itemLines = (allLines.data ?? []).filter(l => l.changeOrderId === id);
  const linesTotal = itemLines.reduce((acc, l) => acc + l.amount, 0);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ChangeOrder | null>(null);
  const [newLine, setNewLine] = useState({ ...emptyLine });

  const order = query.data;
  useEffect(() => { if (order) setDraft(order); }, [order]);

  if (!order || !draft) return null;

  const sourceEvent = events.data?.find(e => e.id === order.changeEventId);
  const set = <K extends keyof ChangeOrder>(key: K) => (value: ChangeOrder[K]) =>
    setDraft(d => d ? { ...d, [key]: value } : d);

  const saveEdits = async () => {
    const { id: _, createdAt, ...patch } = draft;
    await update.mutateAsync({ id: order.id, data: patch });
    setEditing(false);
  };

  const detailsTab = editing ? (
    <div className="grid grid-cols-2 gap-4">
      <TextField className="col-span-2" label="Title" value={draft.title} onChange={set("title")} />
      <SelectField label="Status" value={draft.status} onChange={set("status")} options={CHANGE_ORDER_STATUSES} />
      <FormField label="Source Change Event">
        <Select
          value={draft.changeEventId ? String(draft.changeEventId) : "none"}
          onValueChange={v => set("changeEventId")(v === "none" ? null : parseInt(v))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— None —</SelectItem>
            {(events.data ?? []).map(ev => (
              <SelectItem key={ev.id} value={String(ev.id)}>{ev.number} — {ev.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <NumberField label="Schedule Impact (days)" value={draft.scheduleImpactDays} onChange={set("scheduleImpactDays")} />
      <DateField label="Date Created" value={draft.dateCreated} onChange={set("dateCreated")} />
      <DateField label="Signed Date" value={draft.signedDate} onChange={set("signedDate")} />
      <FormField label="Executed">
        <label className="flex items-center gap-2 h-10 text-sm">
          <Checkbox checked={draft.executed} onCheckedChange={v => set("executed")(v === true)} />
          Order executed
        </label>
      </FormField>
      <TextAreaField className="col-span-2" label="Description" value={draft.description} onChange={set("description")} />
      <div className="col-span-2 flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => { setDraft(order); setEditing(false); }}>Cancel</Button>
        <Button onClick={saveEdits} disabled={update.isPending}>
          <Check className="h-4 w-4 mr-1" /> Save Changes
        </Button>
      </div>
    </div>
  ) : (
    <div className="space-y-6">
      {order.description && (
        <RecordSection title="Description">
          <p className="text-sm whitespace-pre-wrap">{order.description}</p>
        </RecordSection>
      )}
      <RecordSection title="Details">
        <KeyValueGrid items={[
          { label: "Status", value: order.status },
          { label: "Schedule Impact", value: `${order.scheduleImpactDays} days` },
          { label: "Date Created", value: formatDate(order.dateCreated) },
          { label: "Signed Date", value: formatDate(order.signedDate) },
          { label: "Executed", value: order.executed ? "Yes" : "No" },
          { label: "Source Change Event", value: sourceEvent ? `${sourceEvent.number} — ${sourceEvent.title}` : "—" },
        ]} />
      </RecordSection>
    </div>
  );

  const linesTab = (
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
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                onClick={() => lines.remove.mutate(l.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
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
                await lines.create.mutateAsync({ ...newLine, changeOrderId: id });
                setNewLine({ ...emptyLine });
              }}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </TableCell>
        </TableRow>
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
      backHref="/change-orders"
      backLabel="All Change Orders"
      number={order.number}
      title={order.title}
      statuses={[order.status]}
      headerFields={[
        { label: "Amount", value: formatCurrency(linesTotal) },
        { label: "Schedule Impact", value: `${order.scheduleImpactDays} days` },
        { label: "Source Event", value: sourceEvent?.number ?? "—" },
        { label: "Signed", value: formatDate(order.signedDate) },
      ]}
      actions={
        editing ? null : (
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            <Button
              variant="outline" size="sm" className="text-destructive"
              onClick={async () => { await remove.mutateAsync(order.id); navigate("/change-orders"); }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </>
        )
      }
      tabs={[
        { id: "details", label: "Details", content: detailsTab },
        { id: "lines", label: "Line Items", count: itemLines.length, content: linesTab },
      ]}
      entityType="changeOrder"
      entityId={order.id}
    />
  );
}
