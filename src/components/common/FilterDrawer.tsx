import { Drawer } from "./Drawer";

export function FilterDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Drawer open={open} title="Filters" onClose={onClose}>
      <div className="space-y-3">
        <select className="h-10 w-full rounded-lg border border-line bg-white px-3"><option>Status</option></select>
        <select className="h-10 w-full rounded-lg border border-line bg-white px-3"><option>Product</option></select>
      </div>
    </Drawer>
  );
}
