import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { DatePickerInput } from "../components/forms/DatePickerInput";
import { lookupApi, type RoleLookupItem } from "../api/lookupApi";
import { resourceApi, type ResourceApiType, type ResourceCategoryCode, type ResourceCategoryItem, type ResourceStatusCode } from "../api/resourceApi";
import { notifyError, notifySuccess } from "../services/notificationService";

type ResourceFormType = ResourceApiType;
type ResourceStatus = ResourceStatusCode;

const resourceTypes: Array<{ value: ResourceFormType; label: string }> = [
  { value: "FILE", label: "File" },
  { value: "CONTENT", label: "Content" },
  { value: "HYPERLINK", label: "Hyperlink" },
  { value: "EMBED_VIDEO", label: "Video" }
];
const maxResourceFileSize = 5 * 1024 * 1024;
const statusOptions: Array<{ value: ResourceStatus; label: string }> = [
  { value: 0, label: "Active" },
  { value: 4, label: "Inactive" }
];

export function AddResourcePage() {
  const navigate = useNavigate();
  const { resourceId } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(resourceId);
  const requestedCategoryCode = searchParams.get("categoryCode") || "";
  const [name, setName] = useState("");
  const [categoryCode, setCategoryCode] = useState<ResourceCategoryCode>("");
  const [type, setType] = useState<ResourceFormType>("FILE");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<ResourceCategoryItem[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [roleOptions, setRoleOptions] = useState<RoleLookupItem[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleLoading, setRoleLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentFileName, setCurrentFileName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<ResourceStatus>(0);
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(isEdit);
  const showFileUpload = type === "FILE";
  const showDescription = type === "CONTENT";
  const showUrl = type === "HYPERLINK" || type === "EMBED_VIDEO";
  const selectedRoleSummary = useMemo(
    () =>
      selectedRoles
        .map((role) => roleOptions.find((option) => option.RoleCode === role)?.RoleName ?? role)
        .join(", "),
    [roleOptions, selectedRoles]
  );

  useEffect(() => {
    let active = true;
    setCategoryLoading(true);
    setRoleLoading(true);
    setDetailLoading(isEdit);

    Promise.all([
      resourceApi.getCategories(),
      lookupApi.getAllRoleList(),
      isEdit && resourceId ? resourceApi.getResourceDetail(resourceId) : Promise.resolve(null)
    ])
      .then(([categories, roles, resource]) => {
        if (!active) return;
        setCategoryOptions(categories);
        setRoleOptions(roles);

        if (resource) {
          setName(resource.Name || "");
          setCategoryCode(resource.CategoryCode || categories[0]?.CategoryCode || "");
          setType(normalizeResourceFormType(resource.Type));
          setDescription(resource.Description || "");
          setUrl(resource.Url || "");
          setSelectedRoles(resource.RoleCodes || []);
          setStartDate(formatDateInputValue(resource.StartDate));
          setEndDate(formatDateInputValue(resource.EndDate));
          setStatus(normalizeResourceStatus(resource.Status));
          setCurrentFileName(resource.OriginalFileName || resource.StoredFileName || resource.UploadedFile || "");
        } else {
          setCategoryCode((current) => current || getInitialCategoryCode(categories, requestedCategoryCode));
          setSelectedRoles(roles.map((role) => role.RoleCode));
        }
      })
      .catch((error) => {
        if (!active) return;
        setCategoryOptions([]);
        setCategoryCode("");
        setRoleOptions([]);
        setSelectedRoles([]);
        notifyError(error instanceof Error ? error.message : "Unable to load resource form options.", "resource-form-options-load");
      })
      .finally(() => {
        if (!active) return;
        setCategoryLoading(false);
        setRoleLoading(false);
        setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isEdit, requestedCategoryCode, resourceId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedRoles.length === 0) {
      notifyError("Please select at least one role.", "resource-role-required");
      return;
    }

    if (!categoryCode) {
      notifyError("Please select a category.", "resource-category-required");
      return;
    }

    if (showFileUpload && !selectedFile && (!isEdit || !currentFileName)) {
      notifyError("Please select a file.", "resource-file-required");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        categoryCode,
        name: name.trim(),
        description: description.trim(),
        type,
        url: url.trim(),
        roleCodes: selectedRoles,
        status,
        startDate,
        endDate,
        file: selectedFile
      };

      if (isEdit && resourceId) {
        await resourceApi.updateResource({
          ...payload,
          resourceId
        });
      } else {
        await resourceApi.createResource(payload);
      }

      notifySuccess(isEdit ? "Resource updated successfully." : "Resource saved successfully.", "resource-add-save");
      navigate(getResourceCategoryPath(categoryCode));
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to save resource.", "resource-add-save-error");
    } finally {
      setSubmitting(false);
    }
  };

  const validateResourceFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > maxResourceFileSize) {
      event.target.value = "";
      setSelectedFile(null);
      notifyError("Resource file must not be more than 5 MB.", "resource-file-size");
      return;
    }

    setSelectedFile(file);
  };

  const toggleRole = (role: string) => {
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
              Category <span className="text-red-600">*</span>
              <select
                value={categoryCode}
                onChange={(event) => setCategoryCode(event.target.value as ResourceCategoryCode)}
                required
                disabled={categoryLoading || categoryOptions.length === 0}
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                {categoryLoading ? <option value="">Loading categories...</option> : null}
                {!categoryLoading && categoryOptions.length === 0 ? <option value="">No categories available</option> : null}
                {categoryOptions.map((item) => (
                  <option key={item.CategoryCode} value={item.CategoryCode}>
                    {item.CategoryName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-textPrimary">
              Type <span className="text-red-600">*</span>
              <select
                value={type}
                onChange={(event) => {
                  const nextType = event.target.value as ResourceFormType;
                  setType(nextType);
                  if (nextType !== "FILE") setSelectedFile(null);
                }}
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                {resourceTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {showFileUpload ? (
            <label className="block text-sm font-medium text-textPrimary">
              File Upload <span className="text-red-600">*</span>
              <input
                type="file"
                required={!isEdit}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                onChange={validateResourceFile}
                className="mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-textPrimary file:mr-4 file:rounded-md file:border-0 file:bg-soft file:px-4 file:py-2 file:text-sm file:font-semibold file:text-textPrimary file:transition hover:file:bg-gray-100 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
              {isEdit && currentFileName ? <span className="mt-1 block text-xs font-semibold text-textPrimary">Current file: {currentFileName}</span> : null}
              <span className="mt-1 block text-xs text-textSecondary">Supported files: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, JPEG, PNG. Maximum file size: 5 MB.</span>
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
                <label key={role.RoleCode} className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-textPrimary">
                  <input type="checkbox" checked={selectedRoles.includes(role.RoleCode)} onChange={() => toggleRole(role.RoleCode)} className="h-4 w-4 accent-[#D4AF37]" />
                  {role.RoleName}
                </label>
              ))}
            </div>
            {roleLoading ? <p className="mt-3 text-xs text-textSecondary">Loading roles...</p> : null}
            {!roleLoading && roleOptions.length === 0 ? <p className="mt-3 text-xs font-semibold text-red-600">No roles available.</p> : null}
            <p className="mt-3 text-xs text-textSecondary">Selected: {selectedRoleSummary || "No roles selected"}</p>
          </fieldset>

          <div className="grid gap-5 md:grid-cols-3">
            <TextField label="Start Date" type="date" value={startDate} onChange={setStartDate} />
            <TextField label="End Date" type="date" value={endDate} onChange={setEndDate} />

            <label className="block text-sm font-medium text-textPrimary">
              Status <span className="text-red-600">*</span>
              <select
                value={status}
                onChange={(event) => setStatus(Number(event.target.value) as ResourceStatus)}
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                {statusOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="border-t border-line pt-5">
            <button type="submit" disabled={submitting || roleLoading || categoryLoading || detailLoading || categoryOptions.length === 0} className="inline-flex h-11 items-center justify-center rounded-lg bg-ink px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? "Submitting..." : "Submit"}
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
  if (type === "date") return <DatePickerInput label={label} value={value} onChange={onChange} required={required} />;

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

function getResourceCategoryPath(categoryCode: ResourceCategoryCode) {
  if (categoryCode === "FORM_DOCUMENT") return "/resources/forms-documents";
  if (categoryCode === "INTERNAL_TRAINING") return "/resources/internal-training";
  return "/resources/memo";
}

function getInitialCategoryCode(categories: ResourceCategoryItem[], requestedCategoryCode: string) {
  const requested = requestedCategoryCode.trim().toUpperCase();
  const match = categories.find((category) => category.CategoryCode.toUpperCase() === requested);
  return match?.CategoryCode || categories[0]?.CategoryCode || "";
}

function normalizeResourceFormType(value?: string | null): ResourceFormType {
  const normalized = value?.toUpperCase();
  if (normalized === "CONTENT" || normalized === "HYPERLINK" || normalized === "EMBED_VIDEO") return normalized;
  return "FILE";
}

function normalizeResourceStatus(value?: number | null): ResourceStatus {
  return value === 4 ? 4 : 0;
}

function formatDateInputValue(value?: string | null) {
  if (!value) return "";
  const dateOnly = value.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  if (dateOnly) return dateOnly;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}
