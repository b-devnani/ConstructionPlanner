import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCrud } from "@/hooks/use-crud";
import { useAuth } from "@/lib/AuthContext";
import {
  Commitment, InsertCommitment, CommitmentLineItem,
  COMMITMENT_TYPES, COMMITMENT_STATUSES,
} from "@shared/procore";
import {
  PageHeader, StatusBadge, SearchInput, StatusFilter, EmptyState,
  TextField, SelectField, DateField, NumberField, TextAreaField,
} from "@/components/procore/shared";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

const emptyForm: InsertCommitment = {
  title: "", commitmentType: "Subcontract", status: "Draft", vendor: "",
  executedDate: null, retainagePercent: 10, description: "",
};

export default function CommitmentsPage() {
  const [, navigate] = useLocation();
  const { canEditFinancials } = useAuth();
  const commitments = useCrud<Commitment, InsertCommitment>("commitments", ["/api/budget"]);
  const allLines = useQuery<CommitmentLineItem[]>({ queryKey: ["/api/commitment-line-items"] });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<InsertCommitment>(emptyForm);

  const all = commitments.query.data ?? [];
  const allLineItems = allLines.data ?? [];

  const totals = useMemo(() => {
    const map = new Map<number, number>();
    for (const line of allLineItems) {
      map.set(line.commitmentId, (map.get(line.commitmentId) ?? 0) + line.amount);
    }
    return map;
  }, [allLineItems]);

  const filtered = useMemo(
    () => all.filter(c =>
      (statusFilter === "all" || c.status === statusFilter) &&
      (search === "" ||
        `${c.number} ${c.title} ${c.vendor}`.toLowerCase().includes(search.toLowerCase()))),
    [all, search, statusFilter],
  );

  const executedTotal = all
    .filter(c => c.status === "Executed" || c.status === "Complete")
    .reduce((acc, c) => acc + (totals.get(c.id) ?? 0), 0);

  const openCreate = () => { setForm(emptyForm); setDialogOpen(true); };
  const set = <K extends keyof InsertCommitment>(key: K) => (value: InsertCommitment[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.title.trim()) return;
    const created = await commitments.create.mutateAsync(form);
    setDialogOpen(false);
    navigate(`/commitments/${created.id}`);
  };

  return (
    <div>
      <PageHeader
        title="Commitments"
        subtitle={`${all.length} subcontracts & POs — ${formatCurrency(executedTotal)} executed`}
        onCreate={canEditFinancials ? openCreate : undefined}
        createLabel="Create Commitment"
      />

      <div className="flex flex-wrap gap-2 mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search commitments..." />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} options={COMMITMENT_STATUSES} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No commitments match the current filters." />
      ) : (
        <div className="border rounded">
          <Table className="dense">
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-32">Type</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="w-36">Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-28">Executed</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/commitments/${c.id}`)}
                >
                  <TableCell className="font-medium text-primary">{c.number}</TableCell>
                  <TableCell className="max-w-[24rem] truncate">{c.title}</TableCell>
                  <TableCell className="text-xs">{c.commitmentType}</TableCell>
                  <TableCell className="text-xs">{c.vendor || "—"}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(totals.get(c.id) ?? 0)}</TableCell>
                  <TableCell className="text-xs">{formatDate(c.executedDate)}</TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    {canEditFinancials && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        onClick={() => commitments.remove.mutate(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Create Commitment</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <TextField className="col-span-2" label="Title" value={form.title} onChange={set("title")} />
            <SelectField label="Type" value={form.commitmentType ?? "Subcontract"} onChange={set("commitmentType")} options={COMMITMENT_TYPES} />
            <SelectField label="Status" value={form.status ?? "Draft"} onChange={set("status")} options={COMMITMENT_STATUSES} />
            <TextField label="Vendor" value={form.vendor ?? ""} onChange={set("vendor")} />
            <NumberField label="Retainage (%)" value={form.retainagePercent ?? 10} onChange={set("retainagePercent")} />
            <DateField label="Executed Date" value={form.executedDate ?? null} onChange={set("executedDate")} />
            <TextAreaField className="col-span-2" label="Description" value={form.description ?? ""} onChange={set("description")} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.title.trim() || commitments.create.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
