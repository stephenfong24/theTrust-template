import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  CreditCard,
  FileArchive,
  FileText,
  Gauge,
  Landmark,
  ShieldCheck,
  UserCog,
  Users
} from "lucide-react";
import type { Permission } from "./permissions";

export interface NavigationChild {
  label: string;
  path: string;
  permission: Permission;
}

export interface NavigationItem {
  label: string;
  path?: string;
  icon: typeof Gauge;
  permission: Permission;
  children?: NavigationChild[];
}

export const navigation: NavigationItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: Gauge, permission: "dashboard.view" },
  {
    label: "Applications",
    icon: ClipboardList,
    permission: "applications.view",
    children: [
      { label: "All Applications", path: "/applications", permission: "applications.view" },
      { label: "New Application", path: "/applications/new", permission: "applications.create" },
      { label: "Pending Review", path: "/applications/pending", permission: "applications.view" },
      { label: "Approved Applications", path: "/applications/approved", permission: "applications.view" },
      { label: "Rejected Applications", path: "/applications/rejected", permission: "applications.view" }
    ]
  },
  {
    label: "Trust Management",
    icon: Landmark,
    permission: "trustAccounts.view",
    children: [
      { label: "Trust Accounts", path: "/trust/accounts", permission: "trustAccounts.view" },
      { label: "Trust Products", path: "/trust/products", permission: "trustProducts.view" },
      { label: "Investment Records", path: "/trust/investments", permission: "investments.view" },
      { label: "Return Information", path: "/trust/returns", permission: "investments.view" },
      { label: "Beneficiaries", path: "/trust/beneficiaries", permission: "beneficiaries.view" }
    ]
  },
  {
    label: "Clients",
    icon: Users,
    permission: "clients.view",
    children: [
      { label: "Client Directory", path: "/clients", permission: "clients.view" },
      { label: "Client Profiles", path: "/clients/C-1001", permission: "clients.view" },
      { label: "KYC Review", path: "/clients/kyc", permission: "clients.view" },
      { label: "Client Documents", path: "/clients/documents", permission: "clients.view" }
    ]
  },
  {
    label: "Agents",
    icon: BriefcaseBusiness,
    permission: "agents.view",
    children: [
      { label: "Agent Directory", path: "/agents", permission: "agents.view" },
      { label: "Agent Applications", path: "/agents/applications", permission: "agents.view" },
      { label: "Agent Performance", path: "/agents/performance", permission: "agents.view" },
      { label: "Agent Documents", path: "/agents/documents", permission: "agents.view" }
    ]
  },
  {
    label: "Payments",
    icon: CreditCard,
    permission: "payments.view",
    children: [
      { label: "Payment Records", path: "/payments", permission: "payments.view" },
      { label: "Receipt Records", path: "/receipts", permission: "receipts.view" },
      { label: "Pending Payments", path: "/payments/pending", permission: "payments.view" },
      { label: "Payment Reconciliation", path: "/payments/reconciliation", permission: "payments.view" }
    ]
  },
  {
    label: "Accounts",
    icon: BadgeDollarSign,
    permission: "accounts.view",
    children: [
      { label: "Financial Overview", path: "/accounts", permission: "accounts.view" },
      { label: "Transaction Records", path: "/accounts/transactions", permission: "accounts.view" },
      { label: "Disbursement Records", path: "/accounts/disbursements", permission: "accounts.view" },
      { label: "Account Reconciliation", path: "/accounts/reconciliation", permission: "accounts.view" }
    ]
  },
  {
    label: "Tasks",
    icon: Activity,
    permission: "tasks.view",
    children: [
      { label: "My Tasks", path: "/tasks", permission: "tasks.view" },
      { label: "Team Tasks", path: "/tasks/team", permission: "tasks.view" },
      { label: "Pending Approvals", path: "/tasks/approvals", permission: "tasks.view" },
      { label: "Completed Tasks", path: "/tasks/completed", permission: "tasks.view" }
    ]
  },
  {
    label: "Documents",
    icon: FileArchive,
    permission: "documents.view",
    children: [
      { label: "Document Library", path: "/documents", permission: "documents.view" },
      { label: "Document Templates", path: "/documents/templates", permission: "documents.view" },
      { label: "Generated Documents", path: "/documents/generated", permission: "documents.view" },
      { label: "Expiring Documents", path: "/documents/expiring", permission: "documents.view" }
    ]
  },
  {
    label: "Reports",
    icon: BarChart3,
    permission: "reports.view",
    children: [
      { label: "Management Reports", path: "/reports", permission: "reports.view" },
      { label: "Financial Reports", path: "/reports/financial", permission: "reports.view" },
      { label: "Application Reports", path: "/reports/applications", permission: "reports.view" },
      { label: "Agent Reports", path: "/reports/agents", permission: "reports.view" },
      { label: "Audit Reports", path: "/reports/audit", permission: "reports.view" }
    ]
  },
  {
    label: "User Management",
    icon: UserCog,
    permission: "users.view",
    children: [
      { label: "Users", path: "/users", permission: "users.view" },
      { label: "Roles and Permissions", path: "/roles", permission: "roles.view" },
      { label: "Login Activities", path: "/login-activities", permission: "auditLogs.view" }
    ]
  },
  {
    label: "Administration",
    icon: Building2,
    permission: "settings.view",
    children: [
      { label: "Company Profile", path: "/administration/company", permission: "settings.view" },
      { label: "System Settings", path: "/settings", permission: "settings.manage" },
      { label: "Notification Settings", path: "/administration/notifications", permission: "settings.manage" },
      { label: "Numbering Formats", path: "/administration/numbering", permission: "settings.manage" },
      { label: "Lookup Data", path: "/administration/lookups", permission: "settings.manage" }
    ]
  },
  {
    label: "Audit and Security",
    icon: ShieldCheck,
    permission: "auditLogs.view",
    children: [
      { label: "Audit Logs", path: "/audit-logs", permission: "auditLogs.view" },
      { label: "Security Events", path: "/security-events", permission: "securityEvents.view" },
      { label: "Session History", path: "/session-history", permission: "auditLogs.view" },
      { label: "System Activity", path: "/system-activity", permission: "auditLogs.view" }
    ]
  }
];
