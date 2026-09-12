import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  History,
  IdCard,
  Info,
  Landmark,
  Mail,
  MapPin,
  Pencil,
  QrCode,
  RotateCcw,
  ShieldCheck,
  Upload,
  UserRound,
  UserCog,
  XCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { DatePickerInput } from "../components/forms/DatePickerInput";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { roles } from "../config/roles";
import auditLogs from "../data/audit-logs.json";
import { useAuth } from "../hooks/useAuth";
import { usePermission } from "../hooks/usePermission";
import { listRecords } from "../services/dataService";
import { beginLoading, endLoading } from "../services/loadingService";
import { notifyError, notifySuccess } from "../services/notificationService";
import type { AuditLog, RoleId, UserStatus } from "../types";

type IdentityType = "NRIC" | "Passport" | "SSM";

interface StaffProfile {
  fullName: string;
  email: string;
  role: RoleId;
  status: UserStatus;
}

interface AgentProfile {
  referralCode: string;
  referralName: string;
  email: string;
  identityType: IdentityType;
  identityNo: string;
  fullName: string;
  dateOfBirth: string;
  country: string;
  postcode: string;
  state: string;
  city: string;
  address1: string;
  address2: string;
  mobileCode: string;
  mobileNumber: string;
  tinNumber: string;
  occupation: string;
  bankName: string;
  bankAccountHolderName: string;
  bankAccountNumber: string;
  status: UserStatus;
}

interface VerificationDocument {
  title: string;
  imageUrl?: string;
}

const maxImageSize = 5 * 1024 * 1024;
const acceptedIdentityImageExtensionSet = new Set(["jpg", "jpeg", "png"]);
const acceptedIdentityImageExtensions = ".jpg,.jpeg,.png";
const bankOptions = ["Maybank", "CIMB Bank", "Public Bank", "RHB Bank", "Hong Leong Bank", "AmBank", "Bank Islam", "OCBC Bank", "UOB Bank"];

export function ProfilePage() {
  const { session } = useAuth();
  const [photoUrl, setPhotoUrl] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  if (!session) return null;

  const isAgent = session.role === "AG";

  const handlePhotoChange = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notifyError("Please upload a valid image file.", "profile-image-type");
      return;
    }
    if (file.size > maxImageSize) {
      notifyError("Profile image must not be more than 5MB.", "profile-image-size");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(String(reader.result));
      notifySuccess("Profile image uploaded successfully.", "profile-image-success");
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <PageHeader
        title="Profile"
        description={isAgent ? "Agent account profile and registration details." : "Internal user account profile and access information."}
      />

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="border-b border-line bg-soft p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <ProfilePhoto name={session.name} photoUrl={photoUrl} onUpload={() => inputRef.current?.click()} />
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handlePhotoChange(event.target.files?.[0])} />
              <div>
                <h2 className="text-xl font-semibold text-textPrimary">{session.name}</h2>
                <p className="mt-1 text-sm text-textSecondary">{session.email}</p>
                <div className="mt-3 inline-flex items-start gap-2 rounded-lg border border-brandGold/30 bg-white px-3 py-2 text-xs font-medium leading-5 text-textSecondary">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brandGold" />
                  <span>Image size must not be more than 5MB.</span>
                </div>
              </div>
            </div>
            {isAgent ? (
              <ReferralQrCard referralCode="REF-AG-0001" />
            ) : (
              <RoleAccessSummary role={session.role} loginTime={session.loginTime} />
            )}
          </div>
        </div>

        {isAgent ? <AgentProfileContent sessionName={session.name} sessionEmail={session.email} loginTime={session.loginTime} /> : <StaffProfileContent sessionName={session.name} sessionEmail={session.email} role={session.role} />}
      </section>
    </>
  );
}

