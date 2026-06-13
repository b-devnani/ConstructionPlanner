import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCrud } from "@/hooks/use-crud";
import {
  ChangeOrder, InsertChangeOrder, ChangeOrderLineItem,
  ChangeEvent, CHANGE_ORDER_STATUSES,
} from "@shared/procore";
import {
  PageHeader, StatusBadge, SearchInput, StatusFilter, EmptyState,
  TextField, SelectField, DateField, NumberField, TextAreaField, FormField,
} from "@/components/procore/shared";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { formatCurrency, formatDate, todayString } from "@/lib/format";

const emptyForm: InsertChangeOrder = {
  title: "", status: "Draft", changeEventId: null, description: "",
  scheduleImpactDays: 0, executed: false, signedDate: null, dateCreated: todayString(),
};

export default function ChangeOrdersPage() {
  const [, navigate] = useLocation();
  const orders = useCrud<ChangeOrder, InsertChangeOrder>("change-orders",
    ["/api/budget", "/api/prime-contract/financials"]);
  const events = useQuery<ChangeEvent[]>({ queryKey: ["/api/change-events"] });
  const allLines = useQuery<ChangeOrderLineItem[]>({ queryKey: ["/api/change-order-line-items"] });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<InsertChangeOrder>(emptyForm);

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

  const openCreate = () => { setForm({ ...emptyForm, dateCreated: todayString() }); setDialogOpen(true); };
  const set = <K extends keyof InsertChangeOrder>(key: K) => (value: InsertChangeOrder[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.title.trim()) return;
    const created = await orders.create.mutateAsync(form);
    setDialogOpen(false);
    navigate(`/change-orders/${created.id}`);
  };

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

      <div className="flex flex-wrap gap-2 mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search change orders..." />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} options={CHANGE_ORDER_STATUSES} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No change orders match the current filters." />
      ) : (
        <div className="border rounded">
          <Table className="dense">
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-36">Status</TableHead>
                <TableHead>Change Event</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right w-16">Days</TableHead>
                <TableHead className="w-28">Date Created</TableHead>
                <TableHead className="w-24">Signed</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(o => {
                const event = eventList.find(e => e.id === o.changeEventId);
                return (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/change-orders/${o.id}`)}
                  >
                    <TableCell className="font-medium text-primary">{o.number}</TableCell>
                    <TableCell className="max-w-[24rem] truncate">{o.title}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-xs">{event ? event.number : "—"}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(orderTotals.get(o.id) ?? 0)}
                    </TableCell>
                    <TableCell className="text-right text-xs">{o.scheduleImpactDays}</TableCell>
                    <TableCell className="text-xs">{formatDate(o.dateCreated)}</TableCell>
                    <TableCell className="text-xs">{formatDate(o.signedDate)}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        onClick={() => orders.remove.mutate(o.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Create Change Order</DialogTitle></DialogHeader>
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
                    <SelectItem key={ev.id} value={String(ev.id)}>{ev.number} — {ev.title}</SelectItem>
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
            <Button onClick={save} disabled={!form.title.trim() || orders.create.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
