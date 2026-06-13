import React, { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCrud } from "@/hooks/use-crud";
import {
  PrimeContract, ContractFinancials, SovLineItem, InsertSovLineItem, CONTRACT_STATUSES,
} from "@shared/procore";
import {
  PageHeader, StatusBadge, TextField, SelectField, DateField,
  NumberField, TextAreaField, FormField,
} from "@/components/procore/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

const FINANCIALS_KEY = "/api/prime-contract/financials";

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

const emptySovRow: InsertSovLineItem = { itemNumber: "", costCode: "", description: "", scheduledValue: 0 };

export default function PrimeContractPage() {
  const { toast } = useToast();
  const contractQuery = useQuery<PrimeContract>({ queryKey: ["/api/prime-contract"] });
  const financialsQuery = useQuery<ContractFinancials>({ queryKey: [FINANCIALS_KEY] });
  const sov = useCrud<SovLineItem, InsertSovLineItem>("sov-line-items", [FINANCIALS_KEY]);

  const [draft, setDraft] = useState<PrimeContract | null>(null);
  const [newRow, setNewRow] = useState<InsertSovLineItem>({ ...emptySovRow });

  useEffect(() => { setDraft(contractQuery.data ?? null); }, [contractQuery.data]);

  const saveContract = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      const { id, createdAt, ...data } = draft;
      await apiRequest("PUT", "/api/prime-contract", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prime-contract"] });
      toast({ title: "Prime contract saved" });
    },
    onError: (error: Error) =>
      toast({ title: "Request failed", description: error.message, variant: "destructive" }),
  });

  const set = <K extends keyof PrimeContract>(key: K) => (value: PrimeContract[K]) =>
    setDraft(d => (d ? { ...d, [key]: value } : d));

  const fin = financialsQuery.data;
  const sovItems = sov.query.data ?? [];
  const sovTotal = sovItems.reduce((acc, item) => acc + item.scheduledValue, 0);

  if (!draft) return null;

  return (
    <div>
      <PageHeader
        title={`Prime Contract ${draft.number}`}
        subtitle={draft.title}
      >
        <StatusBadge status={draft.status} />
        <Button onClick={() => saveContract.mutate()} disabled={saveContract.isPending}>
          Save Contract
        </Button>
      </PageHeader>

      {fin && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <SummaryCard label="Original Contract Value" value={formatCurrency(fin.originalContractValue)} />
          <SummaryCard label="Approved Change Orders" value={formatCurrency(fin.approvedChangeOrders)}
            accent={fin.approvedChangeOrders >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600"} />
          <SummaryCard label="Revised Contract Value" value={formatCurrency(fin.revisedContractValue)} />
          <SummaryCard label="Pending Change Orders" value={formatCurrency(fin.pendingChangeOrders)}
            accent="text-amber-600 dark:text-amber-400" />
          <SummaryCard label="Revised + Pending" value={formatCurrency(fin.pendingRevisedContractValue)} />
        </div>
      )}

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="sov">Schedule of Values ({sovItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Contract Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <TextField label="Contract Number" value={draft.number} onChange={set("number")} />
              <TextField className="md:col-span-2" label="Title" value={draft.title} onChange={set("title")} />
              <TextField label="Owner" value={draft.owner} onChange={set("owner")} />
              <TextField label="Contractor" value={draft.contractor} onChange={set("contractor")} />
              <TextField label="Architect / Engineer" value={draft.architect} onChange={set("architect")} />
              <SelectField label="Status" value={draft.status} onChange={set("status")} options={CONTRACT_STATUSES} />
              <NumberField label="Retainage (%)" value={draft.retainagePercent} onChange={set("retainagePercent")} />
              <FormField label="Executed">
                <label className="flex items-center gap-2 h-10 text-sm">
                  <Checkbox checked={draft.executed} onCheckedChange={v => set("executed")(v === true)} />
                  Contract executed
                </label>
              </FormField>
              <DateField label="Contract Date" value={draft.contractDate} onChange={set("contractDate")} />
              <DateField label="Start Date" value={draft.startDate} onChange={set("startDate")} />
              <DateField label="Substantial Completion" value={draft.substantialCompletionDate} onChange={set("substantialCompletionDate")} />
              <DateField label="Actual Completion" value={draft.actualCompletionDate} onChange={set("actualCompletionDate")} />
              <DateField label="Signed Contract Received" value={draft.signedContractReceivedDate} onChange={set("signedContractReceivedDate")} />
              <TextAreaField className="col-span-2 md:col-span-3" label="Description" value={draft.description} onChange={set("description")} />
              <TextAreaField className="col-span-2 md:col-span-3" label="Inclusions" value={draft.inclusions} onChange={set("inclusions")} rows={2} />
              <TextAreaField className="col-span-2 md:col-span-3" label="Exclusions" value={draft.exclusions} onChange={set("exclusions")} rows={2} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sov" className="mt-4">
          <div className="border rounded-md">
            <Table className="dense">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Item</TableHead>
                  <TableHead className="w-28">Cost Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-44">Scheduled Value</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sovItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.itemNumber}</TableCell>
                    <TableCell>{item.costCode}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(item.scheduledValue)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => sov.remove.mutate(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {/* inline add row */}
                <TableRow>
                  <TableCell>
                    <Input placeholder="#" value={newRow.itemNumber}
                      onChange={e => setNewRow(r => ({ ...r, itemNumber: e.target.value }))} />
                  </TableCell>
                  <TableCell>
                    <Input placeholder="Code" value={newRow.costCode}
                      onChange={e => setNewRow(r => ({ ...r, costCode: e.target.value }))} />
                  </TableCell>
                  <TableCell>
                    <Input placeholder="Description" value={newRow.description}
                      onChange={e => setNewRow(r => ({ ...r, description: e.target.value }))} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="text-right" value={newRow.scheduledValue || ""}
                      onChange={e => setNewRow(r => ({ ...r, scheduledValue: parseFloat(e.target.value) || 0 }))} />
                  </TableCell>
                  <TableCell>
                    <Button size="icon" className="h-8 w-8"
                      disabled={!newRow.description.trim() || sov.create.isPending}
                      onClick={async () => {
                        await sov.create.mutateAsync(newRow);
                        setNewRow({ ...emptySovRow });
                      }}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold">Original Contract Value</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(sovTotal)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Contract executed: {draft.executed ? "Yes" : "No"} · Signed contract received {formatDate(draft.signedContractReceivedDate)}
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
