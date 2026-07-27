import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-2 h-1 w-12 rounded-full bg-brandGold" />
        <h1 className="text-[28px] font-semibold tracking-normal text-textPrimary">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-textSecondary">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