function RoleAccessSummary({ role, loginTime }: { role: RoleId; loginTime: string }) {
  const summary = getRoleAccessSummary(role);

  return (
    <aside className="w-full rounded-lg border border-line bg-white p-4 sm:max-w-md">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF8E1] text-brandGold">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-brandGold">{summary.roleName}</div>
          <h3 className="mt-1 text-base font-semibold text-textPrimary">{summary.title}</h3>
          <p className="mt-1 text-sm leading-5 text-textSecondary">{summary.description}</p>
          <div className="mt-3 border-t border-line pt-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Last Login</div>
            <div className="mt-1 text-sm font-semibold text-textPrimary">{formatProfileDateTime(loginTime)}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function StaffProfileContent({ sessionName, sessionEmail, role }: { sessionName: string; sessionEmail: string; role: RoleId }) {
  const [profile, setProfile] = useState<StaffProfile>({ fullName: sessionName, email: sessionEmail, role, status: "ACTIVE" });
  const [draft, setDraft] = useState(profile);
  const [open, setOpen] = useState(false);
  const canEdit = role === "SA" || role === "AD";

  const save = () => {
    if (!draft.fullName.trim()) {
      notifyError("Full name is required.", "staff-profile-name");
      return;
    }
    if (!isValidEmail(draft.email)) {
      notifyError("Enter a valid email address.", "staff-profile-email");
      return;
    }
    setProfile({ ...draft, fullName: draft.fullName.trim(), email: draft.email.trim() });
    setOpen(false);
    notifySuccess("Profile updated successfully.", "staff-profile-success");
  };

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <ProfileSection
          title="Account Information"
          icon={UserCog}
          action={
            canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft(profile);
                  setOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            ) : null
          }
        >
          <ProfileField label="Full Name" value={profile.fullName} />
          <ProfileField label="Email" value={profile.email} />
          <ProfileField label="Role" value={roles[profile.role]} />
          <ProfileField label="Status" value={formatStatus(profile.status)} />
        </ProfileSection>

        <ProfileSection title="Access & Security" icon={ShieldCheck}>
          <ProfileField label="Account Type" value="Internal User" />
          <ProfileField label="Department" value={getDepartment(roles[profile.role])} />
          <ProfileField label="Authentication" value="Local credential login" />
          <ProfileField label="Access Scope" value="Permission-based system modules" />
        </ProfileSection>
      </div>

      <ProfileActivityPanel userName={profile.fullName} status={profile.status} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update the internal user profile details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 rounded-lg border border-line bg-white p-4">
            <TextInput label="Email" type="email" value={draft.email} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} />
            <TextInput label="Full Name" value={draft.fullName} onChange={(value) => setDraft((current) => ({ ...current, fullName: value }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AgentProfileContent({ sessionName, sessionEmail, loginTime }: { sessionName: string; sessionEmail: string; loginTime: string }) {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<AgentProfile>({
    referralCode: "REF-AG-0001",
    referralName: "CNB Amanah Berhad",
    email: sessionEmail,
    identityType: "NRIC",
    identityNo: "900101141234",
    fullName: sessionName,
    dateOfBirth: "1990-01-01",
    country: "Malaysia",
    postcode: "43300",
    state: "Selangor",
    city: "Seri Kembangan",
    address1: "B-20-3, Aman Heights Condominium",
    address2: "Taman Bukit Serdang, Jalan Bersatu",
    mobileCode: "+60",
    mobileNumber: "125559679",
    tinNumber: "IGXXXXXXXXXX",
    occupation: "Software Developer",
    bankName: "Maybank",
    bankAccountHolderName: sessionName,
    bankAccountNumber: "514239887102",
    status: "ACTIVE"
  });
  const [draft, setDraft] = useState(profile);
  const labels = useMemo(() => getIdentityLabels(draft.identityType), [draft.identityType]);

  const save = () => {
    const error = validateAgentProfile(draft);
    if (error) {
      notifyError(error, "agent-profile-validation");
      return;
    }
    setProfile({
      ...draft,
      email: draft.email.trim(),
      fullName: draft.fullName.trim(),
      bankName: draft.bankName.trim(),
      bankAccountHolderName: draft.bankAccountHolderName.trim(),
      bankAccountNumber: draft.bankAccountNumber.trim()
    });
    setEditing(false);
    notifySuccess("Agent profile updated successfully.", "agent-profile-success");
  };

  const cancel = () => {
    setDraft(profile);
    setEditing(false);
  };

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <ProfileSection
          title="Referral & Account"
          icon={BriefcaseBusiness}
          action={
            editing ? (
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={cancel}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={save}>
                  Save
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )
          }
        >
          <EditableField label="Referral Code" value={draft.referralCode} editing={editing} readOnly />
          <EditableField label="Referral Name" value={draft.referralName} editing={editing} readOnly />
          <EditableField label="Email" type="email" value={draft.email} editing={editing} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} />
          <ProfileField label="Login Password" value="Managed from Change Password" />
        </ProfileSection>

        <ProfileSection title="Bank Information" icon={Landmark}>
          {editing ? (
            <SelectInput label="Bank Name" value={draft.bankName} options={bankOptions} onChange={(value) => setDraft((current) => ({ ...current, bankName: value }))} />
          ) : (
            <ProfileField label="Bank Name" value={draft.bankName} />
          )}
          <EditableField label="Bank Account Holder Name" value={draft.bankAccountHolderName} editing={editing} onChange={(value) => setDraft((current) => ({ ...current, bankAccountHolderName: value }))} />
          <EditableField label="Bank Account Number" value={draft.bankAccountNumber} editing={editing} onChange={(value) => setDraft((current) => ({ ...current, bankAccountNumber: value }))} />
        </ProfileSection>

        <ProfileSection title="Identity" icon={IdCard}>
          {editing ? (
            <label className="block text-sm font-medium">
              Identity Type <span className="text-red-600">*</span>
              <select
                value={draft.identityType}
                onChange={(event) => setDraft((current) => ({ ...current, identityType: event.target.value as IdentityType }))}
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                <option value="NRIC">NRIC</option>
                <option value="Passport">Passport</option>
                <option value="SSM">SSM</option>
              </select>
            </label>
          ) : (
            <ProfileField label="Identity Type" value={draft.identityType} />
          )}
          <EditableField label={labels.identityNo} value={draft.identityNo} editing={editing} onChange={(value) => setDraft((current) => ({ ...current, identityNo: value }))} />
          <EditableField label={labels.fullName} value={draft.fullName} editing={editing} onChange={(value) => setDraft((current) => ({ ...current, fullName: value }))} />
          <EditableField label={labels.date} type="date" value={draft.dateOfBirth} editing={editing} onChange={(value) => setDraft((current) => ({ ...current, dateOfBirth: value }))} />
          <EditableField label="TIN Number" value={draft.tinNumber} editing={editing} onChange={(value) => setDraft((current) => ({ ...current, tinNumber: value }))} />
          <EditableField label="Occupation" value={draft.occupation} editing={editing} onChange={(value) => setDraft((current) => ({ ...current, occupation: value }))} />
        </ProfileSection>

        <ProfileSection title="Contact & Address" icon={MapPin}>
          <EditableField label="Country" value={draft.country} editing={editing} onChange={(value) => setDraft((current) => ({ ...current, country: value }))} />
          {editing ? (
            <>
              <EditableField label="Mobile Code" value={draft.mobileCode} editing={editing} onChange={(value) => setDraft((current) => ({ ...current, mobileCode: value }))} />
              <EditableField label="Mobile Number" value={draft.mobileNumber} editing={editing} onChange={(value) => setDraft((current) => ({ ...current, mobileNumber: value }))} />
            </>
          ) : (
            <ProfileField label="Mobile" value={formatMobile(draft.mobileCode, draft.mobileNumber)} />
          )}
          <EditableField label="Postcode" value={draft.postcode} editing={editing} onChange={(value) => setDraft((current) => ({ ...current, postcode: value }))} />
          <EditableField label="State" value={draft.state} editing={editing} onChange={(value) => setDraft((current) => ({ ...current, state: value }))} />
          <EditableField label="City" value={draft.city} editing={editing} onChange={(value) => setDraft((current) => ({ ...current, city: value }))} />
          {editing ? (
            <>
              <EditableField label="Address 1" value={draft.address1} editing={editing} onChange={(value) => setDraft((current) => ({ ...current, address1: value }))} />
              <EditableField label="Address 2" value={draft.address2} editing={editing} required={false} onChange={(value) => setDraft((current) => ({ ...current, address2: value }))} />
            </>
          ) : (
            <ProfileField label="Address" value={formatAddress(draft.address1, draft.address2)} />
          )}
        </ProfileSection>

        <IdentityVerificationSection identityType={draft.identityType} />
      </div>

      <div className="space-y-5">
        <AgentAccessPanel loginTime={loginTime} />
        <ProfileActivityPanel userName={profile.fullName} status={profile.status} />
      </div>
    </div>
  );
}

function AgentAccessPanel({ loginTime }: { loginTime: string }) {
  return (
    <aside className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFF8E1] text-brandGold">
          <UserRound className="h-5 w-5" />
        </span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-textPrimary">Agent Access</h3>
      </div>

      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brandGold text-white shadow-soft">
          <UserRound className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <div className="text-base font-semibold uppercase text-textPrimary">Agent</div>
          <div className="mt-1 text-sm font-semibold text-textPrimary">Agent Access</div>
          <p className="mt-1 text-sm leading-6 text-textSecondary">Access to client management, trust application and network building.</p>
        </div>
      </div>

      <div className="mt-5 flex items-start gap-3 border-t border-line pt-4">
        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-textSecondary" />
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Last Login</div>
          <div className="mt-1 text-sm font-semibold text-textPrimary">{formatProfileDateTime(loginTime)}</div>
        </div>
      </div>
    </aside>
  );
}

