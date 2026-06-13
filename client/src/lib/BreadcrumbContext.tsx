import React, { createContext, useContext, useEffect, useState } from "react";

/**
 * Lets detail pages publish a human-readable leaf label (e.g. "RFI-002")
 * for the layout-level breadcrumb bar, which otherwise only knows the raw
 * route segment (e.g. "2").
 */
interface BreadcrumbContextValue {
  trailing: string | null;
  setTrailing: (label: string | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [trailing, setTrailing] = useState<string | null>(null);
  return (
    <BreadcrumbContext.Provider value={{ trailing, setTrailing }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

/** Read the current leaf label (used by the Breadcrumbs component). */
export function useBreadcrumbTrailing(): string | null {
  return useContext(BreadcrumbContext)?.trailing ?? null;
}

/** Publish a leaf label for the lifetime of the calling page. */
export function useBreadcrumbLabel(label: string | null | undefined): void {
  const ctx = useContext(BreadcrumbContext);
  useEffect(() => {
    if (!ctx || !label) return;
    ctx.setTrailing(label);
    return () => ctx.setTrailing(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label]);
}
