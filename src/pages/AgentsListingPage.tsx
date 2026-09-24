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
  Network,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
  UserRound,
  X
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useDropzone } from "react-dropzone";
import { agentApi, type AgentKycDocumentType, type AgentListItem, type AgentPagination, type AgentProfile, type ManualRankingResult } from "../api/agentApi";
import { lookupApi, type BankLookupItem, type CountryLookupItem, type RankLookupItem } from "../api/lookupApi";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton";
import { PageHeader } from "../components/common/PageHeader";
import { Pagination } from "../components/common/Pagination";
import { TableActionMenu } from "../components/common/TableActionMenu";
import { DatePickerInput } from "../components/forms/DatePickerInput";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useAuth } from "../hooks/useAuth";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { notifyError, notifySuccess } from "../services/notificationService";
import type { UserStatus } from "../types";
import { isValidPasswordCriteria, passwordCriteriaMessage } from "../utils/passwordValidation";

type IdentityType = "NRIC" | "Passport" | "SSM";
type Ranking = string;
type KycStatus = "Pending Review" | "Verified" | "Rejected";

interface AgentRecord {
  id: string;
  userId: number;
  email: string;
  nickname: string;
  fullName: string;
  displayName: string;
  ranking: Ranking;
  rankValue?: number;
  identityType: IdentityType;
  identityId: string;
  introducer: string;
  introducerEmail: string;
  totalDownline: number;
  personalSales: number;
  createdAt: string;
  lastLogin: string;
  referralCode: string;
  trustReferralCode?: string;
  willReferralCode?: string;
  dateOfBirth: string;
  tinNumber: string;
  occupation: string | null;
  country: string;
  countryDomain: string;
  mobileCode: string;
  mobileNumber: string;
  address1: string;
  address2: string;
  city: string;
  postcode: string;
  state: string;
  bankName: string;
  bankNameDetail: string;
  bankAccountHolderName: string;
  bankAccountNumber: string;
  status: UserStatus;
  kycStatus: KycStatus;
  kycDocuments: KycDocument[];
  identityFrontPublicId?: string;
  identityBackPublicId?: string;
  passportPublicId?: string;
  ssmPublicId?: string;
}

interface KycDocument {
  title: string;
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
  uploadedInEdit?: boolean;
  publicId?: string;
}

interface AgentFilters {
  query: string;
  introducer: string;
  ranking: number | typeof allFilter;
}

const allFilter = "all";
const pageSizeOptions = [10, 20, 50, 100];
const fallbackRankOptions = [
  { value: 1, label: "Saving Trust Representative" },
  { value: 2, label: "Trust Representative" },
  { value: 3, label: "Trust Manager" },
  { value: 4, label: "Trust Director" },
  { value: 5, label: "Group Trust Director" },
  { value: 6, label: "Chief Trust Director" }
];
const identityTypes: IdentityType[] = ["NRIC", "Passport", "SSM"];
const statusOptions: UserStatus[] = ["ACTIVE", "INACTIVE"];
const fallbackCountries = [
  { value: "MY", label: "Malaysia" },
  { value: "SG", label: "Singapore" },
  { value: "ID", label: "Indonesia" },
  { value: "TH", label: "Thailand" },
  { value: "BN", label: "Brunei" },
  { value: "PH", label: "Philippines" }
];
const fallbackMobileCodes = [
  { country: "Malaysia", code: "+60" },
  { country: "Singapore", code: "+65" },
  { country: "Indonesia", code: "+62" },
  { country: "Thailand", code: "+66" },
  { country: "Brunei", code: "+673" },
  { country: "Philippines", code: "+63" }
];
const fallbackBankOptions = ["Maybank", "CIMB Bank", "Public Bank", "RHB Bank", "Hong Leong Bank", "AmBank", "Bank Islam", "OCBC Bank", "UOB Bank"];
const fallbackBankSelectOptions = fallbackBankOptions.map((bankName) => ({ value: bankName, label: bankName }));
const maxUploadSize = 5 * 1024 * 1024;
const acceptedKycDocumentExtensions = ".jpg,.jpeg,.png,.pdf";