function IdentityVerificationSection({ identityType }: { identityType: IdentityType }) {
  const config = getIdentityVerificationConfig(identityType);
  const [documents, setDocuments] = useState<VerificationDocument[]>(config.documents);

  useEffect(() => {
    setDocuments(config.documents);
  }, [identityType]);

  const uploadDocument = (title: string, file: File | undefined) => {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!acceptedIdentityImageExtensionSet.has(extension)) {
      notifyError("Identity image must be a JPG, JPEG or PNG image.", "identity-document-image-type");
      return;
    }
    if (file.size > maxImageSize) {
      notifyError("Identity image must not be more than 5MB.", "identity-document-image-size");
      return;
    }

    const reader = new FileReader();
    const loadingId = beginLoading();
    reader.onload = () => {
      const imageUrl = String(reader.result);
      setDocuments((current) => current.map((document) => (document.title === title ? { ...document, imageUrl } : document)));
      endLoading(loadingId);
      notifySuccess(`${title} uploaded successfully.`, "identity-document-upload-success");
    };
    reader.onerror = () => {
      endLoading(loadingId);
      notifyError("Unable to upload this image. Please try again.", "identity-document-upload-error");
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-white p-5 shadow-soft">
      <div className="mb-4 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFF8E1] text-brandGold">
              <BadgeCheck className="h-5 w-5" />
            </span>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-textPrimary">Identity Verification</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-textSecondary">{config.description}</p>
        </div>
      </div>

      <div className="mb-4 flex min-w-0 items-start gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm leading-5 text-blue-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span className="min-w-0 break-words">Upload JPG, JPEG or PNG files only. Each file must not be more than 5MB.</span>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        {documents.map((document) => (
          <VerificationDocumentCard key={document.title} document={document} onUpload={(file) => uploadDocument(document.title, file)} />
        ))}
      </div>
    </section>
  );
}

