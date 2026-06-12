import React, { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/procore/shared";
import { ActivityFeed } from "@/components/procore/ActivityFeed";
import { AttachmentsSection } from "@/components/procore/AttachmentsSection";
import { useBreadcrumbLabel } from "@/lib/BreadcrumbContext";
import { ArrowLeft } from "lucide-react";

export interface RecordTab {
  id: string;
  label: string;
  count?: number;
  content: React.ReactNode;
}

/**
 * Full-page record detail shell. Provides:
 *   - back link to the index
 *   - dense header with number, title, status pills, action slot, key fields
 *   - tab bar with custom tabs plus Attachments + Activity
 *   - tab body
 *
 * Modeled to feel like Procore's record-detail layout while letting each tool
 * customise headers and tab contents.
 */
export function RecordPage({
  backHref,
  backLabel,
  number,
  title,
  statuses = [],
  headerFields = [],
  actions,
  tabs,
  entityType,
  entityId,
  showAttachmentsTab = true,
  attachmentsLabel,
}: {
  backHref: string;
  backLabel: string;
  number: string;
  title: string;
  statuses?: string[];
  headerFields?: Array<{ label: string; value: React.ReactNode }>;
  actions?: React.ReactNode;
  tabs: RecordTab[];
  entityType: string;
  entityId: number;
  showAttachmentsTab?: boolean;
  attachmentsLabel?: string;
}) {
  // Surface the record number in the layout breadcrumb (e.g. "RFIs › RFI-002")
  useBreadcrumbLabel(number);

  const allTabs: RecordTab[] = [
    ...tabs,
    ...(showAttachmentsTab
      ? [{
          id: "attachments",
          label: "Attachments",
          content: (
            <AttachmentsSection
              entityType={entityType}
              entityId={entityId}
              title={attachmentsLabel ?? "Attachments"}
            />
          ),
        }]
      : []),
    {
      id: "activity",
      label: "Activity",
      content: <ActivityFeed entityType={entityType} entityId={entityId} />,
    },
  ];
  const [activeTab, setActiveTab] = useState(allTabs[0].id);
  const current = allTabs.find(t => t.id === activeTab) ?? allTabs[0];

  return (
    <div className="-mx-6 -my-4">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="px-6 pt-3 pb-2">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> {backLabel}
          </Link>
          <div className="mt-1.5 flex flex-wrap items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <h1 className="text-xl font-semibold tracking-tight">
                  <span className="text-muted-foreground font-normal mr-2">{number}</span>
                  {title}
                </h1>
                {statuses.map(s => <StatusBadge key={s} status={s} />)}
              </div>
              {headerFields.length > 0 && (
                <dl className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1.5 text-xs">
                  {headerFields.map(field => (
                    <div key={field.label} className="flex flex-col">
                      <dt className="text-2xs uppercase tracking-wider text-muted-foreground">{field.label}</dt>
                      <dd className="text-sm">{field.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-6 flex gap-0 overflow-x-auto border-b -mb-px">
          {allTabs.map(tab => (
            <button
              key={tab.id}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 px-1.5 py-0.5 text-2xs rounded-full bg-muted text-muted-foreground">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-6 py-4">{current.content}</div>
    </div>
  );
}

export function RecordSection({
  title, action, children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
        {action}
      </div>
      <div>{children}</div>
    </section>
  );
}

export function KeyValueGrid({ items }: { items: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
      {items.map(item => (
        <div key={item.label} className="flex flex-col py-1 border-b border-dashed last:border-0">
          <dt className="text-2xs uppercase tracking-wider text-muted-foreground">{item.label}</dt>
          <dd>{item.value || <span className="text-muted-foreground">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
