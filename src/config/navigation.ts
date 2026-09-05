import {
  BadgeDollarSign,
  BookOpen,
  BriefcaseBusiness,
  Gauge,
  Network,
  ShieldCheck,
  UserCog,
  Users
} from "lucide-react";
import type { Permission } from "./permissions";
import type { RoleId } from "../types";

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
  hiddenForRoles?: RoleId[];
  children?: NavigationChild[];
}

export const navigation: NavigationItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: Gauge, permission: "dashboard.view" },
  { label: "Admin Listing", path: "/admin-listing", icon: UserCog, permission: "adminListing.view" },
  { label: "Agents Listing", path: "/agents-listing", icon: Users, permission: "agents.view" },
  {
    label: "Trust Management",
    icon: BriefcaseBusiness,
    permission: "trustListing.view",
    children: [
      { label: "Trust Listing", path: "/trust/listing", permission: "trustListing.view" },
      { label: "Trust Draft Listing", path: "/trust/draft-listing", permission: "trustDraftListing.view" },
      { label: "Trust Payment", path: "/trust/payment", permission: "trustPayment.view" },
      { label: "Dividend Scheduled", path: "/trust/dividend-scheduled", permission: "dividendScheduled.view" }
    ]
  },
  { label: "My Network", path: "/my-network", icon: Network, permission: "myNetwork.view", hiddenForRoles: ["SA", "AD", "OP", "AC"] },
  { label: "Network", path: "/network", icon: Network, permission: "network.view" },
  {
    label: "Income",
    icon: BadgeDollarSign,
    permission: "income.view",
    children: [
      { label: "Commission", path: "/income/commission", permission: "income.view" },
      { label: "Overriding Bonus", path: "/income/overriding-bonus", permission: "income.view" }
    ]
  },
  {
    label: "Resources",
    icon: BookOpen,
    permission: "resources.view",
    children: [
      { label: "Memo", path: "/resources/memo", permission: "memo.view" },
      { label: "Form & Document", path: "/resources/forms-documents", permission: "formsDocuments.view" },
      { label: "Internal Training", path: "/resources/internal-training", permission: "internalTraining.view" }
    ]
  },
  {
    label: "Audit",
    icon: ShieldCheck,
    permission: "fileUploadLog.view",
    children: [
      { label: "File Upload Log", path: "/audit/file-upload-log", permission: "fileUploadLog.view" },
      { label: "Request Log", path: "/audit/request-log", permission: "requestLog.view" }
    ]
  }
];
