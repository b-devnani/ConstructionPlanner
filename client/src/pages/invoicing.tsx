import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCrud } from "@/hooks/use-crud";
import { useAuth } from "@/lib/AuthContext";
import {
  OwnerInvoice, InsertOwnerInvoice, G702Summary, INVOICE_STATUSES,
} from "@shared/procore";
import {
  PageHeader, StatusBadge, EmptyState, DateField, SelectField,
} from "@/components/procore/shared";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, FileText } from "lucide-react";
import { formatCurrency, formatDate, todayString } from "@/lib/format";

function SummaryCell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between py-1.5 text-sm border-b border-dashed last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

export default function InvoicingPage() {
  const { toast } = useToast();
  const { canEditFinancials } = useAuth();
  const invoices = useCrud<OwnerInvoice, InsertOwnerInvoice>("invoices");
  const [createOpen, setCreateOpen] = useState(false);
  const [periodEnd, setPeriodEnd] = useState<string | null>(todayString());
  const [viewingId, setViewingId] = useState<number | null>(null);

  const g702Key = viewingId ? `/api/invoices/${viewingId}/g702` : null;
  const g702Query = useQuery<G702Summary>({
    queryKey: [g702Key ?? "g702-none"],
    enabled: !!g702Key,
  });
  const g702 = g702Query.data;

  const updateLine = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, number> }) => {
      await apiRequest("PUT", `/api/invoice-lines/${id}`, data);
    },
    onSuccess: () => {
      if (g702Key) queryClient.invalidateQueries({ queryKey: [g702Key] });
    },
    onError: (error: Error) =>
      toast({ title: "Request failed", description: error.message, variant: "destructive" }),
  });

  const all = invoices.query.data ?? [];

  const createInvoice = async () => {
    if (!periodEnd) return;
    const created = await invoices.create.mutateAsync({
      periodStart: null, periodEnd, billingDate: todayString(), status: "Draft",
    });
    setCreateOpen(false);
    setViewingId(created.id);
  };

  const setStatus = (invoice: OwnerInvoice, status: OwnerInvoice["status"]) =>
    invoices.update.mutate({ id: invoice.id, data: { status } });

  return (
    <div>
      <PageHeader
        title="Invoicing"
        subtitle="Owner payment applications (G702/G703)"
        onCreate={canEditFinancials ? () => setCreateOpen(true) : undefined}
        createLabel="Create Pay App"
      />

      {all.length === 0 ? (
        <EmptyState message="No payment applications yet. Create one to bill against the schedule of values." />
      ) : (
        <div className="border rounded-md mb-6">
          <Table className="dense">
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">#</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead>Billing Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-44"></TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map(inv => (
                <TableRow key={inv.id} className="cursor-pointer" onClick={() => setViewingId(inv.id)}>
                  <TableCell className="font-medium">{inv.number}</TableCell>
                  <TableCell>{formatDate(inv.periodEnd)}</TableCell>
                  <TableCell>{formatDate(inv.billingDate)}</TableCell>
                  <TableCell><StatusBadge status={inv.status} /></TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    {canEditFinancials && (
                      <SelectField label="" value={inv.status}
                        onChange={status => setStatus(inv, status)} options={INVOICE_STATUSES} />
                    )}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingId(inv.id)}>
                        <FileText className="h-4 w-4" />
                      </Button>
                      {canEditFinancials && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                          onClick={() => { invoices.remove.mutate(inv.id); if (viewingId === inv.id) setViewingId(null); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* G702/G703 detail */}
      {g702 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">
            Application {g702.invoice.number} — Period ending {formatDate(g702.invoice.periodEnd)}
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold mb-2">Application for Payment (G702)</h3>
                <SummaryCell label="1. Original Contract Sum" value={formatCurrency(g702.originalContractSum, true)} />
                <SummaryCell label="2. Net Change by Change Orders" value={formatCurrency(g702.netChangeOrders, true)} />
                <SummaryCell label="3. Contract Sum to Date" value={formatCurrency(g702.contractSumToDate, true)} strong />
                <SummaryCell label="4. Total Completed & Stored to Date" value={formatCurrency(g702.totalCompletedAndStored, true)} />
                <SummaryCell label={`5. Retainage (${g702.retainagePercent}%)`} value={formatCurrency(g702.totalRetainage, true)} />
                <SummaryCell label="6. Total Earned Less Retainage" value={formatCurrency(g702.totalEarnedLessRetainage, true)} />
                <SummaryCell label="7. Less Previous Certificates" value={formatCurrency(g702.previousCertificates, true)} />
                <SummaryCell label="8. Current Payment Due" value={formatCurrency(g702.currentPaymentDue, true)} strong />
                <SummaryCell label="9. Balance to Finish, Incl. Retainage" value={formatCurrency(g702.balanceToFinishIncludingRetainage, true)} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
                <h3 className="text-sm font-semibold text-foreground">How to bill</h3>
                <p>Enter this period’s work and stored materials per line on the continuation sheet below. Totals, retainage, and payment due update automatically.</p>
                <p>Previous applications are locked in as “Previous Completed” — create a new pay app each billing period.</p>
                <p>Retainage uses the prime contract rate ({g702.retainagePercent}%). Adjust it on the Prime Contract tool.</p>
              </CardContent>
            </Card>
          </div>

          <div className="border rounded-md overflow-x-auto">
            <Table className="dense">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Item</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Scheduled Value</TableHead>
                  <TableHead className="text-right">Previous Completed</TableHead>
                  <TableHead className="text-right w-36">This Period</TableHead>
                  <TableHead className="text-right w-36">Stored Materials</TableHead>
                  <TableHead className="text-right">Total Completed</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Balance to Finish</TableHead>
                  <TableHead className="text-right">Retainage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {g702.rows.map(row => (
                  <TableRow key={row.lineItemId}>
                    <TableCell>{row.itemNumber}</TableCell>
                    <TableCell className="max-w-56 truncate">{row.description}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row.scheduledValue)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row.previousCompleted)}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        className="text-right h-8"
                        disabled={!canEditFinancials || g702.invoice.status === "Paid"}
                        defaultValue={row.workThisPeriod || ""}
                        key={`work-${row.lineItemId}-${row.workThisPeriod}`}
                        onBlur={e => {
                          const value = parseFloat(e.target.value) || 0;
                          if (value !== row.workThisPeriod) {
                            updateLine.mutate({ id: row.lineItemId, data: { workThisPeriod: value } });
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        className="text-right h-8"
                        disabled={!canEditFinancials || g702.invoice.status === "Paid"}
                        defaultValue={row.storedMaterials || ""}
                        key={`stored-${row.lineItemId}-${row.storedMaterials}`}
                        onBlur={e => {
                          const value = parseFloat(e.target.value) || 0;
                          if (value !== row.storedMaterials) {
                            updateLine.mutate({ id: row.lineItemId, data: { storedMaterials: value } });
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row.totalCompletedAndStored)}</TableCell>
                    <TableCell className="text-right">{row.percentComplete.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row.balanceToFinish)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row.retainage)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-semibold">Totals</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(g702.contractSumToDate)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatCurrency(g702.rows.reduce((acc, r) => acc + r.previousCompleted, 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatCurrency(g702.rows.reduce((acc, r) => acc + r.workThisPeriod, 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatCurrency(g702.rows.reduce((acc, r) => acc + r.storedMaterials, 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(g702.totalCompletedAndStored)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatCurrency(g702.rows.reduce((acc, r) => acc + r.balanceToFinish, 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(g702.totalRetainage)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create Payment Application</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            A new pay app is created with one line per schedule-of-values item, carrying forward
            amounts billed on previous applications.
          </p>
          <DateField label="Billing Period End" value={periodEnd} onChange={setPeriodEnd} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createInvoice} disabled={!periodEnd || invoices.create.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
