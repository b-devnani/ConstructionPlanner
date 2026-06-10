import React, { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { SafeUser, InsertUser, USER_ROLES } from "@shared/procore";
import {
  PageHeader, SearchInput, StatusBadge, EmptyState, TextField, SelectField,
} from "@/components/procore/shared";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

const emptyForm: InsertUser = {
  name: "", email: "", role: "Subcontractor", company: "", title: "", phone: "",
  password: "",
};

const ROLE_COLORS: Record<string, string> = {
  "Admin": "Urgent",
  "Project Manager": "High",
  "Superintendent": "Medium",
  "Architect": "Ready for Review",
  "Owner Rep": "Approved",
  "Subcontractor": "Low",
};

export default function DirectoryPage() {
  const { toast } = useToast();
  const { user: me } = useAuth();
  const usersQuery = useQuery<SafeUser[]>({ queryKey: ["/api/users"] });
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<InsertUser>(emptyForm);

  const canManage = me?.role === "Admin" || me?.role === "Project Manager";
  const users = usersQuery.data ?? [];
  const filtered = useMemo(
    () => users.filter(u =>
      search === "" ||
      `${u.name} ${u.email} ${u.company} ${u.role}`.toLowerCase().includes(search.toLowerCase())),
    [users, search],
  );

  const onError = (error: Error) =>
    toast({ title: "Request failed", description: error.message, variant: "destructive" });

  const create = useMutation({
    mutationFn: async (data: InsertUser) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDialogOpen(false);
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/users"] }),
    onError,
  });

  const set = <K extends keyof InsertUser>(key: K) => (value: InsertUser[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const valid = form.name.trim() && form.email.includes("@") && form.password.length >= 6;

  return (
    <div>
      <PageHeader
        title="Project Directory"
        subtitle={`${users.length} project team members`}
        onCreate={canManage ? () => { setForm(emptyForm); setDialogOpen(true); } : undefined}
        createLabel="Add Person"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search directory..." />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No people match the current search." />
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.name}{u.id === me?.id && <span className="text-muted-foreground"> (you)</span>}
                  </TableCell>
                  <TableCell><StatusBadge status={u.role} /></TableCell>
                  <TableCell>{u.company || "—"}</TableCell>
                  <TableCell>{u.title || "—"}</TableCell>
                  <TableCell>
                    <a className="text-primary hover:underline" href={`mailto:${u.email}`}>{u.email}</a>
                  </TableCell>
                  <TableCell>
                    {me?.role === "Admin" && u.id !== me.id && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => remove.mutate(u.id)}>
                        <Trash2 className="h-4 w-4" />
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Person to Directory</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Full Name" value={form.name} onChange={set("name")} />
            <TextField label="Email" value={form.email} onChange={set("email")} type="email" />
            <SelectField label="Role" value={form.role ?? "Subcontractor"} onChange={set("role")} options={USER_ROLES} />
            <TextField label="Company" value={form.company ?? ""} onChange={set("company")} />
            <TextField label="Title" value={form.title ?? ""} onChange={set("title")} />
            <TextField label="Phone" value={form.phone ?? ""} onChange={set("phone")} />
            <TextField className="col-span-2" label="Temporary Password (min 6 chars)"
              value={form.password} onChange={set("password")} type="password" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate(form)} disabled={!valid || create.isPending}>
              Add Person
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