function VerificationDocumentCard({ document, onUpload }: { document: VerificationDocument; onUpload: (file: File | undefined) => void }) {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    multiple: false,
    noClick: true,
    noKeyboard: true,
    onDrop: (acceptedFiles) => onUpload(acceptedFiles[0])
  });

  return (
    <div
      {...getRootProps({
        className: isDragActive
          ? "w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-brandGold bg-[#FFF8E1] p-4 transition"
          : "w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-white p-4 transition hover:border-brandGold/60"
      })}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-lg border border-line bg-soft">
          {document.imageUrl ? <img src={document.imageUrl} alt={document.title} className="h-full w-full object-cover" /> : <IdCard className="h-10 w-10 text-brandGold" />}
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="min-w-0">
            <div className="text-base font-semibold text-textPrimary">{document.title}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-textSecondary">
              <span>{document.imageUrl ? "Image uploaded" : "Image not uploaded"}</span>
              {document.imageUrl ? <Check className="h-4 w-4 shrink-0 rounded-full bg-green-600 p-0.5 text-white" /> : null}
            </div>
          </div>
          <div className="mt-4 min-w-0 break-words rounded-lg border border-dashed border-line bg-soft px-4 py-3 text-sm font-medium leading-5 text-textSecondary">
            {isDragActive ? "Drop the image here" : "Drag and drop a JPG, JPEG or PNG image here"}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={open}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-textPrimary transition hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" />
              {document.imageUrl ? "Replace" : "Upload"}
            </button>
          </div>
        </div>
        <input {...getInputProps({ accept: acceptedIdentityImageExtensions })} />
      </div>
    </div>
  );
}

