import { Modal } from "./Modal";

export function Drawer({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  return <Modal open={open} title={title} onClose={onClose}>{children}</Modal>;
}
