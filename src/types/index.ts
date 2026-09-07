export type RoleId = "SA" | "AD" | "OP" | "AC" | "AG";

export type UserStatus = "ACTIVE" | "INACTIVE";

export interface User {
  id: string;
  password?: string;
  name: string;
  email: string;
  role: RoleId;
  status: UserStatus;
}

export interface LocalSession {
  userId: string;
  email: string;
  name: string;
  role: RoleId;
  loginTime: string;
  token?: string;
  accessToken?: string;
  jwt?: string;
  jwtToken?: string;
  authToken?: string;
}

export interface ApplicationRecord {
  id: string;
  applicationNumber: string;
  clientId: string;
  clientName: string;
  trustProduct: string;
  agent: string;
  applicationDate: string;
  investmentAmount: number;
  status: string;
  assignedOfficer: string;
  progress: number;
  lastUpdated: string;
  createdBy: string;
}

export interface ClientRecord {
  id: string;
  name: string;
  identificationNumber: string;
  email: string;
  phone: string;
  type: string;
  riskLevel: string;
  status: string;
  createdDate: string;
  address: string;
}

export interface AgentRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  applications: number;
  assets: number;
  status: string;
}

export interface TrustProduct {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  minimumInvestment: number;
  indicativeReturn: string;
  tenure: string;
  riskLevel: string;
  activeAccountCount: number;
  status: string;
  createdDate: string;
  updatedDate: string;
}

export interface TrustAccount {
  id: string;
  accountNumber: string;
  clientName: string;
  productName: string;
  balance: number;
  openedDate: string;
  status: string;
  officer: string;
}

export interface PaymentRecord {
  id: string;
  receiptNumber: string;
  client: string;
  trustAccount: string;
  paymentDate: string;
  paymentMethod: string;
  amount: number;
  recordedBy: string;
  status: string;
}

export interface TaskRecord {
  id: string;
  title: string;
  module: string;
  relatedRecord: string;
  assignedTo: string;
  priority: string;
  dueDate: string;
  status: string;
  createdDate: string;
}

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  read: boolean;
}

export interface AuditLog {
  id: string;
  dateTime: string;
  user: string;
  role: RoleId;
  action: string;
  module: string;
  recordReference: string;
  ipAddress: string;
  result: string;
  description: string;
}
