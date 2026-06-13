import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCrud } from "@/hooks/use-crud";
import {
  BudgetSummary, BudgetLineItem, InsertBudgetLineItem,
} from "@shared/procore";
import {
  PageHeader, TextField, NumberField, EmptyState,
} from "@/components/procore/shared";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Download } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const emptyForm: InsertBudgetLineItem = {
  costCode: "", description: "", originalBudget: 0, budgetModifications: 0,
  committedCosts: 0, directCosts: 0, pendingBudgetChanges: 0,
};

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`text-xl font-semibold mt-1 ${accent ?? ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

export default function BudgetPage() {
  const summary = useQuery<BudgetSummary>({ queryKey: ["/api/budget"] });
  const lines = useCrud<BudgetLineItem, InsertBudgetLineItem>("budget-line-items", ["/api/budget"]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetLineItem | null>(null);
  const [form, setForm] = useState<InsertBudgetLineItem>(emptyForm);

  const rows = summary.data?.rows ?? [];
  const totals = summary.data?.totals;

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (row: BudgetLineItem) => {
    setEditing(row);
    const { id, ...rest } = row;
    setForm(rest);
    setDialogOpen(true);
  };

  const set = <K extends keyof InsertBudgetLineItem>(key: K) => (value: InsertBudgetLineItem[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.costCode.trim() || !form.description.trim()) return;
    if (editing) await lines.update.mutateAsync({ id: editing.id, data: form });
    else await lines.create.mutateAsync(form);
    setDialogOpen(false);
  };

  const overUnderClass = (value: number) =>
    value >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

  return (
    <div>
      <PageHeader
        title="Budget"
        subtitle="Project financial roll-up by cost code — committed costs include executed commitments"
        onCreate={openCreate}
        createLabel="Add Budget Line"
      >
        <Button variant="outline" onClick={() => window.open("/api/budget/export.csv", "_blank")}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </PageHeader>

      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard label="Revised Budget" value={formatCurrency(totals.revisedBudget)} />
          <SummaryCard label="Projected Costs" value={formatCurrency(totals.projectedCosts)} />
          <SummaryCard label="Projected Over / Under"
            value={formatCurrency(totals.projectedOverUnder)}
            accent={overUnderClass(totals.projectedOverUnder)} />
          <SummaryCard label="Forecast to Complete"
            value={formatCurrency(totals.forecastToComplete)} />
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState message="No budget line items yet." />
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <Table className="dense">
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Cost Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Original Budget</TableHead>
                <TableHead className="text-right">Budget Mods</TableHead>
                <TableHead className="text-right">Approved COs</TableHead>
                <TableHead className="text-right">Revised Budget</TableHead>
                <TableHead className="text-right">Committed</TableHead>
                <TableHead className="text-right">Direct Costs</TableHead>
                <TableHead className="text-right">Pending Changes</TableHead>
                <TableHead className="text-right">Projected Costs</TableHead>
                <TableHead className="text-right">Over / Under</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.costCode}</TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(row.originalBudget)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(row.budgetModifications)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(row.approvedCOs)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(row.revisedBudget)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(row.committedCosts)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(row.directCosts)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(row.pendingBudgetChanges)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(row.projectedCosts)}</TableCell>
                  <TableCell className={`text-right font-mono font-semibold ${overUnderClass(row.projectedOverUnder)}`}>
                    {formatCurrency(row.projectedOverUnder)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => lines.remove.mutate(row.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {totals && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(totals.originalBudget)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(totals.budgetModifications)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(totals.approvedCOs)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(totals.revisedBudget)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(totals.committedCosts)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(totals.directCosts)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(totals.pendingBudgetChanges)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(totals.projectedCosts)}</TableCell>
                  <TableCell className={`text-right font-mono font-semibold ${overUnderClass(totals.projectedOverUnder)}`}>
                    {formatCurrency(totals.projectedOverUnder)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit Budget Line ${editing.costCode}` : "Add Budget Line"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Cost Code" value={form.costCode} onChange={set("costCode")} placeholder="e.g. 03-000" />
            <TextField label="Description" value={form.description} onChange={set("description")} />
            <NumberField label="Original Budget" value={form.originalBudget} onChange={set("originalBudget")} />
            <NumberField label="Budget Modifications" value={form.budgetModifications} onChange={set("budgetModifications")} />
            <NumberField label="Committed Costs" value={form.committedCosts} onChange={set("committedCosts")} />
            <NumberField label="Direct Costs" value={form.directCosts} onChange={set("directCosts")} />
            <NumberField label="Pending Budget Changes" value={form.pendingBudgetChanges} onChange={set("pendingBudgetChanges")} />
          </div>
          <p className="text-xs text-muted-foreground">
            Approved change orders are pulled in automatically from the Change Orders register based on matching cost code.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}
              disabled={!form.costCode.trim() || !form.description.trim() || lines.create.isPending || lines.update.isPending}>
              {editing ? "Save Changes" : "Add Line"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
