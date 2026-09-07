import { useState, type FormEvent } from "react";
import { PageHeader } from "../components/common/PageHeader";
import { notifySuccess } from "../services/notificationService";

export function GeneralSettingsPage() {
  const [sstPercentage, setSstPercentage] = useState("8");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    notifySuccess("General settings saved successfully.", "general-settings-save");
  };

  return (
    <>
      <PageHeader title="General" description="Manage general system configuration." />

      <section className="max-w-2xl rounded-lg border border-line bg-white p-5 shadow-soft">
        <form onSubmit={submit} className="space-y-5">
          <label className="block text-sm font-medium text-textPrimary">
            SST Percentage
            <input
              type="text"
              inputMode="decimal"
              value={sstPercentage}
              onChange={(event) => setSstPercentage(event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </label>

          <button type="submit" className="inline-flex h-11 items-center justify-center rounded-lg bg-ink px-5 text-sm font-semibold text-white transition hover:bg-black">
            Submit
          </button>
        </form>
      </section>
    </>
  );
}