export function AgentsListingPage() {
  const { session } = useAuth();
  const [records, setRecords] = useState<AgentRecord[]>([]);
  const [pagination, setPagination] = useState<AgentPagination>({ Page: 1, PageSize: 10, TotalRecords: 0, TotalPages: 1 });
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [draftFilters, setDraftFilters] = useState<AgentFilters>(createEmptyFilters());
  const [filters, setFilters] = useState<AgentFilters>(createEmptyFilters());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rankOptions, setRankOptions] = useState(fallbackRankOptions);
  const [bankOptions, setBankOptions] = useState(fallbackBankSelectOptions);
  const [countryOptions, setCountryOptions] = useState(fallbackCountries);
  const [mobileCodeOptions, setMobileCodeOptions] = useState(fallbackMobileCodes);
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [viewRecord, setViewRecord] = useState<AgentRecord | null>(null);
  const [editingProfileRecord, setEditingProfileRecord] = useState<AgentRecord | null>(null);
  const [editingIdentityRecord, setEditingIdentityRecord] = useState<AgentRecord | null>(null);
  const [editingBankRecord, setEditingBankRecord] = useState<AgentRecord | null>(null);
  const [editingRankRecord, setEditingRankRecord] = useState<AgentRecord | null>(null);
  const [passwordRecord, setPasswordRecord] = useState<AgentRecord | null>(null);
  const canEditRank = session?.role === "SA" || session?.role === "AD";

  useEffect(() => {
    if (!openActionId) return undefined;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-action-menu-root]")) return;
      setOpenActionId(null);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [openActionId]);

  useEffect(() => {
    let cancelled = false;

    async function loadLookups() {
      setLookupsLoading(true);
      try {
        const [ranks, banks, countries] = await Promise.all([lookupApi.getRankList(), lookupApi.getBankList(), lookupApi.getCountryList()]);
        if (cancelled) return;
        const mappedRanks = mapRankOptions(ranks);
        const mappedBanks = mapBankOptions(banks);
        const mappedCountries = mapCountryOptions(countries);
        const mappedMobileCodes = mapMobileCodeOptions(countries);
        setRankOptions(mappedRanks.length ? mappedRanks : fallbackRankOptions);
        setBankOptions(mappedBanks.length ? mappedBanks : fallbackBankSelectOptions);
        setCountryOptions(mappedCountries.length ? mappedCountries : fallbackCountries);
        setMobileCodeOptions(mappedMobileCodes.length ? mappedMobileCodes : fallbackMobileCodes);
      } catch (error) {
        if (cancelled) return;
        notifyError(getAgentErrorMessage(error, "Unable to load agent lookup data."), "agent-lookup-load");
      } finally {
        if (!cancelled) setLookupsLoading(false);
      }
    }

    loadLookups();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAgents() {
      setRecordsLoading(true);
      try {
        const result = await agentApi.getAgentList({
          page,
          pageSize,
          keyword: filters.query || undefined,
          introducerKeyword: filters.introducer || undefined,
          ranking: filters.ranking === allFilter ? undefined : filters.ranking
        });

        if (cancelled) return;
        setRecords(result.records.map(mapAgentListRecord));
        setPagination({
          Page: result.pagination.Page,
          PageSize: result.pagination.PageSize,
          TotalRecords: result.pagination.TotalRecords,
          TotalPages: Math.max(1, result.pagination.TotalPages)
        });
      } catch (error) {
        if (cancelled) return;
        setRecords([]);
        setPagination({ Page: page, PageSize: pageSize, TotalRecords: 0, TotalPages: 1 });
        notifyError(getAgentErrorMessage(error, "Unable to load agent list."), "agent-list-load");
      } finally {
        if (!cancelled) setRecordsLoading(false);
      }
    }

    loadAgents();

    return () => {
      cancelled = true;
    };
  }, [filters, page, pageSize, refreshKey]);

  const pageCount = Math.max(1, pagination.TotalPages);
  const pageRecords = records;

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
    setEditingProfileRecord(null);
    setEditingIdentityRecord(null);
    setEditingBankRecord(null);
    setEditingRankRecord(null);
    setViewRecord((current) => (current?.id === updated.id ? null : current));
    setRefreshKey((current) => current + 1);
    notifySuccess("Agent updated successfully.", "agent-update");
  };

  const createdBy = Number(session?.userId ?? 0);
  const canManageAgents = session?.role !== "AC";

  const loadProfileForAction = async (record: AgentRecord, action: (profile: AgentRecord) => void) => {
    try {
      const profile = await agentApi.getAdminAgentProfile(record.userId);
      action(mapAgentProfileRecord(record, profile));
    } catch (error) {
      notifyError(getAgentErrorMessage(error, "Unable to load agent profile."), "agent-profile-load");
    }
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
                onChange={(event) => setDraftFilters((current) => ({ ...current, ranking: event.target.value === allFilter ? allFilter : Number(event.target.value) }))}
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                <option value={allFilter}>{lookupsLoading ? "Loading ranks..." : "All Ranks"}</option>
                {rankOptions.map((ranking) => (
                  <option key={ranking.value} value={ranking.value}>
                    {ranking.label}
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
          <div className="text-sm font-semibold text-textSecondary">{pagination.TotalRecords} agents</div>
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

        {recordsLoading ? (
          <div className="p-4">
            <LoadingSkeleton />
          </div>
        ) : pageRecords.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No agents found" description="Adjust the filters and search again." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-soft text-xs uppercase tracking-wide text-textSecondary">
                <tr>
                  <TableHead>No.</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Identity</TableHead>
                  <TableHead>Introducer</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Action</TableHead>
                </tr>
              </thead>
              <tbody>
                {pageRecords.map((record, index) => {
                  return (
                  <tr key={record.id} className="transition hover:bg-gray-50">
                    <TableCell className="font-semibold text-textPrimary">{(page - 1) * pageSize + index + 1}</TableCell>
                    <TableCell className="min-w-72">
                      <div className="flex items-center gap-3">
                        <AgentAvatarCell record={record} />
                        <div className="min-w-0">
                          <div className="font-semibold text-textPrimary">{record.fullName}</div>
                          <div className="mt-0.5 text-xs text-textSecondary">{record.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RankingBadge ranking={record.ranking} />
                    </TableCell>
                    <TableCell className="min-w-44">
                      <div className="font-semibold text-textPrimary">{record.identityType}</div>
                      <div className="mt-0.5 text-xs text-textSecondary">{getIdentityDetail(record).value || "-"}</div>
                    </TableCell>
                    <TableCell className="min-w-56">
                      <div className="font-semibold text-textPrimary">{record.introducer}</div>
                      <div className="mt-0.5 text-xs text-textSecondary">{record.introducerEmail || "-"}</div>
                    </TableCell>
                    <TableCell className="min-w-40">
                      <div className="font-semibold text-textPrimary">{record.totalDownline.toLocaleString()} downlines</div>
                      <div className="mt-0.5 text-xs text-textSecondary">{formatCurrency(record.personalSales)} sales</div>
                    </TableCell>
                    <TableCell className="min-w-36">
                      <div>{record.lastLogin || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <TableActionMenu open={openActionId === record.id} onOpenChange={(open) => setOpenActionId(open ? record.id : null)} ariaLabel={`Actions for ${record.fullName}`}>
                        <ActionItem label="View" onClick={() => { loadProfileForAction(record, setViewRecord); setOpenActionId(null); }} />
                        {canManageAgents ? (
                          <>
                            <ActionItem label="Edit Profile" onClick={() => { loadProfileForAction(record, setEditingProfileRecord); setOpenActionId(null); }} />
                            <ActionItem label="Edit Identity" onClick={() => { loadProfileForAction(record, setEditingIdentityRecord); setOpenActionId(null); }} />
                            <ActionItem label="Edit Bank" onClick={() => { loadProfileForAction(record, setEditingBankRecord); setOpenActionId(null); }} />
                            {canEditRank ? <ActionItem label="Edit Rank" onClick={() => { loadProfileForAction(record, setEditingRankRecord); setOpenActionId(null); }} /> : null}
                            <ActionItem label="Change Password" onClick={() => { loadProfileForAction(record, setPasswordRecord); setOpenActionId(null); }} />
                          </>
                        ) : null}
                      </TableActionMenu>
                    </TableCell>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination currentPage={page} pageCount={pageCount} totalRecords={pagination.TotalRecords} pageSize={pageSize} itemLabel="agents" onPageChange={setPage} />
      </section>

      <AgentViewDrawer
        record={viewRecord}
        canManage={canManageAgents}
        canEditRank={canEditRank}
        onClose={() => setViewRecord(null)}
        onEdit={(record) => {
          setEditingProfileRecord(record);
        }}
        onEditIdentity={(record) => {
          setEditingIdentityRecord(record);
        }}
        onEditBank={(record) => {
          setEditingBankRecord(record);
        }}
        onEditRank={(record) => {
          setEditingRankRecord(record);
        }}
        onChangePassword={(record) => {
          setPasswordRecord(record);
        }}
      />
      <AgentProfileEditModal record={editingProfileRecord} createdBy={createdBy} countryOptions={countryOptions} mobileCodeOptions={mobileCodeOptions} onClose={() => setEditingProfileRecord(null)} onSubmit={saveAgent} />
      <AgentIdentityEditModal record={editingIdentityRecord} createdBy={createdBy} onClose={() => setEditingIdentityRecord(null)} onSubmit={saveAgent} />
      <AgentBankEditModal record={editingBankRecord} createdBy={createdBy} bankOptions={bankOptions} onClose={() => setEditingBankRecord(null)} onSubmit={saveAgent} />
      <AgentRankEditModal record={canEditRank ? editingRankRecord : null} rankOptions={rankOptions} onClose={() => setEditingRankRecord(null)} onSubmit={saveAgent} />
      <ChangePasswordModal
        record={passwordRecord}
        createdBy={createdBy}
        onClose={() => setPasswordRecord(null)}
        onSuccess={(record) => {
          setPasswordRecord(null);
          setViewRecord((current) => (current?.id === record.id ? null : current));
        }}
      />
    </>
  );
}

function AgentProfileEditModal({
  record,
  createdBy,
  countryOptions,
  mobileCodeOptions,
  onClose,
  onSubmit
}: {
  record: AgentRecord | null;
  createdBy: number;
  countryOptions: Array<{ value: string; label: string }>;
  mobileCodeOptions: Array<{ country: string; code: string }>;
  onClose: () => void;
  onSubmit: (record: AgentRecord) => void;
}) {
  const [draft, setDraft] = useState<AgentRecord | null>(record);
  const [mobileCodeOpen, setMobileCodeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDraft(record);
    setMobileCodeOpen(false);
  }, [record]);

  if (!draft) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateAgentProfile(draft);
    if (error) {
      notifyError(error, "agent-edit-validation");
      return;
    }
    if (!createdBy) {
      notifyError("Unable to identify the current user. Please sign in again.", "agent-profile-current-user");
      return;
    }

    setSubmitting(true);
    try {
      await agentApi.changeAgentProfile({
        UserID: draft.userId,
        Username: draft.email.trim(),
        Displayname: draft.nickname.trim(),
        CountryMobileCode: removeMobileCodePlus(draft.mobileCode),
        Mobile: draft.mobileNumber.trim(),
        Country_Domain: draft.countryDomain,
        Postcode: draft.postcode.trim(),
        State: draft.state.trim(),
        City: draft.city.trim(),
        Address_1: draft.address1.trim(),
        Address_2: draft.address2.trim(),
        LoginStatus: draft.status === "ACTIVE",
        CreatedBy: createdBy
      });
      onSubmit({
        ...draft,
        email: draft.email.trim(),
        nickname: draft.nickname.trim()
      });
    } catch (error) {
      notifyError(getAgentErrorMessage(error, "Unable to update agent profile."), "agent-profile-save");
    } finally {
      setSubmitting(false);
    }
  };

  const update = (patch: Partial<AgentRecord>) => setDraft((current) => (current ? { ...current, ...patch } : current));

  return (
    <Dialog open={Boolean(record)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update agent account, status, contact and address information.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
            <FormSection title="Account" icon={BriefcaseBusiness}>
              <TextField label="Email" type="email" value={draft.email} onChange={(value) => update({ email: value })} required />
              <TextField label="Nickname" value={draft.nickname} onChange={(value) => update({ nickname: value })} />
              <SelectField label="Status" value={draft.status} options={statusOptions} getLabel={(value) => (value === "ACTIVE" ? "Active" : "Inactive")} onChange={(value) => update({ status: value as UserStatus })} required />
            </FormSection>

            <FormSection title="Contact & Address" icon={MapPin}>
              <SelectField label="Country" value={draft.countryDomain} options={countryOptions.map((country) => country.value)} getLabel={(value) => countryOptions.find((country) => country.value === value)?.label ?? value} onChange={(value) => update({ countryDomain: value, country: countryOptions.find((country) => country.value === value)?.label ?? value })} required />
              <MobileField
                code={draft.mobileCode}
                number={draft.mobileNumber}
                mobileCodes={mobileCodeOptions}
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
          </div>

          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AgentIdentityEditModal({ record, createdBy, onClose, onSubmit }: { record: AgentRecord | null; createdBy: number; onClose: () => void; onSubmit: (record: AgentRecord) => void }) {
  const [draft, setDraft] = useState<AgentRecord | null>(record);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDocumentTitle, setUploadingDocumentTitle] = useState<string | null>(null);

  useEffect(() => {
    setDraft(record);
    setUploadingDocumentTitle(null);
  }, [record]);

  useEffect(() => {
    if (draft?.identityType === "SSM" && draft.occupation !== null) {
      setDraft((current) => (current ? { ...current, occupation: null } : current));
    }
  }, [draft?.identityType, draft?.occupation]);

  if (!draft) return null;

  const labels = getIdentityLabels(draft.identityType);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateAgentIdentity(draft);
    if (error) {
      notifyError(error, "agent-identity-validation");
      return;
    }
    if (!createdBy) {
      notifyError("Unable to identify the current user. Please sign in again.", "agent-identity-current-user");
      return;
    }
    if (uploadingDocumentTitle) {
      notifyError("Please wait for the KYC document upload to finish.", "agent-identity-upload-pending");
      return;
    }

    setSubmitting(true);
    try {
      await agentApi.changeAgentIdentity({
        UserID: draft.userId,
        Fullname: draft.fullName.trim(),
        DateOfBirth: draft.dateOfBirth,
        IdentityType: normalizeIdentityTypeForApi(draft.identityType),
        IdentityID: draft.identityId.trim(),
        TinNumber: draft.tinNumber.trim(),
        Occupation: draft.identityType === "SSM" ? null : draft.occupation?.trim() ?? "",
        IdentityFrontPublicID: draft.identityFrontPublicId,
        IdentityBackPublicID: draft.identityBackPublicId,
        PassportPublicID: draft.passportPublicId,
        SSMPublicID: draft.ssmPublicId,
        CreatedBy: createdBy
      });
      onSubmit({
        ...draft,
        fullName: draft.fullName.trim(),
        identityId: draft.identityId.trim(),
        tinNumber: draft.tinNumber.trim(),
        occupation: draft.identityType === "SSM" ? null : draft.occupation?.trim() ?? ""
      });
    } catch (error) {
      notifyError(getAgentErrorMessage(error, "Unable to update agent identity."), "agent-identity-save");
    } finally {
      setSubmitting(false);
    }
  };

  const update = (patch: Partial<AgentRecord>) => setDraft((current) => (current ? { ...current, ...patch } : current));
  const updateIdentityType = (identityType: IdentityType) => {
    update({
      identityType,
      occupation: identityType === "SSM" ? null : draft.occupation ?? "",
      kycDocuments: createKycDocuments(identityType),
      identityFrontPublicId: undefined,
      identityBackPublicId: undefined,
      passportPublicId: undefined,
      ssmPublicId: undefined
    });
  };

  const uploadKycDocument = async (file: File | undefined, document: KycDocument) => {
    if (!file) return;
    setUploadingDocumentTitle(document.title);
    try {
      const result = await handleKycUpload(file, document, draft, update);
      update(getKycPublicIdPatch(result.documentType, result.publicId));
    } catch {
      // handleKycUpload shows the user-facing validation/API error.
    } finally {
      setUploadingDocumentTitle(null);
    }
  };

  return (
    <Dialog open={Boolean(record)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Edit Identity</DialogTitle>
          <DialogDescription>Update identity details and KYC documents.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
            <FormSection title="Identity" icon={IdCard}>
              <SelectField label="Identity Type" value={draft.identityType} options={identityTypes} onChange={(value) => updateIdentityType(value as IdentityType)} required />
              <TextField label={labels.identityNo} value={draft.identityId} onChange={(value) => update({ identityId: value })} required />
              <TextField label={labels.fullName} value={draft.fullName} onChange={(value) => update({ fullName: value })} required />
              <TextField label={labels.date} type="date" value={draft.dateOfBirth} onChange={(value) => update({ dateOfBirth: value })} required />
              <TextField label="TIN Number" value={draft.tinNumber} onChange={(value) => update({ tinNumber: value })} required />
              {draft.identityType !== "SSM" ? <TextField label="Occupation" value={draft.occupation ?? ""} onChange={(value) => update({ occupation: value })} required /> : null}
            </FormSection>

            <FormSection title="KYC Information" icon={BadgeCheck}>
              <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
                {draft.kycDocuments.map((document) => (
                  <KycUploadCard
                    key={document.title}
                    document={document}
                    uploading={uploadingDocumentTitle === document.title}
                    onUpload={(file) => uploadKycDocument(file, document)}
                  />
                ))}
              </div>
            </FormSection>
          </div>

          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || Boolean(uploadingDocumentTitle)}>{submitting ? "Submitting..." : "Submit"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AgentBankEditModal({ record, createdBy, bankOptions, onClose, onSubmit }: { record: AgentRecord | null; createdBy: number; bankOptions: Array<{ value: string; label: string }>; onClose: () => void; onSubmit: (record: AgentRecord) => void }) {
  const [draft, setDraft] = useState<AgentRecord | null>(record);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDraft(record);
  }, [record]);

  if (!draft) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateAgentBank(draft);
    if (error) {
      notifyError(error, "agent-bank-validation");
      return;
    }
    if (!createdBy) {
      notifyError("Unable to identify the current user. Please sign in again.", "agent-bank-current-user");
      return;
    }

    setSubmitting(true);
    try {
      await agentApi.changeAgentBank({
        UserID: draft.userId,
        BankName: draft.bankName.trim(),
        AccountName: draft.bankAccountHolderName.trim(),
        AccountNumber: draft.bankAccountNumber.trim(),
        CreatedBy: createdBy
      });
      onSubmit({
        ...draft,
        bankName: draft.bankName.trim(),
        bankAccountHolderName: draft.bankAccountHolderName.trim(),
        bankAccountNumber: draft.bankAccountNumber.trim()
      });
    } catch (error) {
      notifyError(getAgentErrorMessage(error, "Unable to update agent bank information."), "agent-bank-save");
    } finally {
      setSubmitting(false);
    }
  };

  const update = (patch: Partial<AgentRecord>) => setDraft((current) => (current ? { ...current, ...patch } : current));

  return (
    <Dialog open={Boolean(record)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Bank</DialogTitle>
          <DialogDescription>Update agent bank account information.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <FormSection title="Bank Information" icon={Landmark}>
            <div className="md:col-span-2">
              <SelectField
                label="Bank Name"
                value={draft.bankName}
                options={bankOptions.map((bank) => bank.value)}
                getLabel={(value) => bankOptions.find((bank) => bank.value === value)?.label ?? value}
                onChange={(value) => update({ bankName: value, bankNameDetail: bankOptions.find((bank) => bank.value === value)?.label ?? value })}
                required
              />
            </div>
            <TextField label="Bank Account Holder Name" value={draft.bankAccountHolderName} onChange={(value) => update({ bankAccountHolderName: value })} required className="md:col-span-2" />
            <TextField label="Bank Account Number" value={draft.bankAccountNumber} onChange={(value) => update({ bankAccountNumber: value })} required className="md:col-span-2" />
          </FormSection>

          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AgentRankEditModal({ record, rankOptions, onClose, onSubmit }: { record: AgentRecord | null; rankOptions: Array<{ value: number; label: string }>; onClose: () => void; onSubmit: (record: AgentRecord) => void }) {
  const [draft, setDraft] = useState<AgentRecord | null>(record);
  const [previewRows, setPreviewRows] = useState<ManualRankingResult[]>([]);
  const [hasPreview, setHasPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDraft(record);
    setPreviewRows([]);
    setHasPreview(false);
    setSubmitting(false);
  }, [record]);

  if (!draft) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.rankValue) {
      notifyError("Ranking is required.", "agent-rank-validation");
      return;
    }

    if (!hasPreview) {
      setSubmitting(true);
      try {
        const result = await agentApi.previewManualRanking({
          MemberID: draft.userId,
          AdvanceRanking: draft.rankValue
        });
        setPreviewRows(result.AffectedAgents ?? []);
        setHasPreview(true);
        notifySuccess("Ranking preview generated successfully.", "agent-rank-preview");
      } catch (error) {
        notifyError(getAgentErrorMessage(error, "Unable to preview manual ranking."), "agent-rank-preview-error");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      await agentApi.updateManualRanking({
        MemberID: draft.userId,
        AdvanceRanking: draft.rankValue
      });
      onSubmit({
        ...draft,
        ranking: draft.ranking
      });
    } catch (error) {
      notifyError(getAgentErrorMessage(error, "Unable to update manual ranking."), "agent-rank-update-error");
    } finally {
      setSubmitting(false);
    }
  };

  const update = (patch: Partial<AgentRecord>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setPreviewRows([]);
    setHasPreview(false);
  };

  return (
    <Dialog open={Boolean(record)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Edit Rank</DialogTitle>
          <DialogDescription>Update agent ranking information.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
            <FormSection title="Rank Information" icon={BriefcaseBusiness}>
              <div className="md:col-span-2">
                <SelectField label="Ranking" value={String(draft.rankValue ?? "")} options={rankOptions.map((rank) => String(rank.value))} getLabel={(value) => rankOptions.find((rank) => String(rank.value) === value)?.label ?? value} onChange={(value) => update({ rankValue: Number(value), ranking: rankOptions.find((rank) => String(rank.value) === value)?.label ?? value })} required />
              </div>
            </FormSection>

            <ManualRankingPreviewTable rows={previewRows} />
          </div>

          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>{submitting ? (hasPreview ? "Submitting..." : "Previewing...") : hasPreview ? "Submit" : "Preview"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const manualRankingPreviewColumns: Array<{ key: keyof ManualRankingResult; label: string }> = [
  { key: "NetworkLevel", label: "Network Level" },
  { key: "Username", label: "Email" },
  { key: "Fullname", label: "Fullname" },
  { key: "PreviousEffectiveRankingName", label: "Prev Effective Rank" },
  { key: "NewAdvanceRankingName", label: "New Adv Rank" },
  { key: "PreviousAllowOverriding", label: "Prev OR" },
  { key: "NewAllowOverriding", label: "New OR" }
];

function ManualRankingPreviewTable({ rows }: { rows: ManualRankingResult[] }) {
  return (
    <section className="rounded-lg border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h3 className="text-sm font-semibold text-textPrimary">Ranking Preview</h3>
      </div>
      <div className="max-h-80 overflow-auto">
        <table className="w-full table-fixed text-left text-xs">
          <thead className="bg-soft text-[11px] uppercase tracking-wide text-textSecondary">
            <tr>
              {manualRankingPreviewColumns.map((column) => (
                <th key={column.key} className="sticky top-0 z-10 border-b border-line bg-soft px-2.5 py-2 font-semibold leading-4">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={`${row.MemberID}-${row.NetworkLevel}-${index}`} className="hover:bg-gray-50">
                  {manualRankingPreviewColumns.map((column) => (
                    <td key={column.key} className="break-words border-b border-line px-2.5 py-2 text-textSecondary">
                      {formatPreviewValue(row[column.key])}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={manualRankingPreviewColumns.length} className="border-b border-line px-3 py-6 text-center text-sm text-textSecondary">
                  No records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AgentViewDrawer({
  record,
  canManage,
  canEditRank,
  onClose,
  onEdit,
  onEditIdentity,
  onEditBank,
  onEditRank,
  onChangePassword
}: {
  record: AgentRecord | null;
  canManage: boolean;
  canEditRank: boolean;
  onClose: () => void;
  onEdit: (record: AgentRecord) => void;
  onEditIdentity: (record: AgentRecord) => void;
  onEditBank: (record: AgentRecord) => void;
  onEditRank: (record: AgentRecord) => void;
  onChangePassword: (record: AgentRecord) => void;
}) {
  useBodyScrollLock(Boolean(record));

  if (!record) return null;

  const identityDetail = getIdentityDetail(record);

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
            {canManage ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => onEdit(record)}>
                  Edit Profile
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => onEditIdentity(record)}>
                  Edit Identity
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => onEditBank(record)}>
                  Edit Bank
                </Button>
                {canEditRank ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => onEditRank(record)}>
                    Edit Rank
                  </Button>
                ) : null}
                <Button type="button" size="sm" variant="outline" onClick={() => onChangePassword(record)}>
                  Change Password
                </Button>
              </div>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-line p-2 text-textSecondary hover:bg-gray-50" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="border-b border-line bg-soft p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniStat label="Ranking" value={record.ranking} />
            <MiniStat label="Identity" value={`${record.identityType} ${record.identityId}`} />
            <ReferralCodeSummaryCard label="The Trust Referral Code" value={record.trustReferralCode ?? "-"} networkPath={record.trustReferralCode ? `/network/the-trust/${encodeURIComponent(record.email)}` : undefined} />
            <ReferralCodeSummaryCard label="The Will Referral Code" value={record.willReferralCode ?? "-"} networkPath={record.willReferralCode ? `/network/the-will/${encodeURIComponent(record.email)}` : undefined} />
          </div>
        </div>
        <div className="space-y-4 overflow-y-auto p-5">
          <DetailSection title="Introducer" icon={BriefcaseBusiness}>
            <CompactGrid>
              <DetailField label="Introducer" value={record.introducer} />
              <DetailField label="Introducer Email" value={record.introducerEmail} />
            </CompactGrid>
          </DetailSection>

          <DetailSection title="Profile" icon={UserRound}>
            <CompactGrid>
              <DetailField label="Email" value={record.email} />
              <DetailField label="Nickname" value={record.nickname} />
              <DetailField label="Mobile" value={formatMobile(record.mobileCode, record.mobileNumber)} />
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

          <DetailSection title="Bank" icon={Landmark}>
            <CompactGrid>
              <DetailField label="Bank Name" value={record.bankNameDetail || record.bankName} />
              <DetailField label="Bank Account Holder Name" value={record.bankAccountHolderName} />
              <DetailField label="Bank Account Number" value={record.bankAccountNumber} />
            </CompactGrid>
          </DetailSection>

          <DetailSection title="KYC Info" icon={BadgeCheck}>
            <div className="space-y-4">
              <CompactGrid>
                <DetailField label="Full Name" value={record.fullName} />
                <DetailField label="Identity Type" value={record.identityType} />
                <DetailField label={identityDetail.label} value={identityDetail.value} />
                <DetailField label={getIdentityLabels(record.identityType).date} value={record.dateOfBirth} />
                <DetailField label="TIN Number" value={record.tinNumber} />
                {record.identityType !== "SSM" ? <DetailField label="Occupation" value={record.occupation ?? ""} /> : null}
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

function ChangePasswordModal({ record, createdBy, onClose, onSuccess }: { record: AgentRecord | null; createdBy: number; onClose: () => void; onSuccess?: (record: AgentRecord) => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!record) {
      setNewPassword("");
      setConfirmPassword("");
      setSubmitting(false);
    }
  }, [record]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!record) return;
    if (!isValidPasswordCriteria(newPassword)) {
      notifyError(passwordCriteriaMessage, "agent-password-criteria");
      return;
    }
    if (newPassword !== confirmPassword) {
      notifyError("New login password and confirm new login password do not match.", "agent-password-mismatch");
      return;
    }

    if (!createdBy) {
      notifyError("Unable to identify the current user. Please sign in again.", "agent-password-current-user");
      return;
    }

    setSubmitting(true);
    try {
      await agentApi.changeAgentLoginPassword({
        UserID: record.userId,
        Password: newPassword,
        ConfirmPassword: confirmPassword,
        CreatedBy: createdBy
      });
      notifySuccess("Agent password changed successfully.", "agent-password-change");
      setNewPassword("");
      setConfirmPassword("");
      onSuccess?.(record);
    } catch (error) {
      notifyError(getAgentErrorMessage(error, "Unable to change agent password."), "agent-password-change-error");
    } finally {
      setSubmitting(false);
    }
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
              <span>{passwordCriteriaMessage}</span>
            </div>
            <PasswordField label="New Login Password" value={newPassword} onChange={setNewPassword} />
            <PasswordField label="Confirm New Login Password" value={confirmPassword} onChange={setConfirmPassword} />
          </div>
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit"}</Button>
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

function ReferralCodeSummaryCard({ label, value, networkPath }: { label: string; value: string; networkPath?: string }) {
  const openNetwork = () => {
    if (networkPath) {
      window.open(networkPath, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-textSecondary">{label}</div>
        <div className="mt-1 line-clamp-2 break-words text-sm font-semibold leading-5 text-textPrimary">{value || "-"}</div>
      </div>
      {networkPath ? (
        <button
          type="button"
          onClick={openNetwork}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink bg-ink text-white transition hover:bg-black"
          aria-label={`View ${label} network`}
          title={`View ${label} network`}
        >
          <Network className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function DocumentSummary({ document }: { document: KycDocument }) {
  const isImage = isImageDocument(document);

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="flex h-32 items-center justify-center overflow-hidden border-b border-line bg-soft">
        {isImage && document.fileUrl ? (
          <img src={document.fileUrl} alt={document.title} className="h-full w-full object-contain" />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-brandGold shadow-sm">
            {document.fileName ? <FileText className="h-6 w-6" /> : <IdCard className="h-6 w-6" />}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate px-3 pt-3 text-sm font-semibold text-textPrimary">{document.title}</div>
        <div className="px-3 pb-3 pt-0.5 text-xs text-textSecondary">{document.fileName ? `Uploaded ${document.uploadedAt ?? ""}` : "Not uploaded"}</div>
      </div>
    </div>
  );
}

function isImageDocument(document: KycDocument) {
  const fileUrl = document.fileUrl?.toLowerCase() ?? "";
  const fileName = document.fileName?.toLowerCase() ?? "";
  return fileUrl.startsWith("data:image/") || /\.(jpg|jpeg|png|gif|webp|bmp|svg)(?:$|\?)/.test(fileUrl) || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(fileName);
}

function StatusBadge({ status }: { status: UserStatus }) {
  const active = status === "ACTIVE";
  return <span className={active ? "rounded-full bg-green-50 px-3 py-1 text-green-700" : "rounded-full bg-red-50 px-3 py-1 text-red-700"}>{active ? "Active" : "Inactive"}</span>;
}

function AgentAvatarCell({ record }: { record: AgentRecord }) {
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white shadow-sm">{getAgentInitials(record.fullName)}</span>;
}

function KycUploadCard({ document, uploading, onUpload }: { document: KycDocument; uploading?: boolean; onUpload: (file: File | undefined) => Promise<void> | void }) {
  const isImage = isImageDocument(document);
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    multiple: false,
    noClick: true,
    noKeyboard: true,
    onDrop: (acceptedFiles) => {
      void onUpload(acceptedFiles[0]);
    }
  });

  return (
    <div
      {...getRootProps({
        className: isDragActive
          ? "w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-brandGold bg-[#FFF8E1] p-4 transition"
          : "w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-white p-4 transition hover:border-brandGold/60"
      })}
    >
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:gap-3">
        <div className="flex h-36 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-soft sm:h-20 sm:w-24 sm:rounded-md">
          {isImage && document.fileUrl ? <img src={document.fileUrl} alt={document.title} className="h-full w-full object-cover" /> : document.fileName ? <FileText className="h-9 w-9 text-brandGold" /> : <IdCard className="h-9 w-9 text-brandGold" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="break-words text-sm font-semibold text-textPrimary">{document.title}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-textSecondary">
            <span>{uploading ? "Uploading..." : document.fileName ? "Document uploaded" : "No document uploaded"}</span>
            {document.uploadedInEdit ? <Check className="h-4 w-4 shrink-0 rounded-full bg-green-600 p-0.5 text-white" /> : null}
          </div>
          <div className="mt-2 break-words text-xs font-medium leading-5 text-textSecondary">{isDragActive ? "Drop the document here" : "Drag and drop a JPG, JPEG, PNG or PDF file here"}</div>
          <button type="button" onClick={open} disabled={uploading} className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-textPrimary hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : document.fileName ? "Replace" : "Upload"}
          </button>
        </div>
        <input {...getInputProps({ accept: acceptedKycDocumentExtensions })} />
      </div>
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
  if (type === "date" && !readOnly) return <DatePickerInput label={label} value={value} onChange={onChange} required={required} className={className} />;

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
  mobileCodes,
  open,
  onToggle,
  onCodeChange,
  onNumberChange
}: {
  code: string;
  number: string;
  mobileCodes: Array<{ country: string; code: string }>;
  open: boolean;
  onToggle: () => void;
  onCodeChange: (code: string) => void;
  onNumberChange: (number: string) => void;
}) {
  const dropdownRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        onToggle();
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [onToggle, open]);

  return (
    <label className="block text-sm font-medium text-textPrimary">
      Mobile <span className="text-red-600">*</span>
      <span className="mt-1 grid grid-cols-[112px_1fr] gap-2">
        <span ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={onToggle}
            className="flex h-11 w-full items-center justify-between rounded-lg border border-line bg-white px-3 text-sm transition hover:bg-gray-50 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
          >
            {code}
            <ChevronDown className="h-4 w-4 text-textSecondary" />
          </button>
          {open ? (
            <span className="absolute left-0 top-12 z-30 max-h-72 w-56 overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-none">
              {mobileCodes.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => onCodeChange(item.code)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm shadow-none hover:bg-gray-50"
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
        <button type="button" onClick={() => setVisible((current) => !current)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-textSecondary shadow-none hover:bg-gray-100 hover:text-textPrimary" aria-label={visible ? "Hide password" : "Show password"}>
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
    <button type="button" onClick={onClick} className="block w-full rounded-md px-3 py-2 text-left text-sm text-textPrimary shadow-none hover:bg-gray-50">
      {label}
    </button>
  );
}

function RankingBadge({ ranking }: { ranking: Ranking }) {
  return <span className="inline-flex whitespace-nowrap rounded-lg bg-[#FFF8E1] px-3 py-1.5 text-xs font-semibold text-[#8A650F]">{ranking}</span>;
}

async function handleKycUpload(file: File | undefined, document: KycDocument, draft: AgentRecord, update: (patch: Partial<AgentRecord>) => void) {
  if (!file) {
    throw new Error("No file selected.");
  }

  const validType = file.type.startsWith("image/") || file.type === "application/pdf";
  if (!validType) {
    notifyError("Please upload an image or PDF file.", "agent-kyc-file-type");
    throw new Error("Invalid KYC file type.");
  }
  if (file.size > maxUploadSize) {
    notifyError("KYC file must not be more than 5MB.", "agent-kyc-file-size");
    throw new Error("Invalid KYC file size.");
  }

  const documentType = getKycDocumentType(document.title);
  try {
    const result = await agentApi.uploadAgentKycDocument({
      documentType,
      userId: draft.userId,
      file
    });

    update({
      kycDocuments: draft.kycDocuments.map((document) =>
        document.title === getKycDocumentTitle(documentType)
          ? {
              ...document,
              fileName: result.UploadedFile || file.name,
              fileUrl: result.FileUrl,
              publicId: result.PublicID,
              uploadedAt: new Date().toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" }),
              uploadedInEdit: true
            }
          : document
      )
    });

    notifySuccess(`${document.title} uploaded successfully.`, "agent-kyc-upload");
    return {
      documentType,
      publicId: result.PublicID
    };
  } catch (error) {
    notifyError(getAgentErrorMessage(error, "Unable to upload this KYC document. Please try again."), "agent-kyc-upload-error");
    throw error;
  }
}

function mapAgentListRecord(item: AgentListItem): AgentRecord {
  const identityType = normalizeIdentityType(item.IdentityType);
  return {
    id: String(item.UserID),
    userId: item.UserID,
    email: item.Email?.trim() || "-",
    nickname: item.Displayname?.trim() || "",
    fullName: item.Fullname?.trim() || "-",
    displayName: item.Displayname?.trim() || "",
    ranking: item.RankName?.trim() || (item.Ranking ? `Rank ${item.Ranking}` : "-"),
    rankValue: item.Ranking ?? undefined,
    identityType,
    identityId: item.IdentityID?.trim() || "",
    introducer: item.IntroducerName?.trim() || "-",
    introducerEmail: item.IntroducerEmail?.trim() || "",
    totalDownline: item.TotalDownline ?? 0,
    personalSales: item.PersonalSales ?? 0,
    createdAt: item.CreatedAt?.trim() || "",
    lastLogin: formatLastLoginDate(item.LastLogin),
    referralCode: "",
    dateOfBirth: "",
    tinNumber: "",
    occupation: "",
    country: "",
    countryDomain: "",
    mobileCode: "",
    mobileNumber: "",
    address1: "",
    address2: "",
    city: "",
    postcode: "",
    state: "",
    bankName: "",
    bankNameDetail: "",
    bankAccountHolderName: "",
    bankAccountNumber: "",
    status: "ACTIVE",
    kycStatus: "Pending Review",
    kycDocuments: createKycDocuments(identityType)
  };
}

function mapAgentProfileRecord(base: AgentRecord, profile: AgentProfile): AgentRecord {
  const identityType = normalizeIdentityType(profile.IdentityType ?? base.identityType);
  return {
    ...base,
    email: profile.Email?.trim() || base.email,
    nickname: profile.Displayname?.trim() || base.nickname,
    displayName: profile.Displayname?.trim() || base.displayName,
    fullName: profile.Fullname?.trim() || base.fullName,
    identityType,
    identityId: profile.IdentityID?.trim() || "",
    introducer: profile.Introducer?.Fullname?.trim() || base.introducer,
    introducerEmail: profile.Introducer?.Username?.trim() || base.introducerEmail,
    referralCode: profile.ReferralID?.trim() || base.referralCode,
    trustReferralCode: profile.ReferralCode?.TheTrust?.trim() || profile.ReferralID?.trim() || undefined,
    willReferralCode: profile.ReferralCode?.TheWill?.trim() || undefined,
    dateOfBirth: toDateOnlyValue(profile.DateOfBirth),
    tinNumber: profile.TinNumber?.trim() || "",
    occupation: identityType === "SSM" ? null : profile.Occupation?.trim() || "",
    country: profile.Country?.trim() || "",
    countryDomain: profile.Country_Domain?.trim() || "",
    mobileCode: formatMobileCode(profile.CountryMobileCode),
    mobileNumber: profile.Mobile?.trim() || "",
    address1: profile.Address_1?.trim() || "",
    address2: profile.Address_2?.trim() || "",
    city: profile.City?.trim() || "",
    postcode: profile.Postcode?.trim() || "",
    state: profile.State?.trim() || "",
    bankName: profile.BankName?.trim() || "",
    bankNameDetail: profile.BankNameDetail?.trim() || profile.BankName?.trim() || "",
    bankAccountHolderName: profile.AccountName?.trim() || "",
    bankAccountNumber: profile.AccountNumber?.trim() || "",
    kycDocuments: createKycDocumentsFromProfile(identityType, profile)
  };
}

function createKycDocumentsFromProfile(identityType: IdentityType, profile: AgentProfile): KycDocument[] {
  if (identityType === "NRIC") {
    return [
      createKycDocument("NRIC - Front", profile.IcFront?.FileUrl),
      createKycDocument("NRIC - Back", profile.IcBack?.FileUrl)
    ];
  }
  if (identityType === "Passport") return [createKycDocument("Passport - Information Page", profile.Passport?.FileUrl)];
  return [createKycDocument("SSM Registration Certificate", profile.SsmCertificate?.FileUrl)];
}

function createKycDocument(title: string, fileUrl?: string): KycDocument {
  return fileUrl ? { title, fileUrl, fileName: getFileNameFromUrl(fileUrl) } : { title };
}

function getFileNameFromUrl(fileUrl: string) {
  const cleanUrl = fileUrl.split("?")[0];
  return cleanUrl.split("/").pop() || "Uploaded document";
}

function mapRankOptions(ranks: RankLookupItem[]) {
  return ranks
    .filter((rank) => typeof rank.Ranking === "number")
    .map((rank) => ({
      value: rank.Ranking,
      label: rank.RankName?.trim() || rank.RankCode?.trim() || `Rank ${rank.Ranking}`
    }));
}

function mapBankOptions(banks: BankLookupItem[]) {
  return banks
    .map((bank) => ({
      value: bank.BankName?.trim(),
      label: bank.BankDescription?.trim() || bank.BankName?.trim()
    }))
    .filter((bank): bank is { value: string; label: string } => Boolean(bank.value && bank.label));
}

function mapCountryOptions(countries: CountryLookupItem[]) {
  return countries
    .map((country) => ({
      value: country.CountryDomain?.trim(),
      label: country.CountryName?.trim()
    }))
    .filter((country): country is { value: string; label: string } => Boolean(country.value && country.label));
}

function mapMobileCodeOptions(countries: CountryLookupItem[]) {
  const options = countries
    .map((country) => ({
      country: country.CountryName,
      code: formatMobileCode(country.CountryMobileCode)
    }))
    .filter((item) => item.code);

  return Array.from(new Map(options.map((item) => [`${item.country}-${item.code}`, item])).values());
}

function normalizeIdentityType(value: string | null | undefined): IdentityType {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "PASSPORT") return "Passport";
  if (normalized === "SSM") return "SSM";
  return "NRIC";
}

function normalizeIdentityTypeForApi(value: IdentityType) {
  return value === "Passport" ? "PASSPORT" : value;
}

function formatMobileCode(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value).trim();
  return text.startsWith("+") ? text : `+${text}`;
}

function removeMobileCodePlus(value: string) {
  return value.replace(/^\+/, "");
}

function getAgentErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function createKycDocuments(identityType: IdentityType, index = 0): KycDocument[] {
  const uploadedAt = new Date(2026, 8, 7 + (index % 10)).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
  const uploaded = index % 4 !== 1;
  const withFile = (title: string, fileName: string): KycDocument => (uploaded ? { title, fileName, uploadedAt } : { title });

  if (identityType === "NRIC") return [withFile("NRIC - Front", "nric-front.jpg"), withFile("NRIC - Back", "nric-back.jpg")];
  if (identityType === "Passport") return [withFile("Passport - Information Page", "passport.pdf")];
  return [withFile("SSM Registration Certificate", "ssm-certificate.pdf")];
}

function getKycDocumentType(title: string): AgentKycDocumentType {
  switch (title) {
    case "NRIC - Front":
      return "NRIC_FRONT";
    case "NRIC - Back":
      return "NRIC_BACK";
    case "Passport - Information Page":
      return "PASSPORT";
    case "SSM Registration Certificate":
      return "SSM_CERT";
    default:
      throw new Error("Invalid KYC document type.");
  }
}

function getKycDocumentTitle(documentType: AgentKycDocumentType) {
  switch (documentType) {
    case "NRIC_FRONT":
      return "NRIC - Front";
    case "NRIC_BACK":
      return "NRIC - Back";
    case "PASSPORT":
      return "Passport - Information Page";
    case "SSM_CERT":
      return "SSM Registration Certificate";
  }
}

function getKycPublicIdPatch(documentType: AgentKycDocumentType, publicId: string): Partial<AgentRecord> {
  switch (documentType) {
    case "NRIC_FRONT":
      return { identityFrontPublicId: publicId };
    case "NRIC_BACK":
      return { identityBackPublicId: publicId };
    case "PASSPORT":
      return { passportPublicId: publicId };
    case "SSM_CERT":
      return { ssmPublicId: publicId };
  }
}

function createEmptyFilters(): AgentFilters {
  return { query: "", introducer: "", ranking: allFilter };
}

function validateAgentProfile(agent: AgentRecord) {
  if (!agent.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agent.email.trim())) return "Enter a valid email address.";
  if (!agent.mobileNumber.trim()) return "Mobile number is required.";
  if (!agent.countryDomain.trim()) return "Country is required.";
  if (!agent.address1.trim()) return "Address line 1 is required.";
  if (!agent.address2.trim()) return "Address line 2 is required.";
  if (!agent.city.trim()) return "City is required.";
  if (!agent.postcode.trim()) return "Postcode is required.";
  if (!agent.state.trim()) return "State is required.";
  return "";
}

function validateAgentIdentity(agent: AgentRecord) {
  if (!agent.fullName.trim()) return "Full name is required.";
  if (!agent.identityId.trim()) return "Identity id is required.";
  if (!agent.dateOfBirth) return agent.identityType === "SSM" ? "Incorporation date is required." : "Date of birth is required.";
  if (agent.identityType !== "SSM" && !isAtLeast18(agent.dateOfBirth)) return "Agent must be at least 18 years old.";
  if (!agent.tinNumber.trim()) return "TIN number is required.";
  if (agent.identityType !== "SSM" && !agent.occupation?.trim()) return "Occupation is required.";
  return "";
}

function validateAgentBank(agent: AgentRecord) {
  if (!agent.bankName.trim()) return "Bank name is required.";
  if (!agent.bankAccountHolderName.trim()) return "Bank account holder name is required.";
  if (!/^\d{6,20}$/.test(agent.bankAccountNumber.replace(/\s/g, ""))) return "Bank account number must be 6-20 digits.";
  return "";
}

function isAtLeast18(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return false;
  const today = new Date();
  const eighteenthBirthday = new Date(date);
  eighteenthBirthday.setFullYear(eighteenthBirthday.getFullYear() + 18);
  return eighteenthBirthday <= today;
}

function toDateOnlyValue(value?: string | null) {
  if (!value) return "";
  return value.trim().match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? value.trim();
}

function getIdentityLabels(identityType: IdentityType) {
  if (identityType === "Passport") return { identityNo: "Passport No.", fullName: "Full Name (as per Passport)", date: "Date of Birth" };
  if (identityType === "SSM") return { identityNo: "SSM Registration No.", fullName: "Company Name (as per SSM)", date: "Incorporation Date" };
  return { identityNo: "NRIC No.", fullName: "Full Name (as per NRIC)", date: "Date of Birth" };
}

function getIdentityDetail(record: AgentRecord) {
  if (record.identityType === "SSM") return { label: "Incorporation Date", value: record.dateOfBirth };
  if (record.identityType === "Passport") return { label: "Passport No.", value: record.identityId };
  return { label: "Identity ID", value: record.identityId };
}

function formatStatus(status: UserStatus) {
  return status === "ACTIVE" ? "Active" : "Inactive";
}

function getAgentInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AG";
  return parts.map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2
  }).format(value);
}

function formatPreviewValue(value: ManualRankingResult[keyof ManualRankingResult]) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return <PreviewBooleanIcon value={value} />;
  if (typeof value === "number") return value.toLocaleString("en-MY");
  return value;
}

function PreviewBooleanIcon({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700" aria-label="Yes" title="Yes">
      <Check className="h-4 w-4" />
    </span>
  ) : (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-red-700" aria-label="No" title="No">
      <X className="h-4 w-4" />
    </span>
  );
}

function formatMobile(code: string, number: string) {
  return [code, number].filter(Boolean).join(" ");
}

function formatLastLoginDate(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return trimmed;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour24 = date.getHours();
  const hour12 = String(hour24 % 12 || 12).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const meridiem = hour24 >= 12 ? "PM" : "AM";

  return `${year}-${month}-${day} ${hour12}:${minute} ${meridiem}`;
}
