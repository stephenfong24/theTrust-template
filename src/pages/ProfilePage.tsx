import { BadgeCheck, BriefcaseBusiness, CalendarClock, IdCard, Mail, MapPin, Network, ShieldCheck, UserCog } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { UserAvatar } from "../components/common/UserAvatar";
import { roles } from "../config/roles";
import { useAuth } from "../hooks/useAuth";

export function ProfilePage() {
  const { session } = useAuth();

  if (!session) return null;

  const roleName = roles[session.role] ?? session.role;

  return (
    <>
      <PageHeader
        title="Profile"
        description={session.role === "AG" ? "Agent account profile and referral-facing information." : "Internal user account profile and access information."}
        actions={
          <Link to="/change-password" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">
            Change Password
          </Link>
        }
      />

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className={session.role === "AG" ? "border-b border-line bg-[#FFF8E1] p-5" : "border-b border-line bg-soft p-5"}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <UserAvatar name={session.name} />
              <div>
                <h2 className="text-xl font-semibold text-textPrimary">{session.name}</h2>
                <p className="mt-1 text-sm text-textSecondary">{session.email}</p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brandGold/40 bg-white px-3 py-1.5 text-sm font-semibold text-textPrimary">
              <BadgeCheck className="h-4 w-4 text-brandGold" />
              {roleName}
            </span>
          </div>
        </div>

        {session.role === "AG" ? <AgentProfileContent /> : <StaffProfileContent roleName={roleName} />}
      </section>
    </>
  );
}

function StaffProfileContent({ roleName }: { roleName: string }) {
  return (
    <div className="grid gap-6 p-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <ProfileSection title="Account Information" icon={UserCog}>
          <ProfileField label="Account Type" value="Internal User" />
          <ProfileField label="Role" value={roleName} />
          <ProfileField label="Department" value={getDepartment(roleName)} />
          <ProfileField label="Status" value="Active" />
        </ProfileSection>

        <ProfileSection title="Access & Security" icon={ShieldCheck}>
          <ProfileField label="Authentication" value="Local credential login" />
          <ProfileField label="Access Scope" value="Permission-based system modules" />
          <ProfileField label="Last Login" value="Current active session" />
          <ProfileField label="Security Action" value="Password change available from profile menu" />
        </ProfileSection>
      </div>

      <aside className="rounded-lg border border-line bg-soft p-5">
        <ShieldCheck className="h-8 w-8 text-brandGold" />
        <h3 className="mt-4 text-base font-semibold text-textPrimary">Internal Operations Profile</h3>
        <p className="mt-2 text-sm leading-6 text-textSecondary">
          This profile is for administrative and operational users who manage trust workflows, approvals, audit visibility, and system records.
        </p>
      </aside>
    </div>
  );
}

function AgentProfileContent() {
  return (
    <div className="grid gap-6 p-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <ProfileSection title="Agent Information" icon={IdCard}>
          <ProfileField label="Agent Code" value="AG-DEMO-0001" />
          <ProfileField label="Branch" value="Kuala Lumpur" />
          <ProfileField label="Status" value="Active" />
          <ProfileField label="Referral Code" value="REF-AG-0001" />
        </ProfileSection>

        <ProfileSection title="Contact & Network" icon={Network}>
          <ProfileField label="Mobile" value="+60 12-555 9679" />
          <ProfileField label="Country" value="Malaysia" />
          <ProfileField label="Network Access" value="My Network and Income modules" />
          <ProfileField label="Onboarding" value="Agent self-service profile" />
        </ProfileSection>
      </div>

      <aside className="rounded-lg border border-brandGold/40 bg-[#FFF8E1] p-5">
        <BriefcaseBusiness className="h-8 w-8 text-brandGold" />
        <h3 className="mt-4 text-base font-semibold text-textPrimary">Agent Business Profile</h3>
        <p className="mt-2 text-sm leading-6 text-textSecondary">
          This profile is tailored for agent-facing activity, including referral information, network access, and commission-related navigation.
        </p>
      </aside>
    </div>
  );
}

function ProfileSection({ title, icon: Icon, children }: { title: string; icon: typeof Mail; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <div className="mb-4 flex items-center gap-2 border-b border-line pb-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-soft text-brandGold">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-textPrimary">{title}</h3>
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
      <div className="mt-1 break-words text-sm font-semibold text-textPrimary">{value}</div>
    </div>
  );
}

function getDepartment(roleName: string) {
  if (roleName.includes("Administrator")) return "System Administration";
  if (roleName.includes("Operation")) return "Operations";
  if (roleName.includes("Account")) return "Accounts";
  return "Platform Governance";
}

function getFieldIcon(label: string) {
  if (label.toLowerCase().includes("login")) return <CalendarClock className="h-3.5 w-3.5" />;
  if (label.toLowerCase().includes("branch") || label.toLowerCase().includes("country")) return <MapPin className="h-3.5 w-3.5" />;
  if (label.toLowerCase().includes("role") || label.toLowerCase().includes("type")) return <ShieldCheck className="h-3.5 w-3.5" />;
  return <Mail className="h-3.5 w-3.5" />;
}