function ProfilePhoto({ name, photoUrl, onUpload }: { name: string; photoUrl?: string; onUpload: () => void }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <button type="button" onClick={onUpload} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-white bg-ink text-lg font-semibold text-white shadow-soft">
      {photoUrl ? <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" /> : initials}
      <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition group-hover:opacity-100">
        <Camera className="h-5 w-5" />
      </span>
    </button>
  );
}

function ProfileActivityPanel({ userName, status }: { userName: string; status: UserStatus }) {
  const { can } = usePermission();
  const [records, setRecords] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const canViewFullActivity = can("requestLog.view") || can("fileUploadLog.view");

  const loadActivity = () => {
    setLoading(true);
    setFailed(false);
    listRecords<AuditLog>("trust-fund-audit-logs", auditLogs as AuditLog[])
      .then((items) => {
        setRecords(
          items
            .filter((item) => item.user.toLowerCase() === userName.toLowerCase())
            .sort((a, b) => Date.parse(b.dateTime) - Date.parse(a.dateTime))
            .slice(0, 5)
        );
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadActivity();
  }, [userName]);

  return (
    <aside className="rounded-lg border border-line bg-soft p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-brandGold shadow-sm">
        <Activity className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-textPrimary">Account Activity</h3>
      <p className="mt-2 text-sm leading-6 text-textSecondary">Recent activities and account events associated with this user.</p>

      <div className={status === "ACTIVE" ? "mt-5 rounded-lg border border-green-200 bg-green-50 p-4" : "mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4"}>
        <div className="flex items-start gap-3">
          {status === "ACTIVE" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
          <div>
            <div className={status === "ACTIVE" ? "text-sm font-semibold text-green-800" : "text-sm font-semibold text-amber-800"}>{formatStatus(status)}</div>
            <p className={status === "ACTIVE" ? "mt-1 text-xs leading-5 text-green-700" : "mt-1 text-xs leading-5 text-amber-700"}>
              {status === "ACTIVE" ? "This account currently has access to the system." : "This account is not currently active."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Recent Activity</h4>
          <History className="h-4 w-4 text-textSecondary" />
        </div>

        {loading ? <ActivitySkeleton /> : null}
        {!loading && failed ? <ActivityError onRetry={loadActivity} /> : null}
        {!loading && !failed && records.length === 0 ? <ActivityEmpty /> : null}
        {!loading && !failed && records.length > 0 ? (
          <ol className="space-y-0">
            {records.map((record, index) => (
              <ActivityTimelineItem key={record.id} record={record} last={index === records.length - 1} />
            ))}
          </ol>
        ) : null}
      </div>

      {canViewFullActivity ? (
        <Link to={`/audit/request-log?user=${encodeURIComponent(userName)}`} className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-semibold text-textPrimary transition hover:border-brandGold hover:bg-gray-50">
          View Full Activity
          <span className="ml-1">→</span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => notifyError("You do not have permission to view the full audit history.", "profile-activity-permission")}
          className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-semibold text-textSecondary transition hover:bg-gray-50"
        >
          View Full Activity
          <span className="ml-1">→</span>
        </button>
      )}
    </aside>
  );
}

function ActivityTimelineItem({ record, last }: { record: AuditLog; last: boolean }) {
  const display = formatAuditRecord(record);
  const Icon = getActivityIcon(record);

  return (
    <li className="relative grid grid-cols-[28px_1fr] gap-3 pb-5 last:pb-0">
      {!last ? <span className="absolute left-[9px] top-7 h-[calc(100%-1.75rem)] w-px bg-line" /> : null}
      <span className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full ${getActivityTone(record)}`}>
        <Icon className="h-3 w-3" />
      </span>
      <div className="min-w-0 rounded-lg bg-white p-3 transition hover:border-brandGold">
        <div className="break-words text-sm font-semibold text-textPrimary">{display.title}</div>
        <p className="mt-1 break-words text-xs leading-5 text-textSecondary">{display.description}</p>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <Clock3 className="h-3.5 w-3.5" />
          {formatActivityDate(record.dateTime)}
        </div>
      </div>
    </li>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="grid grid-cols-[28px_1fr] gap-3">
          <div className="h-5 w-5 animate-pulse rounded-full bg-gray-200" />
          <div className="space-y-2 rounded-lg bg-white p-3">
            <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityEmpty() {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white p-5 text-center">
      <History className="mx-auto h-8 w-8 text-textSecondary" />
      <h4 className="mt-3 text-sm font-semibold text-textPrimary">No activity recorded yet.</h4>
      <p className="mt-1 text-xs leading-5 text-textSecondary">Activity performed by this user will appear here.</p>
    </div>
  );
}

function ActivityError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4" />
        Unable to load recent activity.
      </div>
      <button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700">
        <RotateCcw className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  );
}

function ReferralQrCard({ referralCode }: { referralCode: string }) {
  const copyReferralLink = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const referralLink = `${origin}/agent/signup?referralCode=${encodeURIComponent(referralCode)}`;

    try {
      await navigator.clipboard.writeText(referralLink);
      notifySuccess("Referral link copied successfully.", "referral-link-copy");
    } catch {
      notifyError("Unable to copy referral link.", "referral-link-copy-error");
    }
  };

  return (
    <div className="flex w-fit items-center gap-3 rounded-lg border border-line bg-white p-3 shadow-soft">
      <div className="grid h-20 w-20 grid-cols-5 grid-rows-5 gap-1 rounded-md border border-line bg-white p-2">
        {Array.from({ length: 25 }).map((_, index) => (
          <span key={index} className={getQrCellClass(index)} />
        ))}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brandGold">
          <QrCode className="h-4 w-4" />
          Referral QR
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="text-sm font-semibold text-textPrimary">{referralCode}</div>
          <button
            type="button"
            onClick={copyReferralLink}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-brandGold/30 bg-[#FFF8E1] text-brandGold transition hover:border-brandGold hover:bg-brandGold hover:text-white"
            aria-label="Copy referral link"
            title="Copy referral link"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1 max-w-[180px] text-xs leading-5 text-textSecondary">Share this code for agent referrals.</p>
      </div>
    </div>
  );
}

function ProfileSection({ title, icon: Icon, action, children }: { title: string; icon: typeof Mail; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-soft text-brandGold">
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-textPrimary">{title}</h3>
        </div>
        {action}
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-textSecondary">
        {getFieldIcon(label)}
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-textPrimary">{value || "-"}</div>
    </div>
  );
}

function EditableField({
  label,
  value,
  editing,
  onChange,
  type = "text",
  readOnly = false,
  required = true
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange?: (value: string) => void;
  type?: string;
  readOnly?: boolean;
  required?: boolean;
}) {
  if (!editing || readOnly) return <ProfileField label={label} value={value} />;

  return <TextInput label={label} value={value} onChange={onChange ?? (() => undefined)} type={type} required={required} />;
}

function TextInput({ label, value, onChange, type = "text", required = true }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  if (type === "date") return <DatePickerInput label={label} value={value} onChange={onChange} required={required} />;

  return (
    <label className="block text-sm font-medium">
      {label} {required ? <span className="text-red-600">*</span> : null}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
      />
    </label>
  );
}

function SelectInput({ label, value, options, onChange, required = true }: { label: string; value: string; options: string[]; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="block text-sm font-medium">
      {label} {required ? <span className="text-red-600">*</span> : null}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function validateAgentProfile(profile: AgentProfile) {
  if (!isValidEmail(profile.email)) return "Enter a valid email address.";
  if (!profile.identityNo.trim()) return "Identity no. is required.";
  if (!profile.fullName.trim()) return "Full name or company name is required.";
  if (!profile.dateOfBirth) return "Date of birth is required.";
  if (!profile.tinNumber.trim()) return "TIN number is required.";
  if (!profile.occupation.trim()) return "Occupation is required.";
  if (!profile.bankName.trim()) return "Bank name is required.";
  if (!profile.bankAccountHolderName.trim()) return "Bank account holder name is required.";
  if (!/^\d{6,20}$/.test(profile.bankAccountNumber.replace(/\s/g, ""))) return "Bank account number must be 6-20 digits.";
  if (!profile.country.trim()) return "Country is required.";
  if (!profile.mobileCode.trim()) return "Mobile code is required.";
  if (!/^\d{7,12}$/.test(profile.mobileNumber)) return "Mobile number must be 7-12 digits.";
  if (!/^\d{4,10}$/.test(profile.postcode)) return "Postcode must be 4-10 digits.";
  if (!profile.state.trim()) return "State is required.";
  if (!profile.city.trim()) return "City is required.";
  if (!profile.address1.trim()) return "Address 1 is required.";
  return "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getIdentityLabels(identityType: IdentityType) {
  if (identityType === "Passport") return { identityNo: "Passport No.", fullName: "Full Name (as per Passport)", date: "Date of Birth" };
  if (identityType === "SSM") return { identityNo: "Registration No.", fullName: "Registered Company Name", date: "Date of Registration" };
  return { identityNo: "NRIC No.", fullName: "Full Name (as per NRIC)", date: "Date of Birth" };
}

function formatStatus(status: UserStatus) {
  return status === "ACTIVE" ? "Active" : "Inactive";
}

function getRoleAccessSummary(role: RoleId) {
  switch (role) {
    case "SA":
      return {
        roleName: "SUPER ADMINISTRATOR",
        title: "Full System Access",
        description: "Access to all system modules, administration, configuration and security functions."
      };
    case "AD":
      return {
        roleName: "ADMINISTRATOR",
        title: "Administrative Access",
        description: "Access to agent management, trust administration, approvals and administrative workflows."
      };
    case "OP":
      return {
        roleName: "OPERATION",
        title: "Operational Access",
        description: "Access to trust processing, application review and operational workflows."
      };
    case "AC":
      return {
        roleName: "ACCOUNT",
        title: "Finance & Account Access",
        description: "Access to commission, payout, payment records and financial workflows."
      };
    default:
      return {
        roleName: roles[role].toUpperCase(),
        title: "Agent Access",
        description: "Access to assigned trust workflows and available agent functions."
      };
  }
}

function getIdentityVerificationConfig(identityType: IdentityType) {
  if (identityType === "Passport") {
    return {
      description: "Upload your passport document for account verification. The information page with photo and personal details is required.",
      documents: [
        {
          title: "Passport - Information Page"
        }
      ]
    };
  }

  if (identityType === "SSM") {
    return {
      description: "Upload your SSM registration document for account verification. Please upload the complete and clear SSM certificate.",
      documents: [
        {
          title: "SSM Registration Certificate"
        }
      ]
    };
  }

  return {
    description: "Upload your identification documents for account verification. Files are securely submitted for KYC review.",
    documents: [
      {
        title: "IC - Front"
      },
      {
        title: "IC - Back"
      }
    ]
  };
}

function formatProfileDateTime(value: string) {
  try {
    return format(parseISO(value), "dd MMM yyyy · hh:mm a");
  } catch {
    return value;
  }
}

function formatMobile(code: string, number: string) {
  const digits = number.replace(/\D/g, "");
  if (digits.length >= 9) return `${code} ${digits.slice(0, 2)}-${digits.slice(2, 5)} ${digits.slice(5)}`;
  if (digits.length >= 7) return `${code} ${digits.slice(0, 2)}-${digits.slice(2)}`;
  return [code, number].filter(Boolean).join(" ");
}

function formatAddress(address1: string, address2: string) {
  return [address1, address2].filter((line) => line.trim()).join(", ");
}

function formatAuditRecord(record: AuditLog) {
  const action = record.action.trim();
  const module = record.module.trim();
  const reference = record.recordReference.trim();
  const normalizedAction = action.toLowerCase();

  if (normalizedAction.includes("logged in")) {
    return { title: "User Login", description: "Successfully logged into the system." };
  }
  if (normalizedAction.includes("logout") || normalizedAction.includes("logged out")) {
    return { title: "User Logout", description: "Signed out from the system." };
  }
  if (normalizedAction.includes("approved")) {
    return { title: `${singularize(module)} Approved`, description: `Approved ${module.toLowerCase()} ${reference}.` };
  }
  if (normalizedAction.includes("updated") || normalizedAction.includes("saved")) {
    return { title: `${singularize(module)} Updated`, description: record.description || `Updated ${module.toLowerCase()} ${reference}.` };
  }
  if (normalizedAction.includes("created")) {
    return { title: `${singularize(module)} Created`, description: record.description || `Created ${module.toLowerCase()} ${reference}.` };
  }

  return {
    title: toTitleCase(action),
    description: record.description || `${toTitleCase(action)} in ${module}${reference ? ` (${reference})` : ""}.`
  };
}

function getActivityIcon(record: AuditLog) {
  const text = `${record.action} ${record.module}`.toLowerCase();
  if (text.includes("login") || text.includes("security")) return ShieldCheck;
  if (text.includes("document") || text.includes("report")) return FileText;
  if (text.includes("approved") || text.includes("success")) return CheckCircle2;
  return Activity;
}

function getActivityTone(record: AuditLog) {
  const text = `${record.action} ${record.module} ${record.result}`.toLowerCase();
  if (text.includes("approved") || text.includes("success")) return "bg-green-50 text-green-700 ring-4 ring-green-50";
  if (text.includes("reject") || text.includes("delete") || text.includes("fail")) return "bg-red-50 text-red-700 ring-4 ring-red-50";
  if (text.includes("security") || text.includes("password")) return "bg-amber-50 text-amber-700 ring-4 ring-amber-50";
  return "bg-[#FFF8E1] text-brandGold ring-4 ring-[#FFF8E1]";
}

function formatActivityDate(value: string) {
  try {
    return format(parseISO(value), "dd MMM yyyy · hh:mm a");
  } catch {
    return value;
  }
}

function singularize(value: string) {
  return value.endsWith("s") ? value.slice(0, -1) : value;
}

function toTitleCase(value: string) {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function getDepartment(roleName: string) {
  if (roleName.includes("Administrator")) return "System Administration";
  if (roleName.includes("Operation")) return "Operations";
  if (roleName.includes("Account")) return "Accounts";
  return "Platform Governance";
}

function getFieldIcon(label: string) {
  if (label.toLowerCase().includes("email")) return <Mail className="h-3.5 w-3.5" />;
  if (label.toLowerCase().includes("address") || label.toLowerCase().includes("country") || label.toLowerCase().includes("state") || label.toLowerCase().includes("city")) return <MapPin className="h-3.5 w-3.5" />;
  if (label.toLowerCase().includes("role") || label.toLowerCase().includes("status")) return <ShieldCheck className="h-3.5 w-3.5" />;
  return <IdCard className="h-3.5 w-3.5" />;
}

function getQrCellClass(index: number) {
  const darkCells = new Set([0, 1, 3, 4, 5, 6, 8, 10, 12, 14, 15, 17, 18, 20, 21, 23, 24]);
  return darkCells.has(index) ? "rounded-sm bg-ink" : "rounded-sm bg-brandGold/20";
}
