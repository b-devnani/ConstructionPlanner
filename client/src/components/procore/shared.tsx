import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";

// ----- Status badge with Procore-like color coding ---------------------------

const STATUS_COLORS: Record<string, string> = {
  // generic
  "Draft": "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  "Open": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Closed": "bg-gray-300 text-gray-800 dark:bg-gray-600 dark:text-gray-100",
  "Void": "bg-gray-100 text-gray-500 line-through dark:bg-gray-800 dark:text-gray-400",
  "Pending": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  // submittals
  "Pending Approval": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "Approved": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "Approved as Noted": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  "Revise and Resubmit": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Rejected": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  // punch
  "Ready for Review": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  // change orders
  "Pending - In Review": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  // contract
  "Out for Bid": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Out for Signature": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "Complete": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "Terminated": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  // drawings
  "Current": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "Superseded": "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  // priorities
  "Low": "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
  "Medium": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "High": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Urgent": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
  return <Badge variant="outline" className={`border-transparent font-medium ${color}`}>{status}</Badge>;
}

// ----- Page header ------------------------------------------------------------

export function PageHeader({
  title,
  subtitle,
  onCreate,
  createLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  onCreate?: () => void;
  createLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 mb-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {onCreate && (
          <Button onClick={onCreate}>
            <Plus className="h-4 w-4 mr-1" /> {createLabel ?? "Create"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ----- Filter bar ---------------------------------------------------------------

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-64">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        className="pl-8"
        placeholder={placeholder ?? "Search..."}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

export function StatusFilter({
  value,
  onChange,
  options,
  label = "Status",
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  label?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder={`All ${label}`} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label}</SelectItem>
        {options.map(option => (
          <SelectItem key={option} value={option}>{option}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ----- Form field helpers (controlled, for create/edit dialogs) ------------------

export function FormField({ label, children, className }: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}

export function TextField({ label, value, onChange, type = "text", className, placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
  placeholder?: string;
}) {
  return (
    <FormField label={label} className={className}>
      <Input type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} />
    </FormField>
  );
}

export function NumberField({ label, value, onChange, className, step }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  step?: string;
}) {
  return (
    <FormField label={label} className={className}>
      <Input type="number" value={Number.isFinite(value) ? value : 0} step={step}
        onChange={e => onChange(parseFloat(e.target.value) || 0)} />
    </FormField>
  );
}

export function DateField({ label, value, onChange, className }: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}) {
  return (
    <FormField label={label} className={className}>
      <Input type="date" value={value ?? ""}
        onChange={e => onChange(e.target.value || null)} />
    </FormField>
  );
}

export function SelectField<T extends string>({ label, value, onChange, options, className }: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
  className?: string;
}) {
  return (
    <FormField label={label} className={className}>
      <Select value={value} onValueChange={v => onChange(v as T)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

export function TextAreaField({ label, value, onChange, className, rows }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  rows?: number;
}) {
  return (
    <FormField label={label} className={className}>
      <Textarea value={value} rows={rows ?? 3} onChange={e => onChange(e.target.value)} />
    </FormField>
  );
}

// ----- Misc -----------------------------------------------------------------------

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground text-sm border rounded-md">
      {message}
    </div>
  );
}

export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm border-b border-dashed last:border-0">
      <div className="text-muted-foreground">{label}</div>
      <div className="col-span-2">{children}</div>
    </div>
  );
}
