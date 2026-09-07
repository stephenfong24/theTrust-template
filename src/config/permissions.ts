import type { RoleId } from "../types";

export const permissions = [
  "dashboard.view",
  "adminListing.view",
  "agents.view",
  "trustListing.view",
  "trustDraftListing.view",
  "trustPayment.view",
  "dividendScheduled.view",
  "myNetwork.view",
  "network.view",
  "income.view",
  "resources.view",
  "memo.view",
  "formsDocuments.view",
  "internalTraining.view",
  "fileUploadLog.view",
  "requestLog.view"
] as const;

export type Permission = (typeof permissions)[number];

export const rolePermissions: Record<RoleId, Permission[]> = {
  SA: [...permissions],
  AD: [...permissions],
  OP: [
    "dashboard.view",
    "agents.view",
    "trustListing.view",
    "trustPayment.view",
    "network.view",
    "income.view",
    "resources.view",
    "memo.view",
    "formsDocuments.view",
    "internalTraining.view",
    "fileUploadLog.view",
    "requestLog.view"
  ],
  AC: [
    "dashboard.view",
    "agents.view",
    "trustListing.view",
    "trustPayment.view",
    "network.view",
    "income.view",
    "resources.view",
    "memo.view",
    "formsDocuments.view",
    "internalTraining.view",
    "fileUploadLog.view",
    "requestLog.view"
  ],
  AG: [
    "dashboard.view",
    "trustListing.view",
    "trustDraftListing.view",
    "myNetwork.view",
    "income.view",
    "resources.view",
    "memo.view",
    "formsDocuments.view",
    "internalTraining.view",
    "fileUploadLog.view",
    "requestLog.view"
  ]
};
