import React, { useMemo, useState } from "react";
import { useCrud } from "@/hooks/use-crud";
import { SpecSection, InsertSpecSection } from "@shared/procore";
import {
  PageHeader, SearchInput, EmptyState, TextField, DateField,
} from "@/components/procore/shared";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { formatDate, todayString } from "@/lib/format";

const emptyForm: InsertSpecSection = {
  number: "", title: "", division: "", revision: "0", specSet: "IFC",
  issuedDate: null, receivedDate: todayString(),
};

export default function SpecificationsPage() {
  const { query, create, update, remove } = useCrud<SpecSection, InsertSpecSection>("spec-sections");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SpecSection | null>(null);
  const [form, setForm] = useState<InsertSpecSection>(emptyForm);

  const specs = query.data ?? [];
  const filtered = useMemo(
    () => specs.filter(s =>
      search === "" ||
      `${s.number} ${s.title} ${s.division}`.toLowerCase().includes(search.toLowerCase())),
    [specs, search],
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, SpecSection[]>();
    for (const s of filtered) {
      const list = groups.get(s.division) ?? [];
      list.push(s);
      groups.set(s.division, list);
    }
    Array.from(groups.values()).forEach((list: SpecSection[]) =>
      list.sort((a, b) => a.number.localeCompare(b.number)));
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (s: SpecSection) => {
    setEditing(s);
    const { id, createdAt, ...rest } = s;
    setForm(rest);
    setDialogOpen(true);
  };

  const set = <K extends keyof InsertSpecSection>(key: K) => (value: InsertSpecSection[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.number.trim() || !form.title.trim() || !form.division.trim()) return;
    if (editing) await update.mutateAsync({ id: editing.id, data: form });
    else await create.mutateAsync(form);
    setDialogOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Specifications"
        subtitle={`${specs.length} spec sections across ${new Set(specs.map(s => s.division)).size} divisions`}
        onCreate={openCreate}
        createLabel="Add Section"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search spec sections..." />
      </div>

      {grouped.length === 0 ? (
        <EmptyState message="No spec sections match the current filters." />
      ) : (
        grouped.map(([division, items]) => (
          <div key={division} className="mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Division {division} ({items.length})
            </h2>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Section</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-16">Rev</TableHead>
                    <TableHead>Set</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.number}</TableCell>
                      <TableCell>{s.title}</TableCell>
                      <TableCell>{s.revision}</TableCell>
                      <TableCell>{s.specSet || "—"}</TableCell>
                      <TableCell>{formatDate(s.issuedDate)}</TableCell>
                      <TableCell>{formatDate(s.receivedDate)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                            onClick={() => remove.mutate(s.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit Section ${editing.number}` : "Add Spec Section"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Section Number" value={form.number} onChange={set("number")} placeholder="e.g. 03 30 00" />
            <TextField label="Revision" value={form.revision ?? "0"} onChange={set("revision")} />
            <TextField className="col-span-2" label="Title" value={form.title} onChange={set("title")} />
            <TextField className="col-span-2" label="Division" value={form.division} onChange={set("division")} placeholder="e.g. 03 - Concrete" />
            <TextField label="Spec Set" value={form.specSet ?? ""} onChange={set("specSet")} />
            <DateField label="Issued Date" value={form.issuedDate ?? null} onChange={set("issuedDate")} />
            <DateField label="Received Date" value={form.receivedDate ?? null} onChange={set("receivedDate")} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}
              disabled={!form.number.trim() || !form.title.trim() || !form.division.trim() || create.isPending || update.isPending}>
              {editing ? "Save Changes" : "Add Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
