import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  FileText,
  History,
  IdCard,
  Landmark,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  QrCode,
  RotateCcw,
  Send,
  ShieldCheck,
  Upload,
  UserRound,
  UserCog,
  XCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useDropzone } from "react-dropzone";
import { Link } from "react-router-dom";
import { accountApi, type AccountKycDocumentType, type AccountProfileActivity, type AccountProfileData } from "../api/accountApi";
import { administratorApi } from "../api/administratorApi";
import { lookupApi, type BankLookupItem, type CountryLookupItem } from "../api/lookupApi";
import { serviceApi } from "../api/serviceApi";
import { PageHeader } from "../components/common/PageHeader";
import { UserAvatar } from "../components/common/UserAvatar";
import { OtpInput } from "../components/forms/OtpInput";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { roles } from "../config/roles";
import auditLogs from "../data/audit-logs.json";
import { useAuth } from "../hooks/useAuth";
import { usePermission } from "../hooks/usePermission";
import { listRecords } from "../services/dataService";
import { notifyError, notifySuccess } from "../services/notificationService";
import type { AuditLog, LocalSession, RoleId, UserStatus } from "../types";

type IdentityType = "NRIC" | "Passport" | "SSM";

interface StaffProfile {
  fullName: string;
  email: string;
  role: RoleId;
  status: UserStatus;
}

interface AgentProfile {
  referralCode?: string;
  referralName: string;
  introducerEmail: string;
  email: string;
  displayName: string;
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
  occupation: string | null;
  bankCode: string;
  bankName: string;
  bankAccountHolderName: string;
  bankAccountNumber: string;
  status: UserStatus;
  kycDocuments: KycDocument[];
  identityFrontPublicId?: string;
  identityBackPublicId?: string;
  passportPublicId?: string;
  ssmPublicId?: string;
}

interface VerificationDocument {
  title: string;
  imageUrl?: string;
}

interface KycDocument {
  title: string;
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
  uploadedInEdit?: boolean;
  publicId?: string;
}

const identityTypes: IdentityType[] = ["NRIC", "Passport", "SSM"];
const otpLength = 6;
const otpCooldownSeconds = 60;
const maxAvatarUploadSize = 10 * 1024 * 1024;
const maxKycUploadSize = 5 * 1024 * 1024;
const acceptedKycDocumentExtensions = ".jpg,.jpeg,.png,.pdf";

export function ProfilePage() {
  const { session, updateSessionProfile, updateSessionRedirects } = useAuth();
  const [accountProfile, setAccountProfile] = useState<AccountProfileData>();

  const loadProfile = useCallback(async () => {
    if (!session) return;
    await accountApi
      .getProfile()
      .then((profile) => {
        setAccountProfile(profile);
        syncSessionProfile(profile, session, updateSessionProfile);
      })
      .catch((error) => {
        notifyError(getErrorMessage(error, "Unable to load profile."), "profile-load-error");
      });
  }, [session, updateSessionProfile]);

  useEffect(() => {
    let active = true;

    if (session) {
      accountApi
        .getProfile()
        .then((profile) => {
          if (active) {
            setAccountProfile(profile);
            syncSessionProfile(profile, session, updateSessionProfile);
          }
        })
        .catch((error) => {
          if (active) notifyError(getErrorMessage(error, "Unable to load profile."), "profile-load-error");
        });
    }

    return () => {
      active = false;
    };
  }, [session, updateSessionProfile]);

  if (!session) return null;

  const isAgent = session.role === "AG";
  const displayName = accountProfile?.Fullname?.trim() || session.name;
  const displayEmail = accountProfile?.Email?.trim() || session.email;
  const redirectRecords = session.RedirectRecords ?? session.Redirects ?? session.redirects;
  const canChangeIdentity = isAgent && redirectRecords?.ChangeIdentity === true;

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
              <ProfilePhoto name={displayName} avatarUrl={accountProfile?.AvatarUrl ?? session.avatarUrl ?? session.AvatarUrl} onUploaded={loadProfile} />
              <div>
                <h2 className="text-xl font-semibold text-textPrimary">{displayName}</h2>
                <p className="mt-1 text-sm text-textSecondary">{displayEmail}</p>
              </div>
            </div>
            {isAgent ? (
              <ReferralQrCard referralCode={getProfileReferralId(accountProfile)} />
            ) : (
              <RoleAccessSummary role={session.role} loginTime={session.loginTime} />
            )}
          </div>
        </div>

        {isAgent ? (
          <AgentProfileContent
            profileData={accountProfile}
            sessionName={displayName}
            sessionEmail={displayEmail}
            loginTime={session.loginTime}
            sessionUserId={session.userId}
            canChangeIdentity={canChangeIdentity}
            onRefreshProfile={loadProfile}
            onIdentityChanged={async () => updateSessionRedirects({ ChangeIdentity: false })}
          />
        ) : (
          <StaffProfileContent
            profileData={accountProfile}
            sessionName={displayName}
            sessionEmail={displayEmail}
            role={session.role}
            onProfileChange={async (updatedProfile) => {
              setAccountProfile((current) => ({
                ...current,
                Fullname: updatedProfile.fullName,
                Email: updatedProfile.email
              }));
              await updateSessionProfile({
                name: updatedProfile.fullName,
                email: updatedProfile.email
              });
            }}
          />
        )}
      </section>
    </>
  );
}

