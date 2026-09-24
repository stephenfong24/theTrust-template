import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { configApi } from "../api/configApi";
import { EmptyState } from "../components/common/EmptyState";
import { PageHeader } from "../components/common/PageHeader";
import { notifyError, notifySuccess } from "../services/notificationService";

export function GeneralSettingsPage() {
  const [sstPercentage, setSstPercentage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    void loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const config = await configApi.getConfigList();
      setSstPercentage(String(config.SST ?? ""));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load general configuration.";
      setLoadError(message);
      notifyError(message, "general-settings-load-error");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const sst = Number(sstPercentage);
    if (!Number.isFinite(sst) || sst < 0 || sst > 100) {
      notifyError("SST must be between 0 and 100.", "general-settings-validation-error");
      return;
    }

    setSubmitting(true);

    try {
      await configApi.updateConfig({ SST: sst });
      notifySuccess("General settings saved successfully.", "general-settings-save");
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to save general settings.", "general-settings-save-error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="General" description="Manage general system configuration." />

      <section className="max-w-2xl rounded-lg border border-line bg-white p-5 shadow-soft">
        {loading ? (
          <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-textSecondary">
            <Loader2 className="h-4 w-4 animate-spin text-brandGold" />
            Loading general settings
          </div>
        ) : loadError ? (
          <EmptyState title="Unable to load settings" description={loadError} />
        ) : (
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

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 min-w-24 items-center justify-center gap-2 rounded-lg bg-ink px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Submitting" : "Submit"}
            </button>
          </form>
        )}
      </section>
    </>
  );
}
