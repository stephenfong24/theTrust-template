import { ArrowLeft, Upload } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { roles } from "../config/roles";
import { notifySuccess } from "../services/notificationService";
import type { RoleId } from "../types";

type ResourceFormType = "File" | "Content" | "Hyperlink" | "Video";
type ResourceStatus = "Active" | "Inactive";

const resourceTypes: ResourceFormType[] = ["File", "Content", "Hyperlink", "Video"];
const roleOptions: RoleId[] = ["SA", "AD", "OP", "AC", "AG"];
const statusOptions: ResourceStatus[] = ["Active", "Inactive"];

export function AddResourcePage() {
  const { resourceId } = useParams();
  const editingResource = useMemo(() => getEditableResource(resourceId), [resourceId]);
  const isEdit = Boolean(resourceId);
  const [name, setName] = useState(editingResource?.name ?? "");
  const [type, setType] = useState<ResourceFormType>(editingResource?.type ?? "File");
  const [description, setDescription] = useState(editingResource?.description ?? "");
  const [url, setUrl] = useState(editingResource?.url ?? "");
  const [selectedRoles, setSelectedRoles] = useState<RoleId[]>(roleOptions);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<ResourceStatus>("Active");
  const showFileUpload = type === "File";
  const showDescription = type === "Content";
  const showUrl = type === "Hyperlink" || type === "Video";
  const selectedRoleSummary = useMemo(() => selectedRoles.map((role) => roles[role]).join(", "), [selectedRoles]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    notifySuccess(isEdit ? "Resource updated successfully." : "Resource saved successfully.", "resource-add-save");
  };

  const toggleRole = (role: RoleId) => {
    setSelectedRoles((current) => (current.includes(role) ? current.filter((item) => item !== role) : [...current, role]));
  };

  return (
    <>
      <PageHeader
        title={isEdit ? "Edit Resource" : "Add Resource"}
        description={isEdit ? "Update resource information for selected user roles." : "Create a resource for selected user roles."}
        actions={
          <Link to="/resources/memo" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-textPrimary transition hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      <section className="max-w-4xl rounded-lg border border-line bg-white p-5 shadow-soft">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <TextField label="Name" value={name} onChange={setName} required />

            <label className="block text-sm font-medium text-textPrimary">
              Type <span className="text-red-600">*</span>
              <select
                value={type}
                onChange={(event) => setType(event.target.value as ResourceFormType)}
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                {resourceTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {showFileUpload ? (
            <label className="block text-sm font-medium text-textPrimary">
              File Upload <span className="text-red-600">*</span>
              <span className="mt-1 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-soft px-4 py-6 text-center transition hover:border-brandGold hover:bg-[#FFF8E1]/40">
                <Upload className="h-7 w-7 text-brandGold" />
                <span className="mt-2 text-sm font-semibold text-textPrimary">Click to upload or drag and drop</span>
                <span className="mt-1 text-xs text-textSecondary">PDF, DOCX, XLSX, JPG, PNG or MP4</span>
              </span>
              <input type="file" className="hidden" />
            </label>
          ) : null}

          {showDescription ? (
            <label className="block text-sm font-medium text-textPrimary">
              Description <span className="text-red-600">*</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                required
                className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
            </label>
          ) : null}

          {showUrl ? <TextField label="Url" type="url" value={url} onChange={setUrl} required /> : null}

          <fieldset className="rounded-lg border border-line p-4">
            <legend className="px-1 text-sm font-semibold text-textPrimary">Role</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {roleOptions.map((role) => (
                <label key={role} className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-textPrimary">
                  <input type="checkbox" checked={selectedRoles.includes(role)} onChange={() => toggleRole(role)} className="h-4 w-4 accent-[#D4AF37]" />
                  {roles[role]}
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-textSecondary">Selected: {selectedRoleSummary || "No roles selected"}</p>
          </fieldset>

          <div className="grid gap-5 md:grid-cols-3">
            <TextField label="Start Date" type="date" value={startDate} onChange={setStartDate} />
            <TextField label="End Date" type="date" value={endDate} onChange={setEndDate} />

            <label className="block text-sm font-medium text-textPrimary">
              Status <span className="text-red-600">*</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as ResourceStatus)}
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                {statusOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="border-t border-line pt-5">
            <button type="submit" className="inline-flex h-11 items-center justify-center rounded-lg bg-ink px-5 text-sm font-semibold text-white transition hover:bg-black">
              Submit
            </button>
          </div>
        </form>
      </section>
    </>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-textPrimary">
      {label} {required ? <span className="text-red-600">*</span> : null}
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
      />
    </label>
  );
}

function getEditableResource(resourceId?: string) {
  return editableResources.find((resource) => resource.id === resourceId);
}

const editableResources: Array<{ id: string; name: string; type: ResourceFormType; description: string; url: string }> = [
  { id: "RES-001", name: "Trust Application Form", type: "File", description: "Official application form for trust registration.", url: "" },
  { id: "RES-002", name: "Trust Training Video", type: "Video", description: "Learn how to complete a trust registration from start to finish.", url: "" },
  { id: "RES-003", name: "Trustee Guidelines", type: "Hyperlink", description: "Latest trustee guidelines from the official website.", url: "https://www.trustee.com.my" },
  { id: "RES-004", name: "Declaration Form", type: "File", description: "Template for trustee declaration.", url: "" },
  { id: "RES-005", name: "FAQ - Trust Registration", type: "Hyperlink", description: "Frequently asked questions on trust registration.", url: "https://www.example.com/faq" },
  { id: "RES-006", name: "Introduction to Trusts", type: "Video", description: "An overview of trusts and their benefits.", url: "" },
  { id: "RES-007", name: "Trust Fee Schedule", type: "File", description: "Schedule of fees for trust services.", url: "" },
  { id: "RES-008", name: "Compliance Memo", type: "File", description: "Internal reminder for compliance documentation checks.", url: "" },
  { id: "RES-009", name: "Program Training Session", type: "Video", description: "Recording of the latest program training.", url: "" },
  { id: "RES-010", name: "Client Onboarding Notes", type: "Content", description: "Use this content note to explain the standard documents required before a trust registration can proceed.", url: "" }
];
