import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCrud } from "@/hooks/use-crud";
import { useAuth } from "@/lib/AuthContext";
import {
  Commitment, InsertCommitment, CommitmentLineItem, InsertCommitmentLineItem,
  COMMITMENT_TYPES, COMMITMENT_STATUSES,
} from "@shared/procore";
import {
  PageHeader, StatusBadge, SearchInput, StatusFilter, EmptyState,
  TextField, SelectField, DateField, NumberField, TextAreaField, DetailRow,
} from "@/components/procore/shared";
import { AttachmentsSection } from "@/components/procore/AttachmentsSection";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Eye } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

const emptyForm: InsertCommitment = {
  title: "", commitmentType: "Subcontract", status: "Draft", vendor: "",
  executedDate: null, retainagePercent: 10, description: "",
};
const emptyLine: Omit<InsertCommitmentLineItem, "commitmentId"> = {
  costCode: "", description: "", amount: 0,
};

export default function CommitmentsPage() {
  const { canEditFinancials } = useAuth();
  const commitments = useCrud<Commitment, InsertCommitment>("commitments", ["/api/budget"]);
  const allLines = useQuery<CommitmentLineItem[]>({
    queryKey: ["/api/commitment-line-items"],
  });
  const lines = useCrud<CommitmentLineItem, InsertCommitmentLineItem>(
    "commitment-lines", ["/api/commitment-line-items", "/api/budget"],
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Commitment | null>(null);
  const [form, setForm] = useState<InsertCommitment>(emptyForm);
  const [viewing, setViewing] = useState<Commitment | null>(null);
  const [newLine, setNewLine] = useState({ ...emptyLine });

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

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (c: Commitment) => {
    setEditing(c);
    const { id, createdAt, ...rest } = c;
    setForm(rest);
    setDialogOpen(true);
  };

  const set = <K extends keyof InsertCommitment>(key: K) => (value: InsertCommitment[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.title.trim()) return;
    if (editing) await commitments.update.mutateAsync({ id: editing.id, data: form });
    else await commitments.create.mutateAsync(form);
    setDialogOpen(false);
  };

  const viewingLines = viewing ? allLineItems.filter(l => l.commitmentId === viewing.id) : [];
  const viewingTotal = viewingLines.reduce((acc, l) => acc + l.amount, 0);

  return (
    <div>
      <PageHeader
        title="Commitments"
        subtitle={`${all.length} subcontracts & POs — ${formatCurrency(executedTotal)} executed`}
        onCreate={canEditFinancials ? openCreate : undefined}
        createLabel="Create Commitment"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search commitments..." />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} options={COMMITMENT_STATUSES} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No commitments match the current filters." />
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Executed</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setViewing(c)}>
                  <TableCell className="font-medium">{c.number}</TableCell>
                  <TableCell className="max-w-72 truncate">{c.title}</TableCell>
                  <TableCell>{c.commitmentType}</TableCell>
                  <TableCell>{c.vendor || "—"}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(totals.get(c.id) ?? 0)}</TableCell>
                  <TableCell>{formatDate(c.executedDate)}</TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewing(c)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEditFinancials && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                            onClick={() => commitments.remove.mutate(c.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail dialog */}
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
                <DetailRow label="Type">{viewing.commitmentType}</DetailRow>
                <DetailRow label="Vendor">{viewing.vendor || "—"}</DetailRow>
                <DetailRow label="Executed Date">{formatDate(viewing.executedDate)}</DetailRow>
                <DetailRow label="Retainage">{viewing.retainagePercent}%</DetailRow>
                <DetailRow label="Description">{viewing.description || "—"}</DetailRow>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Schedule of Values</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Cost Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right w-36">Amount</TableHead>
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
                          {canEditFinancials && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                              onClick={() => lines.remove.mutate(l.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {canEditFinancials && (
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
                              await lines.create.mutateAsync({ ...newLine, commitmentId: viewing.id });
                              setNewLine({ ...emptyLine });
                            }}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2} className="font-semibold">Commitment Total</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatCurrency(viewingTotal)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
              <AttachmentsSection entityType="commitment" entityId={viewing.id} title="Contract Documents" />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.number}` : "Create Commitment"}</DialogTitle>
          </DialogHeader>
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
            <Button onClick={save} disabled={!form.title.trim() || commitments.create.isPending || commitments.update.isPending}>
              {editing ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
