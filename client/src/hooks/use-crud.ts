import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

/**
 * Generic list + create/update/delete helpers for a REST resource under /api.
 * Invalidates the resource list (and any extra keys) after each mutation.
 */
export function useCrud<T extends { id: number }, I = Omit<T, "id">>(
  resource: string,
  extraInvalidations: string[] = [],
) {
  const { toast } = useToast();
  const listKey = `/api/${resource}`;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [listKey] });
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
    onSuccess: invalidate,
    onError,
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<I> }) => {
      const res = await apiRequest("PUT", `${listKey}/${id}`, data);
      return (await res.json()) as T;
    },
    onSuccess: invalidate,
    onError,
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `${listKey}/${id}`);
    },
    onSuccess: invalidate,
    onError,
  });

  return { query, create, update, remove, invalidate };
}
