import { Modal } from "./Modal";

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onClose
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-sm text-textSecondary">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-ink bg-white px-4 py-2 text-sm font-medium text-ink">
          Cancel
        </button>
        <button onClick={onConfirm} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white">
          Confirm
        </button>
      </div>
    </Modal>
  );
}