function syncSessionProfile(
  profile: AccountProfileData,
  session: LocalSession,
  updateSessionProfile: (profile: Partial<Pick<LocalSession, "name" | "email" | "avatarUrl" | "AvatarUrl">>) => Promise<void>
) {
  const nextName = profile.Fullname?.trim() || session.name;
  const nextEmail = profile.Email?.trim() || session.email;
  const nextAvatarUrl = profile.AvatarUrl?.trim() || undefined;

  if (session.name === nextName && session.email === nextEmail && (session.avatarUrl ?? session.AvatarUrl) === nextAvatarUrl) return;

  void updateSessionProfile({
    name: nextName,
    email: nextEmail,
    avatarUrl: nextAvatarUrl,
    AvatarUrl: nextAvatarUrl
  });
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

function StaffProfileContent({
  profileData,
  sessionName,
  sessionEmail,
  role,
  onProfileChange
}: {
  profileData?: AccountProfileData;
  sessionName: string;
  sessionEmail: string;
  role: RoleId;
  onProfileChange: (profile: StaffProfile) => void | Promise<void>;
}) {
  const [profile, setProfile] = useState<StaffProfile>(() => mapStaffProfile(profileData, sessionName, sessionEmail, role));
  const [draft, setDraft] = useState(profile);
  const [open, setOpen] = useState(false);
  const canEdit = role === "SA" || role === "AD" || role === "OP" || role === "AC";
  const activityRecords = useMemo(() => mapProfileActivities(profileData?.Activities), [profileData?.Activities]);

  useEffect(() => {
    if (open) return;
    const mappedProfile = mapStaffProfile(profileData, sessionName, sessionEmail, role);
    setProfile(mappedProfile);
    setDraft(mappedProfile);
  }, [profileData, role, sessionEmail, sessionName]);

  const save = async () => {
    if (!draft.fullName.trim()) {
      notifyError("Full name is required.", "staff-profile-name");
      return;
    }
    if (!isValidEmail(draft.email)) {
      notifyError("Enter a valid email address.", "staff-profile-email");
      return;
    }

    const updatedProfile = { ...draft, fullName: draft.fullName.trim().toUpperCase(), email: draft.email.trim() };

    try {
      await administratorApi.changeProfile({
        Username: updatedProfile.email,
        Fullname: updatedProfile.fullName
      });
      setProfile(updatedProfile);
      setDraft(updatedProfile);
      await onProfileChange(updatedProfile);
      setOpen(false);
      notifySuccess("Profile updated successfully.", "staff-profile-success");
    } catch (error) {
      notifyError(getErrorMessage(error, "Unable to update profile."), "staff-profile-error");
    }
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

      <ProfileActivityPanel activities={activityRecords} userName={profile.fullName} status={profile.status} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update the internal user profile details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 rounded-lg border border-line bg-white p-4">
            <TextInput label="Email" type="email" value={draft.email} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} />
            <TextInput label="Full Name" value={draft.fullName} onChange={(value) => setDraft((current) => ({ ...current, fullName: value }))} uppercase />
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

function AgentProfileContent({
  profileData,
  sessionName,
  sessionEmail,
  loginTime,
  sessionUserId,
  canChangeIdentity,
  onRefreshProfile,
  onIdentityChanged
}: {
  profileData?: AccountProfileData;
  sessionName: string;
  sessionEmail: string;
  loginTime: string;
  sessionUserId: string;
  canChangeIdentity: boolean;
  onRefreshProfile: () => Promise<void>;
  onIdentityChanged: () => Promise<void>;
}) {
  const [profile, setProfile] = useState<AgentProfile>(() => mapAgentProfile(profileData, sessionName, sessionEmail));
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [accountDraft, setAccountDraft] = useState({ displayName: profile.displayName });
  const [emailDraft, setEmailDraft] = useState({ email: profile.email, otp: "" });
  const [bankDraft, setBankDraft] = useState({ bankCode: profile.bankCode, bankName: profile.bankName, bankAccountHolderName: profile.bankAccountHolderName, bankAccountNumber: profile.bankAccountNumber });
  const [contactDraft, setContactDraft] = useState({ mobileCode: profile.mobileCode, mobileNumber: profile.mobileNumber });
  const [identityDraft, setIdentityDraft] = useState(profile);
  const [identityDraftDocuments, setIdentityDraftDocuments] = useState<Record<IdentityType, KycDocument[]>>(() => createKycDocumentMap(profileData));
  const [accountSaving, setAccountSaving] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [identitySaving, setIdentitySaving] = useState(false);
  const [uploadingDocumentTitle, setUploadingDocumentTitle] = useState<string | null>(null);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpSentEmail, setOtpSentEmail] = useState("");
  const [otpSecondsRemaining, setOtpSecondsRemaining] = useState(0);
  const [bankOptions, setBankOptions] = useState<BankLookupItem[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [mobileCodeOptions, setMobileCodeOptions] = useState<Array<{ country: string; code: string }>>([]);
  const [mobileCodeOpen, setMobileCodeOpen] = useState(false);
  const [countryLookupLoading, setCountryLookupLoading] = useState(false);
  const mobileCodeRef = useRef<HTMLSpanElement>(null);
  const labels = useMemo(() => getIdentityLabels(profile.identityType), [profile.identityType]);
  const activityRecords = useMemo(() => mapProfileActivities(profileData?.Activities), [profileData?.Activities]);

  useEffect(() => {
    const mappedProfile = mapAgentProfile(profileData, sessionName, sessionEmail);
    setProfile(mappedProfile);
    if (!accountModalOpen) setAccountDraft({ displayName: mappedProfile.displayName });
    if (!emailModalOpen) setEmailDraft({ email: mappedProfile.email, otp: "" });
    if (!contactModalOpen) setContactDraft({ mobileCode: mappedProfile.mobileCode, mobileNumber: mappedProfile.mobileNumber });
    if (!identityModalOpen) {
      setIdentityDraft(mappedProfile);
      setIdentityDraftDocuments(createKycDocumentMap(profileData));
    }
    if (!bankModalOpen) {
      setBankDraft({
        bankCode: mappedProfile.bankCode,
        bankName: mappedProfile.bankName,
        bankAccountHolderName: mappedProfile.bankAccountHolderName,
        bankAccountNumber: mappedProfile.bankAccountNumber
      });
    }
  }, [accountModalOpen, bankModalOpen, contactModalOpen, emailModalOpen, identityModalOpen, profileData, sessionEmail, sessionName]);

  useEffect(() => {
    if (otpSecondsRemaining <= 0) return undefined;
    const timer = window.setInterval(() => {
      setOtpSecondsRemaining((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpSecondsRemaining]);

  useEffect(() => {
    if (!otpSentEmail) return undefined;
    const timer = window.setTimeout(() => setOtpSentEmail(""), 5000);
    return () => window.clearTimeout(timer);
  }, [otpSentEmail]);

  useEffect(() => {
    if (!bankModalOpen || bankOptions.length > 0 || bankLoading) return;
    setBankLoading(true);
    lookupApi
      .getBankList()
      .then(setBankOptions)
      .catch((error) => notifyError(getErrorMessage(error, "Unable to load bank list."), "profile-bank-list-error"))
      .finally(() => setBankLoading(false));
  }, [bankLoading, bankModalOpen, bankOptions.length]);

  useEffect(() => {
    if (!contactModalOpen || mobileCodeOptions.length > 0 || countryLookupLoading) return;
    setCountryLookupLoading(true);
    lookupApi
      .getCountryList()
      .then((countries) => {
        const options = mapMobileCodeOptions(countries);
        setMobileCodeOptions(options);
        setContactDraft((current) => ({
          ...current,
          mobileCode: current.mobileCode || getDefaultMobileCode(options)
        }));
      })
      .catch((error) => notifyError(getErrorMessage(error, "Unable to load country mobile codes."), "profile-country-list-error"))
      .finally(() => setCountryLookupLoading(false));
  }, [contactModalOpen, countryLookupLoading, mobileCodeOptions.length]);

  useEffect(() => {
    if (!mobileCodeOpen) return undefined;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!mobileCodeRef.current?.contains(event.target as Node)) {
        setMobileCodeOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [mobileCodeOpen]);

  const openAccountModal = () => {
    setAccountDraft({ displayName: profile.displayName });
    setAccountModalOpen(true);
  };

  const openEmailModal = () => {
    setEmailDraft({ email: "", otp: "" });
    setOtpRequested(false);
    setOtpSending(false);
    setOtpSentEmail("");
    setOtpSecondsRemaining(0);
    setEmailModalOpen(true);
  };

  const openBankModal = () => {
    setBankDraft({
      bankCode: profile.bankCode,
      bankName: profile.bankName,
      bankAccountHolderName: profile.bankAccountHolderName,
      bankAccountNumber: profile.bankAccountNumber
    });
    setBankModalOpen(true);
  };

  const openContactModal = () => {
    setContactDraft({ mobileCode: profile.mobileCode, mobileNumber: profile.mobileNumber });
    setMobileCodeOpen(false);
    setContactModalOpen(true);
  };

  const openIdentityModal = () => {
    setIdentityDraft(profile);
    setIdentityDraftDocuments(createKycDocumentMap(profileData));
    setUploadingDocumentTitle(null);
    setIdentityModalOpen(true);
  };

  const requestEmailOtp = async () => {
    if (!isValidEmail(emailDraft.email)) {
      notifyError("Enter a valid email address before requesting OTP.", "profile-email-otp-validation");
      return;
    }

    setOtpSending(true);
    try {
      const userId = Number(sessionUserId);
      if (!Number.isFinite(userId) || userId <= 0) {
        throw new Error("User session is missing.");
      }

      await serviceApi.sendChangeEmailOtp(emailDraft.email.trim(), userId);
      setOtpRequested(true);
      setOtpSentEmail(emailDraft.email.trim());
      setOtpSecondsRemaining(otpCooldownSeconds);
      notifySuccess(`Verification code sent to ${emailDraft.email.trim()}.`, "profile-email-otp-success");
    } catch (error) {
      notifyError(getErrorMessage(error, "Unable to send verification code."), "profile-email-otp-error");
    } finally {
      setOtpSending(false);
    }
  };

  const submitAccountInformation = async () => {
    if (!accountDraft.displayName.trim()) {
      notifyError("Nickname is required.", "profile-account-nickname-validation");
      return;
    }

    setAccountSaving(true);
    try {
      await accountApi.changeProfile({ Displayname: accountDraft.displayName.trim() });
      notifySuccess("Your account nickname has been updated.", "profile-account-update-success");
      setAccountModalOpen(false);
      await onRefreshProfile();
    } catch (error) {
      notifyError(getErrorMessage(error, "Unable to update account information."), "profile-account-update-error");
    } finally {
      setAccountSaving(false);
    }
  };

  const submitEmailChange = async () => {
    if (!isValidEmail(emailDraft.email)) {
      notifyError("Enter a valid email address.", "profile-email-validation");
      return;
    }
    if (!/^\d{6}$/.test(emailDraft.otp.trim())) {
      notifyError("Email OTP must be 6 digits.", "profile-email-otp-validation");
      return;
    }

    setEmailSaving(true);
    try {
      await accountApi.changeEmail({
        Username: emailDraft.email.trim(),
        OTP: emailDraft.otp.trim()
      });
      notifySuccess("Email address changed successfully.", "profile-email-update-success");
      setEmailModalOpen(false);
      await onRefreshProfile();
    } catch (error) {
      notifyError(getErrorMessage(error, "Unable to change email address."), "profile-email-update-error");
    } finally {
      setEmailSaving(false);
    }
  };

  const submitBankInformation = async () => {
    if (!bankDraft.bankCode.trim()) {
      notifyError("Bank name is required.", "profile-bank-name-validation");
      return;
    }
    if (!bankDraft.bankAccountHolderName.trim()) {
      notifyError("Bank account holder name is required.", "profile-bank-holder-validation");
      return;
    }
    if (!/^\d{6,20}$/.test(bankDraft.bankAccountNumber.replace(/\s/g, ""))) {
      notifyError("Bank account number must be 6-20 digits.", "profile-bank-account-validation");
      return;
    }

    setBankSaving(true);
    try {
      await accountApi.changeBank({
        BankName: bankDraft.bankCode.trim(),
        AccountName: bankDraft.bankAccountHolderName.trim(),
        AccountNumber: bankDraft.bankAccountNumber.replace(/\s/g, "")
      });
      notifySuccess("Bank information updated successfully.", "profile-bank-update-success");
      setBankModalOpen(false);
      await onRefreshProfile();
    } catch (error) {
      notifyError(getErrorMessage(error, "Unable to update bank information."), "profile-bank-update-error");
    } finally {
      setBankSaving(false);
    }
  };

  const submitContactInformation = async () => {
    const mobileCode = normalizeMobileCode(contactDraft.mobileCode);
    const mobileNumber = contactDraft.mobileNumber.replace(/\D/g, "");

    if (!mobileCode) {
      notifyError("Country mobile code is required.", "profile-contact-code-validation");
      return;
    }
    if (!mobileNumber) {
      notifyError("Mobile number is required.", "profile-contact-mobile-validation");
      return;
    }

    setContactSaving(true);
    try {
      await accountApi.changeContact({
        CountryMobileCode: mobileCode,
        Mobile: mobileNumber
      });
      notifySuccess("Contact information updated successfully.", "profile-contact-update-success");
      setContactModalOpen(false);
      await onRefreshProfile();
    } catch (error) {
      notifyError(getErrorMessage(error, "Unable to update contact information."), "profile-contact-update-error");
    } finally {
      setContactSaving(false);
    }
  };

  const updateIdentityDraft = (patch: Partial<AgentProfile>) => setIdentityDraft((current) => ({ ...current, ...patch }));

  const updateIdentityType = (identityType: IdentityType) => {
    updateIdentityDraft({
      identityType,
      occupation: identityType === "SSM" ? null : identityDraft.occupation ?? "",
      kycDocuments: identityDraftDocuments[identityType],
      identityFrontPublicId: undefined,
      identityBackPublicId: undefined,
      passportPublicId: undefined,
      ssmPublicId: undefined
    });
  };

  const uploadKycDocument = async (file: File | undefined, document: KycDocument) => {
    if (!file) return;
    if (!isValidKycUpload(file)) return;

    const documentType = getKycDocumentType(document.title);
    setUploadingDocumentTitle(document.title);
    try {
      const result = await accountApi.uploadKycDocument(documentType, file);
      const nextDocuments = identityDraft.kycDocuments.map((item) =>
        item.title === getKycDocumentTitle(documentType)
          ? {
              ...item,
              fileName: result.UploadedFile || file.name,
              fileUrl: result.FileUrl,
              publicId: result.PublicID,
              uploadedAt: new Date().toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" }),
              uploadedInEdit: true
            }
          : item
      );
      setIdentityDraftDocuments((current) => ({
        ...current,
        [identityDraft.identityType]: nextDocuments
      }));
      updateIdentityDraft({
        ...getKycPublicIdPatch(documentType, result.PublicID),
        kycDocuments: nextDocuments
      });
      notifySuccess(`${document.title} uploaded successfully.`, "profile-identity-kyc-upload");
    } catch (error) {
      notifyError(getErrorMessage(error, "Unable to upload this KYC document. Please try again."), "profile-identity-kyc-upload-error");
    } finally {
      setUploadingDocumentTitle(null);
    }
  };

  const submitIdentityInformation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const error = validateAgentIdentity(identityDraft);
    if (error) {
      notifyError(error, "profile-identity-validation");
      return;
    }
    if (uploadingDocumentTitle) {
      notifyError("Please wait for the KYC document upload to finish.", "profile-identity-upload-pending");
      return;
    }

    setIdentitySaving(true);
    try {
      await accountApi.changeIdentity({
        Fullname: identityDraft.fullName.trim(),
        DateOfBirth: identityDraft.dateOfBirth,
        IdentityType: normalizeIdentityTypeForApi(identityDraft.identityType),
        IdentityID: identityDraft.identityNo.trim(),
        TinNumber: identityDraft.tinNumber.trim(),
        Occupation: identityDraft.identityType === "SSM" ? null : identityDraft.occupation?.trim() ?? "",
        IdentityFrontPublicID: identityDraft.identityFrontPublicId,
        IdentityBackPublicID: identityDraft.identityBackPublicId,
        PassportPublicID: identityDraft.passportPublicId,
        SSMPublicID: identityDraft.ssmPublicId
      });
      notifySuccess("Identity information updated successfully.", "profile-identity-update-success");
      setIdentityModalOpen(false);
      await onRefreshProfile();
      await onIdentityChanged();
    } catch (error) {
      notifyError(getErrorMessage(error, "Unable to update identity information."), "profile-identity-update-error");
    } finally {
      setIdentitySaving(false);
    }
  };

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <ProfileSection title="Introducer Information" icon={BriefcaseBusiness}>
          <ProfileField label="Introducer Name" value={profile.referralName} />
          <ProfileField label="Introducer Email" value={profile.introducerEmail} />
        </ProfileSection>

        <ProfileSection
          title="Account Information"
          icon={UserCog}
          action={
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={openAccountModal}>
                <Pencil className="h-4 w-4" />
                Edit Account
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={openEmailModal}>
                Change Email
              </Button>
            </div>
          }
        >
          <ProfileField label="Nickname" value={profile.displayName} />
          <ProfileField label="Email" value={profile.email} />
          <ProfileField label="Login Password" value="Managed from Change Password" />
        </ProfileSection>

        <ProfileSection
          title="Bank Information"
          icon={Landmark}
          action={
            <Button type="button" variant="outline" size="sm" onClick={openBankModal}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          }
        >
          <ProfileField label="Bank Name" value={profile.bankName} />
          <ProfileField label="Bank Account Holder Name" value={profile.bankAccountHolderName} />
          <ProfileField label="Bank Account Number" value={profile.bankAccountNumber} />
        </ProfileSection>

        <ProfileSection
          title="Identity"
          icon={IdCard}
          action={
            canChangeIdentity ? (
              <Button type="button" variant="outline" size="sm" onClick={openIdentityModal}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            ) : null
          }
        >
          <ProfileField label="Identity Type" value={profile.identityType} />
          <ProfileField label={labels.identityNo} value={profile.identityNo} />
          <ProfileField label={labels.fullName} value={profile.fullName} />
          <ProfileField label={labels.date} value={profile.dateOfBirth} />
          <ProfileField label="TIN Number" value={profile.tinNumber} />
          {profile.identityType !== "SSM" ? <ProfileField label="Occupation" value={profile.occupation ?? ""} /> : null}
        </ProfileSection>

        <ProfileSection
          title="Contact & Address"
          icon={MapPin}
          action={
            <Button type="button" variant="outline" size="sm" onClick={openContactModal}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          }
        >
          <ProfileField label="Country" value={profile.country} />
          <ProfileField label="Mobile" value={formatMobile(profile.mobileCode, profile.mobileNumber)} />
          <ProfileField label="Postcode" value={profile.postcode} />
          <ProfileField label="State" value={profile.state} />
          <ProfileField label="City" value={profile.city} />
          <ProfileField label="Address" value={formatAddress(profile.address1, profile.address2)} />
        </ProfileSection>

        <IdentityVerificationSection
          identityType={profile.identityType}
          profileData={profileData}
          action={
            canChangeIdentity ? (
              <Button type="button" variant="outline" size="sm" onClick={openIdentityModal}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            ) : null
          }
        />
      </div>

      <div className="space-y-5">
        <AgentAccessPanel loginTime={loginTime} />
        <ProfileActivityPanel activities={activityRecords} userName={profile.fullName} status={profile.status} />
      </div>

      <Dialog open={accountModalOpen} onOpenChange={setAccountModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account Information</DialogTitle>
            <DialogDescription>Enter the name you would like people to see on your profile.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 rounded-lg border border-line bg-white p-4">
            <TextInput label="Nickname" value={accountDraft.displayName} onChange={(value) => setAccountDraft({ displayName: value })} uppercase />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAccountModalOpen(false)} disabled={accountSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={submitAccountInformation} disabled={accountSaving}>
              {accountSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {accountSaving ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email Address</DialogTitle>
            <DialogDescription>Verify the new email address with a one-time password.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 rounded-lg border border-line bg-white p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <TextInput label="New Email Address" type="email" value={emailDraft.email} onChange={(value) => setEmailDraft((current) => ({ ...current, email: value }))} />
              <button
                type="button"
                onClick={requestEmailOtp}
                disabled={otpSending || emailSaving || otpSecondsRemaining > 0}
                className="inline-flex h-11 min-w-40 items-center justify-center gap-2 rounded-lg border border-brandGold bg-brandGold px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-[#B89222] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {otpSending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {otpSending ? "Sending..." : otpSecondsRemaining > 0 ? `Resend in ${otpSecondsRemaining}s` : otpRequested ? "Resend Code" : "Send Code"}
              </button>
            </div>
            {otpSentEmail ? <div className="text-sm font-medium text-green-700">Verification code sent to {otpSentEmail}</div> : null}
            <OtpInput label="Email Verification Code" value={emailDraft.otp} onChange={(value) => setEmailDraft((current) => ({ ...current, otp: value.replace(/\D/g, "").slice(0, otpLength) }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEmailModalOpen(false)} disabled={emailSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={submitEmailChange} disabled={emailSaving}>
              {emailSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {emailSaving ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bankModalOpen} onOpenChange={setBankModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bank Information</DialogTitle>
            <DialogDescription>Update the bank account used for your agent profile.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 rounded-lg border border-line bg-white p-4">
            <label className="block text-sm font-medium">
              Bank Name <span className="text-red-600">*</span>
              <select
                value={bankDraft.bankCode}
                onChange={(event) => {
                  const bank = bankOptions.find((item) => item.BankName === event.target.value);
                  setBankDraft((current) => ({
                    ...current,
                    bankCode: event.target.value,
                    bankName: bank?.BankDescription || bank?.BankName || ""
                  }));
                }}
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                <option value="">{bankLoading ? "Loading bank list..." : "Select bank"}</option>
                {bankOptions.map((bank) => (
                  <option key={bank.id} value={bank.BankName}>
                    {bank.BankDescription || bank.BankName}
                  </option>
                ))}
              </select>
            </label>
            <TextInput label="Bank Account Holder Name" value={bankDraft.bankAccountHolderName} onChange={(value) => setBankDraft((current) => ({ ...current, bankAccountHolderName: value }))} uppercase />
            <TextInput label="Bank Account Number" value={bankDraft.bankAccountNumber} onChange={(value) => setBankDraft((current) => ({ ...current, bankAccountNumber: value.replace(/\D/g, "").slice(0, 20) }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBankModalOpen(false)} disabled={bankSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={submitBankInformation} disabled={bankSaving}>
              {bankSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {bankSaving ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update the mobile number used for your agent profile.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 rounded-lg border border-line bg-white p-4">
            <div className="block text-sm font-medium">
              <div>
                Mobile <span className="text-red-600">*</span>
              </div>
              <span className="mt-1 grid grid-cols-[112px_1fr] gap-2">
                <span ref={mobileCodeRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setMobileCodeOpen((open) => !open)}
                    disabled={countryLookupLoading || contactSaving}
                    className="flex h-11 w-full items-center justify-between rounded-lg border border-line bg-white px-3 text-sm transition hover:bg-gray-50 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {countryLookupLoading ? "..." : contactDraft.mobileCode || "+60"}
                    <ChevronDown className="h-4 w-4 text-textSecondary" />
                  </button>
                  {mobileCodeOpen ? (
                    <span className="mt-2 block max-h-64 w-80 max-w-[calc(100vw-5rem)] overflow-y-auto rounded-lg border border-line bg-white py-1">
                      {mobileCodeOptions.map((item) => (
                        <button
                          key={`${item.country}-${item.code}`}
                          type="button"
                          onClick={() => {
                            setContactDraft((current) => ({ ...current, mobileCode: item.code }));
                            setMobileCodeOpen(false);
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm shadow-none hover:bg-gray-50"
                        >
                          {item.country} ({item.code})
                          {contactDraft.mobileCode === item.code ? <Check className="h-4 w-4 text-brandGold" /> : null}
                        </button>
                      ))}
                    </span>
                  ) : null}
                </span>
                <input
                  type="tel"
                  value={contactDraft.mobileNumber}
                  onChange={(event) => setContactDraft((current) => ({ ...current, mobileNumber: event.target.value.replace(/\D/g, "") }))}
                  disabled={contactSaving}
                  className="h-11 min-w-0 rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink disabled:cursor-not-allowed disabled:opacity-60"
                />
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setContactModalOpen(false)} disabled={contactSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={submitContactInformation} disabled={contactSaving}>
              {contactSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {contactSaving ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={identityModalOpen} onOpenChange={(open) => !identitySaving && !uploadingDocumentTitle && setIdentityModalOpen(open)}>
        <DialogContent className="grid-rows-[auto_minmax(0,1fr)] max-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit Identity</DialogTitle>
            <DialogDescription>Update your identity details and KYC documents.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitIdentityInformation} className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
              <ProfileFormSection title="Identity" icon={IdCard}>
                <SelectInput label="Identity Type" value={identityDraft.identityType} options={identityTypes} onChange={(value) => updateIdentityType(value as IdentityType)} required />
                <TextInput label={getIdentityLabels(identityDraft.identityType).identityNo} value={identityDraft.identityNo} onChange={(value) => updateIdentityDraft({ identityNo: value })} />
                <TextInput label={getIdentityLabels(identityDraft.identityType).fullName} value={identityDraft.fullName} onChange={(value) => updateIdentityDraft({ fullName: value })} uppercase />
                <TextInput label={getIdentityLabels(identityDraft.identityType).date} type="date" value={identityDraft.dateOfBirth} onChange={(value) => updateIdentityDraft({ dateOfBirth: value })} />
                <TextInput label="TIN Number" value={identityDraft.tinNumber} onChange={(value) => updateIdentityDraft({ tinNumber: value })} uppercase />
                {identityDraft.identityType !== "SSM" ? <TextInput label="Occupation" value={identityDraft.occupation ?? ""} onChange={(value) => updateIdentityDraft({ occupation: value })} /> : null}
              </ProfileFormSection>

              <ProfileFormSection title="KYC Information" icon={BadgeCheck}>
                <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
                  {identityDraft.kycDocuments.map((document) => (
                    <KycUploadCard
                      key={document.title}
                      document={document}
                      uploading={uploadingDocumentTitle === document.title}
                      onUpload={(file) => uploadKycDocument(file, document)}
                    />
                  ))}
                </div>
              </ProfileFormSection>
            </div>

            <DialogFooter className="mt-5">
              <Button type="button" variant="outline" onClick={() => setIdentityModalOpen(false)} disabled={identitySaving || Boolean(uploadingDocumentTitle)}>
                Cancel
              </Button>
              <Button type="submit" disabled={identitySaving || Boolean(uploadingDocumentTitle)}>
                {identitySaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {identitySaving ? "Submitting..." : "Submit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
          <p className="mt-1 text-sm leading-6 text-textSecondary">Access to client management, trust submission and network building.</p>
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

function IdentityVerificationSection({ identityType, profileData, action }: { identityType: IdentityType; profileData?: AccountProfileData; action?: React.ReactNode }) {
  const config = useMemo(() => getIdentityVerificationConfig(identityType, profileData), [identityType, profileData]);

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
        {action}
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        {config.documents.map((document) => (
          <VerificationDocumentCard key={document.title} document={document} />
        ))}
      </div>
    </section>
  );
}

function VerificationDocumentCard({ document }: { document: VerificationDocument }) {
  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-white p-4">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-lg border border-line bg-soft">
          {document.imageUrl ? <img src={document.imageUrl} alt={document.title} className="h-full w-full object-contain" /> : <IdCard className="h-10 w-10 text-brandGold" />}
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="min-w-0">
            <div className="text-base font-semibold text-textPrimary">{document.title}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-textSecondary">
              <span>{document.imageUrl ? "Image uploaded" : "Image not uploaded"}</span>
              {document.imageUrl ? <Check className="h-4 w-4 shrink-0 rounded-full bg-green-600 p-0.5 text-white" /> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfilePhoto({ name, avatarUrl, onUploaded }: { name: string; avatarUrl?: string | null; onUploaded: () => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadAvatar = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notifyError("Please upload an image file.", "profile-avatar-file-type");
      return;
    }
    if (file.size > maxAvatarUploadSize) {
      notifyError("Profile picture must not be more than 10MB.", "profile-avatar-file-size");
      return;
    }

    setUploading(true);
    try {
      await accountApi.uploadAvatar(file);
      notifySuccess("Profile picture updated successfully.", "profile-avatar-upload");
      await onUploaded();
    } catch (error) {
      notifyError(getErrorMessage(error, "Unable to upload profile picture."), "profile-avatar-upload-error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="relative h-20 w-20 shrink-0">
      <UserAvatar name={name} avatarUrl={avatarUrl} className="h-20 w-20 border-2 border-white text-lg shadow-soft" />
      <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.gif,image/jpeg,image/png,image/gif" className="sr-only" onChange={(event) => void uploadAvatar(event.target.files?.[0])} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brandGold text-white shadow-soft transition hover:bg-[#B89222] disabled:cursor-wait disabled:opacity-70"
        aria-label="Upload profile picture"
        title="Upload profile picture"
      >
        {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      </button>
    </div>
  );
}

function ProfileActivityPanel({ activities, userName, status }: { activities?: AuditLog[]; userName: string; status: UserStatus }) {
  const { can } = usePermission();
  const [records, setRecords] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const canViewFullActivity = can("requestLog.view") || can("fileUploadLog.view");

  const loadActivity = () => {
    setReloadKey((current) => current + 1);
  };

  useEffect(() => {
    let active = true;

    if (activities !== undefined) {
      setRecords(activities);
      setLoading(false);
      setFailed(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setFailed(false);
    listRecords<AuditLog>("trust-fund-audit-logs", auditLogs as AuditLog[])
      .then((items) => {
        if (!active) return;
        setRecords(
          items
            .filter((item) => item.user.toLowerCase() === userName.toLowerCase())
            .sort((a, b) => Date.parse(b.dateTime) - Date.parse(a.dateTime))
            .slice(0, 5)
        );
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activities, reloadKey, userName]);

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

        <div className="sidebar-scroll max-h-[28rem] overflow-y-auto pr-2">
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

function ReferralQrCard({ referralCode }: { referralCode?: string }) {
  const [qrImageUrl, setQrImageUrl] = useState<string>();
  const referralLink = useMemo(() => {
    if (!referralCode) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/agent/signup/${encodeURIComponent(referralCode)}`;
  }, [referralCode]);

  useEffect(() => {
    let active = true;

    if (!referralLink) {
      setQrImageUrl(undefined);
      return () => {
        active = false;
      };
    }

    QRCode.toDataURL(referralLink, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 160,
      color: {
        dark: "#111111",
        light: "#ffffff"
      }
    })
      .then((url) => {
        if (active) setQrImageUrl(url);
      })
      .catch(() => {
        if (active) setQrImageUrl(undefined);
      });

    return () => {
      active = false;
    };
  }, [referralLink]);

  const copyReferralLink = async () => {
    if (!referralLink) {
      notifyError("Referral code is unavailable.", "referral-link-copy-error");
      return;
    }

    try {
      await navigator.clipboard.writeText(referralLink);
      notifySuccess("Referral link copied successfully.", "referral-link-copy");
    } catch {
      notifyError("Unable to copy referral link.", "referral-link-copy-error");
    }
  };

  return (
    <div className="flex w-fit items-center gap-3 rounded-lg border border-line bg-white p-3 shadow-soft">
      <div className="flex h-20 w-20 items-center justify-center rounded-md border border-line bg-white p-1.5">
        {qrImageUrl && referralCode ? <img src={qrImageUrl} alt={`Referral QR ${referralCode}`} className="h-full w-full object-contain" /> : <QrCode className="h-9 w-9 text-brandGold" />}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brandGold">
          <QrCode className="h-4 w-4" />
          Referral QR
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="text-sm font-semibold text-textPrimary">{referralCode || "-"}</div>
          <button
            type="button"
            onClick={copyReferralLink}
            disabled={!referralCode}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-brandGold/30 bg-[#FFF8E1] text-brandGold transition hover:border-brandGold hover:bg-brandGold hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-brandGold/30 disabled:hover:bg-[#FFF8E1] disabled:hover:text-brandGold"
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

function TextInput({ label, value, onChange, type = "text", required = true, uppercase = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; uppercase?: boolean }) {
  return (
    <label className="block text-sm font-medium">
      {label} {required ? <span className="text-red-600">*</span> : null}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(uppercase ? event.target.value.toUpperCase() : event.target.value)}
        className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
      />
    </label>
  );
}

function SelectInput({ label, value, options, onChange, required = false }: { label: string; value: string; options: string[]; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-textPrimary">
      {label} {required ? <span className="text-red-600">*</span> : null}
      <select value={value} required={required} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 transition focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProfileFormSection({ title, icon: Icon, children }: { title: string; icon: typeof Mail; children: React.ReactNode }) {
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

function KycUploadCard({ document, uploading, onUpload }: { document: KycDocument; uploading?: boolean; onUpload: (file: File | undefined) => Promise<void> | void }) {
  const isImage = isImageKycDocument(document);
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

function mapStaffProfile(profileData: AccountProfileData | undefined, sessionName: string, sessionEmail: string, role: RoleId): StaffProfile {
  return {
    fullName: profileData?.Fullname?.trim() || sessionName,
    email: profileData?.Email?.trim() || sessionEmail,
    role,
    status: "ACTIVE"
  };
}

function mapAgentProfile(profileData: AccountProfileData | undefined, sessionName: string, sessionEmail: string): AgentProfile {
  return {
    referralCode: getProfileReferralId(profileData),
    referralName: profileData?.Introducer?.Fullname || profileData?.Introducer?.Username || "-",
    introducerEmail: profileData?.Introducer?.Username || "-",
    email: profileData?.Email?.trim() || sessionEmail,
    displayName: profileData?.Displayname?.trim() || profileData?.Fullname?.trim() || sessionName,
    identityType: normalizeIdentityType(profileData?.IdentityType),
    identityNo: profileData?.IdentityID || "",
    fullName: profileData?.Fullname?.trim() || sessionName,
    dateOfBirth: toDateOnlyValue(profileData?.DateOfBirth),
    country: profileData?.Country || "Malaysia",
    postcode: profileData?.Postcode || "",
    state: profileData?.State || "",
    city: profileData?.City || "",
    address1: profileData?.Address_1 || "",
    address2: profileData?.Address_2 || "",
    mobileCode: formatMobileCode(profileData?.CountryMobileCode),
    mobileNumber: profileData?.Mobile || "",
    tinNumber: profileData?.TinNumber || "",
    occupation: normalizeIdentityType(profileData?.IdentityType) === "SSM" ? null : profileData?.Occupation ?? "",
    bankCode: profileData?.BankName || "",
    bankName: profileData?.BankNameDetail || "",
    bankAccountHolderName: profileData?.AccountName || sessionName,
    bankAccountNumber: profileData?.AccountNumber || "",
    status: "ACTIVE",
    kycDocuments: createKycDocumentsFromProfile(normalizeIdentityType(profileData?.IdentityType), profileData)
  };
}

function getProfileReferralId(profileData: AccountProfileData | undefined) {
  return profileData?.ReferralID?.trim() || undefined;
}

function createKycDocumentMap(profileData?: AccountProfileData): Record<IdentityType, KycDocument[]> {
  return {
    NRIC: createKycDocumentsFromProfile("NRIC", profileData),
    Passport: createKycDocumentsFromProfile("Passport", profileData),
    SSM: createKycDocumentsFromProfile("SSM", profileData)
  };
}

function createKycDocumentsFromProfile(identityType: IdentityType, profileData?: AccountProfileData): KycDocument[] {
  if (identityType === "NRIC") {
    return [
      createKycDocument("NRIC - Front", profileData?.IcFront?.FileUrl),
      createKycDocument("NRIC - Back", profileData?.IcBack?.FileUrl)
    ];
  }
  if (identityType === "Passport") return [createKycDocument("Passport - Information Page", profileData?.Passport?.FileUrl)];
  return [createKycDocument("SSM Registration Certificate", profileData?.SsmCertificate?.FileUrl)];
}

function createKycDocuments(identityType: IdentityType): KycDocument[] {
  if (identityType === "NRIC") return [createKycDocument("NRIC - Front"), createKycDocument("NRIC - Back")];
  if (identityType === "Passport") return [createKycDocument("Passport - Information Page")];
  return [createKycDocument("SSM Registration Certificate")];
}

function createKycDocument(title: string, fileUrl?: string): KycDocument {
  return fileUrl ? { title, fileUrl, fileName: getFileNameFromUrl(fileUrl) } : { title };
}

function getFileNameFromUrl(fileUrl: string) {
  const cleanUrl = fileUrl.split("?")[0];
  return cleanUrl.split("/").pop() || "Uploaded document";
}

function isImageKycDocument(document: KycDocument) {
  const fileUrl = document.fileUrl?.toLowerCase() ?? "";
  const fileName = document.fileName?.toLowerCase() ?? "";
  return fileUrl.startsWith("data:image/") || /\.(jpg|jpeg|png|gif|webp|bmp|svg)(?:$|\?)/.test(fileUrl) || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(fileName);
}

function isValidKycUpload(file: File) {
  const validType = file.type.startsWith("image/") || file.type === "application/pdf";
  if (!validType) {
    notifyError("Please upload an image or PDF file.", "profile-identity-kyc-file-type");
    return false;
  }
  if (file.size > maxKycUploadSize) {
    notifyError("KYC file must not be more than 5MB.", "profile-identity-kyc-file-size");
    return false;
  }
  return true;
}

function getKycDocumentType(title: string): AccountKycDocumentType {
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

function getKycDocumentTitle(documentType: AccountKycDocumentType) {
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

function getKycPublicIdPatch(documentType: AccountKycDocumentType, publicId: string): Partial<AgentProfile> {
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

function normalizeIdentityType(value: string | undefined): IdentityType {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "passport") return "Passport";
  if (normalized === "ssm") return "SSM";
  return "NRIC";
}

function normalizeIdentityTypeForApi(value: IdentityType) {
  return value === "Passport" ? "PASSPORT" : value;
}

function mapProfileActivities(activities: AccountProfileActivity[] | undefined): AuditLog[] | undefined {
  if (!activities) return undefined;

  return activities.map((activity, index) => {
    const activityTitle = activity.ActivityTitle || activity.activityTitle || activity.activitytitle || activity.ActionName || "Profile activity";

    return {
      id: activity.RequestID || `PROFILE-ACTIVITY-${index}`,
      dateTime: activity.ActivityDate || "",
      user: "",
      role: "AG",
      action: activityTitle,
      module: "Profile",
      recordReference: activity.RequestID || "",
      ipAddress: "",
      result: activity.IsSuccess === false ? "Failed" : "Success",
      description: activity.Description || activityTitle
    };
  });
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validateAgentIdentity(agent: AgentProfile) {
  if (!agent.fullName.trim()) return "Full name is required.";
  if (!agent.identityNo.trim()) return "Identity id is required.";
  if (!agent.dateOfBirth) return agent.identityType === "SSM" ? "Incorporation date is required." : "Date of birth is required.";
  if (agent.identityType !== "SSM" && !isAtLeast18(agent.dateOfBirth)) return "Agent must be at least 18 years old.";
  if (!agent.tinNumber.trim()) return "TIN number is required.";
  if (agent.identityType !== "SSM" && !agent.occupation?.trim()) return "Occupation is required.";
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getIdentityLabels(identityType: IdentityType) {
  if (identityType === "Passport") return { identityNo: "Passport No.", fullName: "Full Name (as per Passport)", date: "Date of Birth" };
  if (identityType === "SSM") return { identityNo: "Registration No.", fullName: "Registered Company Name", date: "Company Incorporation Date" };
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

function getIdentityVerificationConfig(identityType: IdentityType, profileData?: AccountProfileData) {
  if (identityType === "Passport") {
    return {
      description: "Passport document submitted for account verification.",
      documents: [
        {
          title: "Passport - Information Page",
          imageUrl: profileData?.Passport?.FileUrl
        }
      ]
    };
  }

  if (identityType === "SSM") {
    return {
      description: "SSM registration document submitted for account verification.",
      documents: [
        {
          title: "SSM Registration Certificate",
          imageUrl: profileData?.SsmCertificate?.FileUrl
        }
      ]
    };
  }

  return {
    description: "Identification documents submitted for account verification.",
    documents: [
      {
        title: "IC - Front",
        imageUrl: profileData?.IcFront?.FileUrl
      },
      {
        title: "IC - Back",
        imageUrl: profileData?.IcBack?.FileUrl
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

function toDateOnlyValue(value?: string | null) {
  if (!value) return "";
  return value.trim().match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? value.trim();
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

function getDefaultMobileCode(options: Array<{ country: string; code: string }>) {
  return options.find((item) => item.country.toLowerCase() === "malaysia")?.code || options[0]?.code || "+60";
}

function formatMobileCode(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "+60";
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits && digits !== "0" ? `+${digits}` : "";
}

function normalizeMobileCode(value: string) {
  return value.replace(/\D/g, "");
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

