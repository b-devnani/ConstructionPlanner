import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCrud } from "@/hooks/use-crud";
import {
  ChangeOrder, InsertChangeOrder, ChangeOrderLineItem, InsertChangeOrderLineItem,
  ChangeEvent, CHANGE_ORDER_STATUSES,
} from "@shared/procore";
import {
  PageHeader, StatusBadge, SearchInput, StatusFilter, EmptyState,
  TextField, SelectField, DateField, NumberField, TextAreaField, DetailRow, FormField,
} from "@/components/procore/shared";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Plus, Eye } from "lucide-react";
import { formatCurrency, formatDate, todayString } from "@/lib/format";

const emptyForm: InsertChangeOrder = {
  title: "", status: "Draft", changeEventId: null, description: "",
  scheduleImpactDays: 0, executed: false, signedDate: null, dateCreated: todayString(),
};
const emptyLine: Omit<InsertChangeOrderLineItem, "changeOrderId"> = {
  costCode: "", description: "", amount: 0,
};

export default function ChangeOrdersPage() {
  const orders = useCrud<ChangeOrder, InsertChangeOrder>("change-orders",
    ["/api/budget", "/api/prime-contract/financials"]);
  const events = useQuery<ChangeEvent[]>({ queryKey: ["/api/change-events"] });
  const allLines = useQuery<ChangeOrderLineItem[]>({
    queryKey: ["/api/change-order-line-items"],
    queryFn: async () => {
      const res = await fetch("/api/change-order-line-items", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
  });
  const lines = useCrud<ChangeOrderLineItem, InsertChangeOrderLineItem>(
    "change-order-lines", ["/api/change-order-line-items", "/api/budget", "/api/prime-contract/financials"],
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChangeOrder | null>(null);
  const [form, setForm] = useState<InsertChangeOrder>(emptyForm);
  const [viewing, setViewing] = useState<ChangeOrder | null>(null);
  const [newLine, setNewLine] = useState({ ...emptyLine });

  const allOrders = orders.query.data ?? [];
  const allLineItems = allLines.data ?? [];
  const eventList = events.data ?? [];

  const orderTotals = useMemo(() => {
    const map = new Map<number, number>();
    for (const line of allLineItems) {
      map.set(line.changeOrderId, (map.get(line.changeOrderId) ?? 0) + line.amount);
    }
    return map;
  }, [allLineItems]);

  const filtered = useMemo(
    () => allOrders.filter(o =>
      (statusFilter === "all" || o.status === statusFilter) &&
      (search === "" ||
        `${o.number} ${o.title}`.toLowerCase().includes(search.toLowerCase()))),
    [allOrders, search, statusFilter],
  );

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, dateCreated: todayString() }); setDialogOpen(true); };
  const openEdit = (o: ChangeOrder) => {
    setEditing(o);
    const { id, createdAt, ...rest } = o;
    setForm(rest);
    setDialogOpen(true);
  };

  const set = <K extends keyof InsertChangeOrder>(key: K) => (value: InsertChangeOrder[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.title.trim()) return;
    if (editing) await orders.update.mutateAsync({ id: editing.id, data: form });
    else await orders.create.mutateAsync(form);
    setDialogOpen(false);
  };

  const viewingLines = viewing
    ? allLineItems.filter(l => l.changeOrderId === viewing.id)
    : [];
  const viewingTotal = viewingLines.reduce((acc, l) => acc + l.amount, 0);

  const totalApproved = allOrders
    .filter(o => o.status === "Approved")
    .reduce((acc, o) => acc + (orderTotals.get(o.id) ?? 0), 0);
  const totalPending = allOrders
    .filter(o => o.status === "Pending - In Review" || o.status === "Draft")
    .reduce((acc, o) => acc + (orderTotals.get(o.id) ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Change Orders"
        subtitle={`Approved ${formatCurrency(totalApproved)} · Pending ${formatCurrency(totalPending)}`}
        onCreate={openCreate}
        createLabel="Create Change Order"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search change orders..." />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} options={CHANGE_ORDER_STATUSES} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No change orders match the current filters." />
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Change Event</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Signed</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(o => {
                const event = eventList.find(e => e.id === o.changeEventId);
                return (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => setViewing(o)}>
                    <TableCell className="font-medium">{o.number}</TableCell>
                    <TableCell className="max-w-72 truncate">{o.title}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell>{event ? `${event.number}` : "—"}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(orderTotals.get(o.id) ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">{o.scheduleImpactDays}</TableCell>
                    <TableCell>{formatDate(o.dateCreated)}</TableCell>
                    <TableCell>{formatDate(o.signedDate)}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewing(o)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(o)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                          onClick={() => orders.remove.mutate(o.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* View change order detail with line items */}
      <Dialog open={viewing !== null} onOpenChange={open => !open && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {viewing.number}: {viewing.title}
                  <StatusBadge status={viewing.status} />
                </DialogTitle>
              </DialogHeader>
              <div>
                <DetailRow label="Description">{viewing.description || "—"}</DetailRow>
                <DetailRow label="Schedule Impact">{viewing.scheduleImpactDays} days</DetailRow>
                <DetailRow label="Date Created">{formatDate(viewing.dateCreated)}</DetailRow>
                <DetailRow label="Signed Date">{formatDate(viewing.signedDate)}</DetailRow>
                <DetailRow label="Executed">{viewing.executed ? "Yes" : "No"}</DetailRow>
                {viewing.changeEventId && (
                  <DetailRow label="Source Change Event">
                    {eventList.find(e => e.id === viewing.changeEventId)?.number ?? "—"}
                  </DetailRow>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Line Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Cost Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right w-32">Amount</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingLines.map(l => (
                      <TableRow key={l.id}>
                        <TableCell>{l.costCode}</TableCell>
                        <TableCell>{l.description}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(l.amount)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                            onClick={() => lines.remove.mutate(l.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell>
                        <Input placeholder="Code" value={newLine.costCode}
                          onChange={e => setNewLine(r => ({ ...r, costCode: e.target.value }))} />
                      </TableCell>
                      <TableCell>
                        <Input placeholder="Description" value={newLine.description}
                          onChange={e => setNewLine(r => ({ ...r, description: e.target.value }))} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="text-right" value={newLine.amount || ""}
                          onChange={e => setNewLine(r => ({ ...r, amount: parseFloat(e.target.value) || 0 }))} />
                      </TableCell>
                      <TableCell>
                        <Button size="icon" className="h-8 w-8"
                          disabled={!newLine.description.trim() || lines.create.isPending}
                          onClick={async () => {
                            await lines.create.mutateAsync({ ...newLine, changeOrderId: viewing.id });
                            setNewLine({ ...emptyLine });
                          }}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2} className="font-semibold">Total</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatCurrency(viewingTotal)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.number}` : "Create Change Order"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <TextField className="col-span-2" label="Title" value={form.title} onChange={set("title")} />
            <SelectField label="Status" value={form.status ?? "Draft"} onChange={set("status")} options={CHANGE_ORDER_STATUSES} />
            <FormField label="Source Change Event">
              <Select
                value={form.changeEventId ? String(form.changeEventId) : "none"}
                onValueChange={v => set("changeEventId")(v === "none" ? null : parseInt(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {eventList.map(ev => (
                    <SelectItem key={ev.id} value={String(ev.id)}>
                      {ev.number} — {ev.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <NumberField label="Schedule Impact (days)" value={form.scheduleImpactDays ?? 0} onChange={set("scheduleImpactDays")} />
            <DateField label="Date Created" value={form.dateCreated ?? null} onChange={set("dateCreated")} />
            <DateField label="Signed Date" value={form.signedDate ?? null} onChange={set("signedDate")} />
            <FormField label="Executed">
              <label className="flex items-center gap-2 h-10 text-sm">
                <Checkbox checked={form.executed ?? false} onCheckedChange={v => set("executed")(v === true)} />
                Order executed
              </label>
            </FormField>
            <TextAreaField className="col-span-2" label="Description" value={form.description ?? ""} onChange={set("description")} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.title.trim() || orders.create.isPending || orders.update.isPending}>
              {editing ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
