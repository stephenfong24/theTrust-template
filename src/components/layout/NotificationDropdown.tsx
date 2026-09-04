import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";
import initialNotifications from "../../data/notifications.json";
import type { NotificationRecord } from "../../types";
import { readStorage, writeStorage } from "../../services/storageService";
import { notifySuccess } from "../../services/notificationService";

const key = "trust-fund-notifications";

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<NotificationRecord[]>(() => readStorage(key, initialNotifications as NotificationRecord[]));
  const unread = records.filter((record) => !record.read).length;

  const markAll = () => {
    const next = records.map((record) => ({ ...record, read: true }));
    setRecords(next);
    writeStorage(key, next);
    notifySuccess("Notification marked as read.", "notifications-read");
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((value) => !value)} className="relative rounded-lg p-2 text-textSecondary hover:bg-gray-100" aria-label="Notifications">
        <Bell className="h-[19px] w-[19px]" />
        {unread ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brandGold" /> : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-line bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-line p-3">
            <span className="font-semibold text-textPrimary">Notifications</span>
            <button onClick={markAll} className="rounded-md p-1 text-textSecondary hover:bg-gray-100" aria-label="Mark all as read">
              <CheckCheck className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {records.slice(0, 5).map((record) => (
              <button
                key={record.id}
                onClick={() => {
                  const next = records.map((entry) => (entry.id === record.id ? { ...entry, read: true } : entry));
                  setRecords(next);
                  writeStorage(key, next);
                  notifySuccess("Notification marked as read.", "notifications-read");
                }}
                className="block w-full border-b border-line px-4 py-3 text-left hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  {!record.read ? <span className="h-2 w-2 rounded-full bg-brandGold" /> : null}
                  <span className="text-sm font-semibold text-textPrimary">{record.title}</span>
                </div>
                <p className="mt-1 text-xs text-textSecondary">{record.message}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
