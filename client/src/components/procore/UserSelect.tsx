import React from "react";
import { useQuery } from "@tanstack/react-query";
import type { SafeUser } from "@shared/procore";
import { FormField } from "@/components/procore/shared";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

/**
 * Assignee picker backed by the project directory. Stores the user's display
 * name (the string fields existing entities already use), so free-text values
 * created before the directory existed still render.
 */
export function UserSelect({
  label,
  value,
  onChange,
  className,
  allowNone = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  allowNone?: boolean;
}) {
  const usersQuery = useQuery<SafeUser[]>({ queryKey: ["/api/users"] });
  const users = usersQuery.data ?? [];
  const isKnown = value === "" || users.some(u => u.name === value);

  return (
    <FormField label={label} className={className}>
      <Select
        value={value === "" ? NONE : value}
        onValueChange={v => onChange(v === NONE ? "" : v)}
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value={NONE}>— Unassigned —</SelectItem>}
          {!isKnown && <SelectItem value={value}>{value} (not in directory)</SelectItem>}
          {users.map(u => (
            <SelectItem key={u.id} value={u.name}>
              {u.name} — {u.company || u.role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}
