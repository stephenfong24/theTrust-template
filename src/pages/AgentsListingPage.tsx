import {
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  IdCard,
  Landmark,
  MapPin,
  MoreHorizontal,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
  UserRound,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { PageHeader } from "../components/common/PageHeader";
import { Pagination } from "../components/common/Pagination";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import agents from "../data/agents.json";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { notifyError, notifySuccess } from "../services/notificationService";
import type { UserStatus } from "../types";

type IdentityType = "NRIC" | "Passport" | "SSM";
type Ranking = "Saving Trust Representative" | "Trust Representative" | "Trust Manager" | "Trust Director" | "Group Trust Director" | "Chief Trust Director";
type KycStatus = "Pending Review" | "Verified" | "Rejected";

interface AgentRecord {
  id: string;
  email: string;
  fullName: string;
  ranking: Ranking;
  identityType: IdentityType;
  identityId: string;
  introducer: string;
  introducerEmail: string;
  referralCode: string;
  trustReferralCode?: string;
  willReferralCode?: string;
  dateOfBirth: string;
  tinNumber: string;
  occupation: string;
  country: string;
  mobileCode: string;
  mobileNumber: string;
  address1: string;
  address2: string;
  city: string;
  postcode: string;
  state: string;
  bankName: string;
  bankAccountHolderName: string;
  bankAccountNumber: string;
  status: UserStatus;
  kycStatus: KycStatus;
  kycDocuments: KycDocument[];
}

interface KycDocument {
  title: string;
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
  uploadedInEdit?: boolean;
}

interface AgentFilters {
  query: string;
  introducer: string;
  ranking: Ranking | typeof allFilter;
}

const allFilter = "all";
const pageSizeOptions = [5, 10, 20];
const rankings: Ranking[] = ["Saving Trust Representative", "Trust Representative", "Trust Manager", "Trust Director", "Group Trust Director", "Chief Trust Director"];
const identityTypes: IdentityType[] = ["NRIC", "Passport", "SSM"];
const statusOptions: UserStatus[] = ["ACTIVE", "INACTIVE"];
const countries = ["Malaysia", "Singapore", "Indonesia", "Thailand", "Brunei", "Philippines"];
const mobileCodes = [
  { country: "Malaysia", code: "+60" },
  { country: "Singapore", code: "+65" },
  { country: "Indonesia", code: "+62" },
  { country: "Thailand", code: "+66" },
  { country: "Brunei", code: "+673" },
  { country: "Philippines", code: "+63" }
];
const bankOptions = ["Maybank", "CIMB Bank", "Public Bank", "RHB Bank", "Hong Leong Bank", "AmBank", "Bank Islam", "OCBC Bank", "UOB Bank"];
const passwordCriteria = "Password must be 6-30 characters and include uppercase, lowercase, one number, and one symbol.";
const maxUploadSize = 10 * 1024 * 1024;

export function AgentsListingPage() {
  const [records, setRecords] = useState<AgentRecord[]>(() => createInitialAgents());
  const [draftFilters, setDraftFilters] = useState<AgentFilters>(createEmptyFilters());
  const [filters, setFilters] = useState<AgentFilters>(createEmptyFilters());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [viewRecord, setViewRecord] = useState<AgentRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<AgentRecord | null>(null);
  const [passwordRecord, setPasswordRecord] = useState<AgentRecord | null>(null);

  const filteredRecords = useMemo(() => applyAgentFilters(records, filters), [filters, records]);
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const pageRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters({ ...draftFilters, query: draftFilters.query.trim(), introducer: draftFilters.introducer.trim() });
    setPage(1);
  };

  const resetSearch = () => {
    const empty = createEmptyFilters();
    setDraftFilters(empty);
    setFilters(empty);
    setPage(1);
  };

  const saveAgent = (updated: AgentRecord) => {
    setRecords((current) => current.map((record) => (record.id === updated.id ? updated : record)));
    setEditingRecord(null);
    setViewRecord((current) => (current?.id === updated.id ? null : current));
    notifySuccess("Agent updated successfully.", "agent-update");
  };

  return (
    <>
      <PageHeader title="Agents Listing" description="Search, review and manage agent account details." />

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="border-b border-line p-4">
          <form onSubmit={submitSearch} className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_minmax(220px,0.8fr)_220px_auto_auto]">
            <SearchField
              label="Search agent"
              value={draftFilters.query}
              placeholder="Search by name, email or identity id..."
              onChange={(value) => setDraftFilters((current) => ({ ...current, query: value }))}
            />
            <SearchField
              label="Introducer"
              value={draftFilters.introducer}
              placeholder="Introducer email or name"
              onChange={(value) => setDraftFilters((current) => ({ ...current, introducer: value }))}
            />
            <label className="block text-sm font-medium text-textPrimary">
              Rank
              <select
                value={draftFilters.ranking}
                onChange={(event) => setDraftFilters((current) => ({ ...current, ranking: event.target.value as AgentFilters["ranking"] }))}
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                <option value={allFilter}>All Ranks</option>
                {rankings.map((ranking) => (
                  <option key={ranking} value={ranking}>
                    {ranking}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={resetSearch} className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-lg border border-line bg-white px-4 text-sm font-semibold text-textPrimary transition hover:bg-gray-50">
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-lg bg-ink px-5 text-sm font-semibold text-white shadow-soft transition hover:bg-black">
              <Search className="h-4 w-4" />
              Search
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-textSecondary">{filteredRecords.length} agents</div>
          <label className="flex items-center gap-2 text-sm text-textSecondary">
            Rows
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-9 rounded-lg border border-line bg-white px-2 text-textPrimary"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
              <tr>
                <TableHead>ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Ranking</TableHead>
                <TableHead>Identity Type</TableHead>
                <TableHead>Identity ID</TableHead>
                <TableHead>Introducer</TableHead>
                <TableHead>Action</TableHead>
              </tr>
            </thead>
            <tbody>
              {pageRecords.map((record, index) => (
                <tr key={record.id} className="transition hover:bg-gray-50">
                  <TableCell className="font-semibold text-textPrimary">{(page - 1) * pageSize + index + 1}</TableCell>
                  <TableCell>{record.email}</TableCell>
                  <TableCell className="min-w-52 font-semibold text-textPrimary">{record.fullName}</TableCell>
                  <TableCell>
                    <RankingBadge ranking={record.ranking} />
                  </TableCell>
                  <TableCell>{record.identityType}</TableCell>
                  <TableCell>{record.identityId}</TableCell>
                  <TableCell className="min-w-48">{record.introducer}</TableCell>
                  <TableCell>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenActionId((current) => (current === record.id ? null : record.id))}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-textSecondary hover:bg-gray-100"
                        aria-label={`Actions for ${record.fullName}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {openActionId === record.id ? (
                        <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-line bg-white p-2 shadow-soft">
                          <ActionItem label="View" onClick={() => { setViewRecord(record); setOpenActionId(null); }} />
                          <ActionItem label="Edit" onClick={() => { setEditingRecord(record); setOpenActionId(null); }} />
                          <ActionItem label="Change Password" onClick={() => { setPasswordRecord(record); setOpenActionId(null); }} />
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} pageCount={pageCount} totalRecords={filteredRecords.length} pageSize={pageSize} itemLabel="agents" onPageChange={setPage} />
      </section>

      <AgentViewDrawer
        record={viewRecord}
        onClose={() => setViewRecord(null)}
        onEdit={(record) => {
          setEditingRecord(record);
        }}
        onChangePassword={(record) => {
          setPasswordRecord(record);
        }}
      />
      <AgentEditModal record={editingRecord} onClose={() => setEditingRecord(null)} onSubmit={saveAgent} />
      <ChangePasswordModal
        record={passwordRecord}
        onClose={() => setPasswordRecord(null)}
        onSuccess={(record) => {
          setPasswordRecord(null);
          setViewRecord((current) => (current?.id === record.id ? null : current));
        }}
      />
    </>
  );
}

function AgentEditModal({ record, onClose, onSubmit }: { record: AgentRecord | null; onClose: () => void; onSubmit: (record: AgentRecord) => void }) {
  const [draft, setDraft] = useState<AgentRecord | null>(record);
  const [mobileCodeOpen, setMobileCodeOpen] = useState(false);

  useEffect(() => {
    setDraft(record);
    setMobileCodeOpen(false);
  }, [record]);

  if (!draft) return null;

  const labels = getIdentityLabels(draft.identityType);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateAgent(draft);
    if (error) {
      notifyError(error, "agent-edit-validation");
      return;
    }
    onSubmit({
      ...draft,
      email: draft.email.trim(),
      fullName: draft.fullName.trim(),
      identityId: draft.identityId.trim(),
      bankName: draft.bankName.trim(),
      bankAccountHolderName: draft.bankAccountHolderName.trim(),
      bankAccountNumber: draft.bankAccountNumber.trim()
    });
  };

  const update = (patch: Partial<AgentRecord>) => setDraft((current) => (current ? { ...current, ...patch } : current));

  return (
    <Dialog open={Boolean(record)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
          <DialogDescription>Update agent signup, ranking, status, bank and KYC information.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
            <FormSection title="Referral & Account" icon={BriefcaseBusiness}>
              <TextField label="Email" type="email" value={draft.email} onChange={(value) => update({ email: value })} required />
              <SelectField label="Ranking" value={draft.ranking} options={rankings} onChange={(value) => update({ ranking: value as Ranking })} required />
              <SelectField label="Status" value={draft.status} options={statusOptions} getLabel={(value) => (value === "ACTIVE" ? "Active" : "Inactive")} onChange={(value) => update({ status: value as UserStatus })} required />
            </FormSection>

            <FormSection title="Identity" icon={IdCard}>
              <SelectField label="Identity Type" value={draft.identityType} options={identityTypes} onChange={(value) => update({ identityType: value as IdentityType, kycDocuments: createKycDocuments(value as IdentityType) })} required />
              <TextField label={labels.identityNo} value={draft.identityId} onChange={(value) => update({ identityId: value })} required />
              <TextField label={labels.fullName} value={draft.fullName} onChange={(value) => update({ fullName: value })} required />
              <TextField label={labels.date} type="date" value={draft.dateOfBirth} onChange={(value) => update({ dateOfBirth: value })} required />
              <TextField label="TIN Number" value={draft.tinNumber} onChange={(value) => update({ tinNumber: value })} required />
              <TextField label="Occupation" value={draft.occupation} onChange={(value) => update({ occupation: value })} required />
            </FormSection>

            <FormSection title="Contact & Address" icon={MapPin}>
              <SelectField label="Country" value={draft.country} options={countries} onChange={(value) => update({ country: value })} required />
              <MobileField
                code={draft.mobileCode}
                number={draft.mobileNumber}
                open={mobileCodeOpen}
                onToggle={() => setMobileCodeOpen((current) => !current)}
                onCodeChange={(mobileCode) => {
                  update({ mobileCode });
                  setMobileCodeOpen(false);
                }}
                onNumberChange={(mobileNumber) => update({ mobileNumber })}
              />
              <TextField label="Address Line 1" value={draft.address1} onChange={(value) => update({ address1: value })} required className="md:col-span-2" />
              <TextField label="Address Line 2" value={draft.address2} onChange={(value) => update({ address2: value })} className="md:col-span-2" />
              <TextField label="City" value={draft.city} onChange={(value) => update({ city: value })} required />
              <TextField label="Postcode" value={draft.postcode} onChange={(value) => update({ postcode: value })} required />
              <TextField label="State" value={draft.state} onChange={(value) => update({ state: value })} required />
            </FormSection>

            <FormSection title="Bank Information" icon={Landmark}>
              <SelectField label="Bank Name" value={draft.bankName} options={bankOptions} onChange={(value) => update({ bankName: value })} required />
              <TextField label="Bank Account Holder Name" value={draft.bankAccountHolderName} onChange={(value) => update({ bankAccountHolderName: value })} required />
              <TextField label="Bank Account Number" value={draft.bankAccountNumber} onChange={(value) => update({ bankAccountNumber: value })} required />
            </FormSection>

            <FormSection title="KYC Information" icon={BadgeCheck}>
              <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
                {draft.kycDocuments.map((document) => (
                  <KycUploadCard
                    key={document.title}
                    document={document}
                    onUpload={(file) => handleKycUpload(file, document.title, draft, update)}
                  />
                ))}
              </div>
            </FormSection>
          </div>

          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Submit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AgentViewDrawer({
  record,
  onClose,
  onEdit,
  onChangePassword
}: {
  record: AgentRecord | null;
  onClose: () => void;
  onEdit: (record: AgentRecord) => void;
  onChangePassword: (record: AgentRecord) => void;
}) {
  useBodyScrollLock(Boolean(record));

  if (!record) return null;

  const openNetwork = () => {
    window.open(`/network/the-trust?agent=${encodeURIComponent(record.id)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" className="absolute inset-0 bg-black/30" aria-label="Close agent details" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-brandGold">Agent Profile</div>
            <h2 className="mt-1 text-xl font-semibold text-textPrimary">{record.fullName}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-soft px-3 py-1 text-textSecondary">{record.email}</span>
              <StatusBadge status={record.status} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => onEdit(record)}>
                Edit
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => onChangePassword(record)}>
                Change Password
              </Button>
              <Button type="button" size="sm" onClick={openNetwork}>
                View Network
              </Button>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-line p-2 text-textSecondary hover:bg-gray-50" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="border-b border-line bg-soft p-4">
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Ranking" value={record.ranking} />
            <MiniStat label="Identity" value={`${record.identityType} ${record.identityId}`} />
          </div>
        </div>
        <div className="space-y-4 overflow-y-auto p-5">
          <DetailSection title="Profile" icon={UserRound}>
            <CompactGrid>
              <DetailField label="Mobile" value={formatMobile(record.mobileCode, record.mobileNumber)} />
              <DetailField label="Date of Birth" value={record.dateOfBirth} />
              <DetailField label="Occupation" value={record.occupation} />
              <DetailField label="TIN Number" value={record.tinNumber} />
              <DetailField label="The Trust Referral Code" value={record.trustReferralCode ?? "-"} />
              <DetailField label="The Will Referral Code" value={record.willReferralCode ?? "-"} />
            </CompactGrid>
          </DetailSection>

          <DetailSection title="Address" icon={MapPin}>
            <CompactGrid>
              <DetailField label="Address 1" value={record.address1} />
              <DetailField label="Address 2" value={record.address2} />
              <DetailField label="Postcode" value={record.postcode} />
              <DetailField label="City" value={record.city} />
              <DetailField label="State" value={record.state} />
              <DetailField label="Country" value={record.country} />
            </CompactGrid>
          </DetailSection>

          <DetailSection title="Introducer" icon={BriefcaseBusiness}>
            <CompactGrid>
              <DetailField label="Introducer" value={record.introducer} />
              <DetailField label="Introducer Email" value={record.introducerEmail} />
            </CompactGrid>
          </DetailSection>

          <DetailSection title="Bank" icon={Landmark}>
            <CompactGrid>
              <DetailField label="Bank Name" value={record.bankName} />
              <DetailField label="Bank Account Holder Name" value={record.bankAccountHolderName} />
              <DetailField label="Bank Account Number" value={record.bankAccountNumber} />
            </CompactGrid>
          </DetailSection>

          <DetailSection title="KYC Info" icon={BadgeCheck}>
            <div className="space-y-4">
              <CompactGrid>
                <DetailField label="Identity Type" value={record.identityType} />
                <DetailField label="Identity ID" value={record.identityId} />
              </CompactGrid>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {record.kycDocuments.map((doc) => (
                  <DocumentSummary key={doc.title} document={doc} />
                ))}
              </div>
            </div>
          </DetailSection>
        </div>
      </aside>
    </div>
  );
}

function ChangePasswordModal({ record, onClose, onSuccess }: { record: AgentRecord | null; onClose: () => void; onSuccess?: (record: AgentRecord) => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!record) {
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [record]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidPassword(newPassword)) {
      notifyError(passwordCriteria, "agent-password-criteria");
      return;
    }
    if (newPassword !== confirmPassword) {
      notifyError("New login password and confirm new login password do not match.", "agent-password-mismatch");
      return;
    }
    notifySuccess("Agent password changed successfully.", "agent-password-change");
    if (record) {
      onSuccess?.(record);
      return;
    }
    onClose();
  };

  return (
    <Dialog open={Boolean(record)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>{record ? `Set a new login password for ${record.fullName}.` : "Set a new login password."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="space-y-4 rounded-lg border border-line bg-white p-4">
            {record ? (
              <div className="rounded-lg bg-soft px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Agent</div>
                <div className="mt-1 text-sm font-semibold text-textPrimary">{record.fullName}</div>
                <div className="mt-0.5 break-words text-sm text-textSecondary">{record.email}</div>
              </div>
            ) : null}
            <div className="flex items-start gap-2 rounded-lg border border-brandGold/40 bg-[#FFF8E1] px-4 py-3 text-sm leading-6 text-textPrimary">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brandGold" />
              <span>{passwordCriteria}</span>
            </div>
            <PasswordField label="New Login Password" value={newPassword} onChange={setNewPassword} />
            <PasswordField label="Confirm New Login Password" value={confirmPassword} onChange={setConfirmPassword} />
          </div>
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Submit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-textSecondary">{label}</div>
      <div className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-textPrimary">{value}</div>
    </div>
  );
}

function CompactGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function DocumentSummary({ document }: { document: KycDocument }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-white p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soft text-brandGold">
        {document.fileName ? <FileText className="h-5 w-5" /> : <IdCard className="h-5 w-5" />}
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-textPrimary">{document.title}</div>
        <div className="mt-0.5 text-xs text-textSecondary">{document.fileName ? `Uploaded ${document.uploadedAt ?? ""}` : "Not uploaded"}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
  const active = status === "ACTIVE";
  return <span className={active ? "rounded-full bg-green-50 px-3 py-1 text-green-700" : "rounded-full bg-red-50 px-3 py-1 text-red-700"}>{active ? "Active" : "Inactive"}</span>;
}

function KycUploadCard({ document, onUpload }: { document: KycDocument; onUpload: (file: File | undefined) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-soft">
          {document.fileUrl && document.fileUrl.startsWith("data:image/") ? <img src={document.fileUrl} alt={document.title} className="h-full w-full object-cover" /> : document.fileName ? <FileText className="h-9 w-9 text-brandGold" /> : <IdCard className="h-9 w-9 text-brandGold" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-textPrimary">{document.title}</div>
          <div className="mt-2 text-xs text-textSecondary">{document.fileName ? `Uploaded ${document.uploadedAt ?? ""}` : "No document uploaded"}</div>
          <button type="button" onClick={() => inputRef.current?.click()} className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-textPrimary hover:bg-gray-50">
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </div>
        {document.uploadedInEdit ? <Check className="h-4 w-4 shrink-0 rounded-full bg-green-600 p-0.5 text-white" /> : null}
      </div>
      <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(event) => onUpload(event.target.files?.[0])} />
    </div>
  );
}

function SearchField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-textPrimary">
      {label}
      <span className="relative mt-1 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink" />
      </span>
    </label>
  );
}

function FormSection({ title, icon: Icon, children }: { title: string; icon: typeof BriefcaseBusiness; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <div className="mb-4 flex items-center gap-2 border-b border-line pb-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-soft text-brandGold">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-textPrimary">{title}</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function DetailSection({ title, icon: Icon, children }: { title: string; icon: typeof UserRound; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <div className="mb-4 flex items-center gap-2 border-b border-line pb-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-soft text-brandGold">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-textPrimary">{title}</h3>
      </div>
      <div>{children}</div>
    </section>
  );
}

function DetailField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <div className="text-xs font-medium text-textSecondary">{label}</div>
      <div className="mt-1 whitespace-pre-line break-words text-sm font-semibold text-textPrimary">{value || "-"}</div>
    </div>
  );
}

function TextField({ label, value, onChange, type = "text", required = false, readOnly = false, className = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; readOnly?: boolean; className?: string }) {
  return (
    <label className={`block text-sm font-medium text-textPrimary ${className}`}>
      {label} {required ? <span className="text-red-600">*</span> : null}
      <input type={type} value={value} readOnly={readOnly} required={required} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition read-only:bg-soft read-only:text-textSecondary focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink" />
    </label>
  );
}

function SelectField({ label, value, options, onChange, getLabel, required = false }: { label: string; value: string; options: string[]; onChange: (value: string) => void; getLabel?: (value: string) => string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-textPrimary">
      {label} {required ? <span className="text-red-600">*</span> : null}
      <select value={value} required={required} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink">
        {options.map((option) => (
          <option key={option} value={option}>
            {getLabel ? getLabel(option) : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function MobileField({
  code,
  number,
  open,
  onToggle,
  onCodeChange,
  onNumberChange
}: {
  code: string;
  number: string;
  open: boolean;
  onToggle: () => void;
  onCodeChange: (code: string) => void;
  onNumberChange: (number: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-textPrimary">
      Mobile <span className="text-red-600">*</span>
      <span className="mt-1 grid grid-cols-[112px_1fr] gap-2">
        <span className="relative">
          <button
            type="button"
            onClick={onToggle}
            className="flex h-11 w-full items-center justify-between rounded-lg border border-line bg-white px-3 text-sm transition hover:bg-gray-50 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
          >
            {code}
            <ChevronDown className="h-4 w-4 text-textSecondary" />
          </button>
          {open ? (
            <span className="absolute left-0 top-12 z-30 w-56 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-soft">
              {mobileCodes.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => onCodeChange(item.code)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  {item.country} ({item.code})
                  {code === item.code ? <Check className="h-4 w-4 text-brandGold" /> : null}
                </button>
              ))}
            </span>
          ) : null}
        </span>
        <input
          type="tel"
          value={number}
          required
          onChange={(event) => onNumberChange(event.target.value)}
          className="h-11 min-w-0 rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
        />
      </span>
    </label>
  );
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block text-sm font-medium text-textPrimary">
      {label} <span className="text-red-600">*</span>
      <span className="relative mt-1 block">
        <input type={visible ? "text" : "password"} value={value} required onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-line bg-white px-3 pr-11 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink" />
        <button type="button" onClick={() => setVisible((current) => !current)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-textSecondary hover:bg-gray-100 hover:text-textPrimary" aria-label={visible ? "Hide password" : "Show password"}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap border-b border-line px-4 py-3 font-semibold">{children}</th>;
}

function TableCell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap border-b border-line px-4 py-3 text-textSecondary ${className}`}>{children}</td>;
}

function ActionItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="block w-full rounded-md px-3 py-2 text-left text-sm text-textPrimary hover:bg-gray-50">
      {label}
    </button>
  );
}

function RankingBadge({ ranking }: { ranking: Ranking }) {
  return <span className="inline-flex whitespace-nowrap rounded-lg bg-[#FFF8E1] px-3 py-1.5 text-xs font-semibold text-[#8A650F]">{ranking}</span>;
}

function handleKycUpload(file: File | undefined, title: string, draft: AgentRecord, update: (patch: Partial<AgentRecord>) => void) {
  if (!file) return;
  const validType = file.type.startsWith("image/") || file.type === "application/pdf";
  if (!validType) {
    notifyError("Please upload an image or PDF file.", "agent-kyc-file-type");
    return;
  }
  if (file.size > maxUploadSize) {
    notifyError("KYC file must not be more than 10MB.", "agent-kyc-file-size");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    update({
      kycDocuments: draft.kycDocuments.map((document) =>
        document.title === title
          ? {
              ...document,
              fileName: file.name,
              fileUrl: String(reader.result),
              uploadedAt: new Date().toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" }),
              uploadedInEdit: true
            }
          : document
      )
    });
    notifySuccess(`${title} uploaded successfully.`, "agent-kyc-upload");
  };
  reader.readAsDataURL(file);
}

function createInitialAgents(): AgentRecord[] {
  const base = (agents as Array<{ id: string; name: string; email: string; phone: string; status: string }>).map((agent, index) =>
    createAgent({
      id: agent.id,
      email: agent.email,
      fullName: agent.name,
      mobileNumber: agent.phone.replace(/\D/g, "").slice(-9),
      status: agent.status === "Active" ? "ACTIVE" : "INACTIVE",
      index
    })
  );
  const names = ["Siti Amani Rahman", "Daniel Koh Wei Ming", "Priya Nair", "Farid Zulkifli", "Hafiz Omar", "Lina Abdullah", "Tan Mei Ling", "Jason Lee", "Nur Aisyah Karim", "Kumar Rajan", "Chong Pei San", "Adam Lim"];
  return [
    ...base,
    ...names.map((name, index) =>
      createAgent({
        id: `A-${2005 + index}`,
        email: `${name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/\.$/, "")}@example.local`,
        fullName: name,
        mobileNumber: `12${String(4455000 + index * 731).slice(0, 7)}`,
        status: index % 5 === 0 ? "INACTIVE" : "ACTIVE",
        index: index + base.length
      })
    )
  ];
}

function createAgent(input: { id: string; email: string; fullName: string; mobileNumber: string; status: UserStatus; index: number }): AgentRecord {
  const identityType = identityTypes[input.index % identityTypes.length];
  return {
    id: input.id,
    email: input.email,
    fullName: input.fullName,
    ranking: rankings[input.index % rankings.length],
    identityType,
    identityId: identityType === "NRIC" ? `90010${input.index + 1}14${String(1234 + input.index).padStart(4, "0")}` : identityType === "Passport" ? `A${773300 + input.index}` : `SSM-${202600 + input.index}`,
    introducer: input.index % 2 === 0 ? "CNB Amanah Berhad" : "Agent User 01",
    introducerEmail: input.index % 2 === 0 ? "referrals@cnbamanah.example.local" : "agent.user01@example.local",
    referralCode: input.index % 2 === 0 ? "TRUST-REF-0001" : "WILL-REF-0002",
    trustReferralCode: input.index % 4 === 1 ? undefined : `TRUST-REF-${String(input.index + 1).padStart(4, "0")}`,
    willReferralCode: input.index % 3 === 0 ? undefined : `WILL-REF-${String(input.index + 1).padStart(4, "0")}`,
    dateOfBirth: "1990-01-01",
    tinNumber: `IG${String(8800000000 + input.index)}`,
    occupation: input.index % 3 === 0 ? "Financial Planner" : "Trust Consultant",
    country: "Malaysia",
    mobileCode: "+60",
    mobileNumber: input.mobileNumber || "125559679",
    address1: `${10 + input.index}, Jalan Amanah`,
    address2: "Taman Seri Trust",
    city: input.index % 2 === 0 ? "Kuala Lumpur" : "Petaling Jaya",
    postcode: input.index % 2 === 0 ? "50450" : "47810",
    state: input.index % 2 === 0 ? "Kuala Lumpur" : "Selangor",
    bankName: bankOptions[input.index % bankOptions.length],
    bankAccountHolderName: input.fullName,
    bankAccountNumber: String(514239887102 + input.index * 17),
    status: input.status,
    kycStatus: input.index % 5 === 0 ? "Rejected" : input.index % 2 === 0 ? "Verified" : "Pending Review",
    kycDocuments: createKycDocuments(identityType, input.index)
  };
}

function createKycDocuments(identityType: IdentityType, index = 0): KycDocument[] {
  const uploadedAt = new Date(2026, 8, 7 + (index % 10)).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
  const uploaded = index % 4 !== 1;
  const withFile = (title: string, fileName: string): KycDocument => (uploaded ? { title, fileName, uploadedAt } : { title });

  if (identityType === "NRIC") return [withFile("NRIC - Front", "nric-front.jpg"), withFile("NRIC - Back", "nric-back.jpg")];
  if (identityType === "Passport") return [withFile("Passport - Information Page", "passport.pdf")];
  return [withFile("SSM Registration Certificate", "ssm-certificate.pdf")];
}

function createEmptyFilters(): AgentFilters {
  return { query: "", introducer: "", ranking: allFilter };
}

function applyAgentFilters(records: AgentRecord[], filters: AgentFilters) {
  const query = filters.query.toLowerCase();
  const introducer = filters.introducer.toLowerCase();
  return records.filter((record) => {
    const matchesQuery = !query || `${record.fullName} ${record.email} ${record.identityId}`.toLowerCase().includes(query);
    const matchesIntroducer = !introducer || `${record.introducer} ${record.introducerEmail} ${record.referralCode} ${record.trustReferralCode ?? ""} ${record.willReferralCode ?? ""}`.toLowerCase().includes(introducer);
    const matchesRank = filters.ranking === allFilter || record.ranking === filters.ranking;
    return matchesQuery && matchesIntroducer && matchesRank;
  });
}

function validateAgent(agent: AgentRecord) {
  if (!agent.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agent.email.trim())) return "Enter a valid email address.";
  if (!agent.fullName.trim()) return "Full name is required.";
  if (!agent.identityId.trim()) return "Identity id is required.";
  if (!agent.bankName.trim()) return "Bank name is required.";
  if (!agent.bankAccountHolderName.trim()) return "Bank account holder name is required.";
  if (!/^\d{6,20}$/.test(agent.bankAccountNumber.replace(/\s/g, ""))) return "Bank account number must be 6-20 digits.";
  return "";
}

function isValidPassword(value: string) {
  return value.length >= 6 && value.length <= 30 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}

function getIdentityLabels(identityType: IdentityType) {
  if (identityType === "Passport") return { identityNo: "Passport No.", fullName: "Full Name (as per Passport)", date: "Date of Birth" };
  if (identityType === "SSM") return { identityNo: "SSM Registration No.", fullName: "Company Name (as per SSM)", date: "Date of Registration" };
  return { identityNo: "NRIC No.", fullName: "Full Name (as per NRIC)", date: "Date of Birth" };
}

function formatStatus(status: UserStatus) {
  return status === "ACTIVE" ? "Active" : "Inactive";
}

function formatMobile(code: string, number: string) {
  return [code, number].filter(Boolean).join(" ");
}
