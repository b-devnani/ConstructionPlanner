import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

/**
 * Generic list + create/update/delete helpers for a REST resource under /api.
 *
 * Invalidation: every mutation invalidates the list key and any extra keys.
 * Update/remove also invalidate the record's detail key (`/api/<resource>/<id>`)
 * — TanStack's per-element prefix matching means the list key alone would NOT
 * match it — and, when `activityEntityType` is provided, the record's activity
 * feed key, so status changes show up in the feed without a reload.
 */
export function useCrud<T extends { id: number }, I = Omit<T, "id">>(
  resource: string,
  extraInvalidations: string[] = [],
  activityEntityType?: string,
) {
  const { toast } = useToast();
  const listKey = `/api/${resource}`;

  const invalidate = (id?: number) => {
    queryClient.invalidateQueries({ queryKey: [listKey] });
    if (id !== undefined) {
      queryClient.invalidateQueries({ queryKey: [`${listKey}/${id}`] });
      if (activityEntityType) {
        queryClient.invalidateQueries({
          queryKey: [`/api/activity?entityType=${activityEntityType}&entityId=${id}`],
        });
      }
    }
    for (const key of extraInvalidations) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const onError = (error: Error) => {
    toast({ title: "Request failed", description: error.message, variant: "destructive" });
  };

  const query = useQuery<T[]>({ queryKey: [listKey] });

  const create = useMutation({
    mutationFn: async (data: I) => {
      const res = await apiRequest("POST", listKey, data);
      return (await res.json()) as T;
    },
    onSuccess: created => invalidate(created.id),
    onError,
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<I> }) => {
      const res = await apiRequest("PUT", `${listKey}/${id}`, data);
      return (await res.json()) as T;
    },
    onSuccess: (_data, variables) => invalidate(variables.id),
    onError,
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `${listKey}/${id}`);
    },
    onSuccess: (_data, id) => invalidate(id),
    onError,
  });

  return { query, create, update, remove, invalidate };
}
