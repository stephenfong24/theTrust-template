export function Tabs({ tabs, active }: { tabs: string[]; active: string }) {
  return (
    <div className="flex gap-4 border-b border-line">
      {tabs.map((tab) => <button key={tab} className={tab === active ? "border-b-2 border-brandGold px-1 pb-2 text-sm font-semibold text-ink" : "px-1 pb-2 text-sm text-textSecondary"}>{tab}</button>)}
    </div>
  );
}
