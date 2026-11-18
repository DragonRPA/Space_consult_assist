export interface SelfActionEvidenceItem {
  stepNo: number;
  title: string;
  method: string;
  result: 'NORMAL' | 'FAULT' | 'UNRESOLVED';
  note: string;
}

export interface EstimatePartItem {
  id: string;
  name: string;
  partCode: string;
  qty: number;
  unitPrice: number;
  supplyPrice: number;
  imageUrl?: string;
}

export interface DispatchDoc1st {
  docNo: string;
  issuedAt: string;
  recipientCompany: string;
  recipientManager: string;
  recipientPhone: string;
  recipientEmail: string;
  siteCompany: string;
  siteWorkerName: string;
  siteWorkerPhone: string;
  equipmentModel: string;
  serialNumber: string;
  salesType: string;
  symptoms: string[];
  selectedErrorCodes: string[];
  evidenceSteps: SelfActionEvidenceItem[];
  failureReason: string;
  assignedEngineer: string;
  engineerPhone: string;
  engineerCenter: string;
  plannedVisitAt: string;
  sitePreparation: string;
  sentAt?: string;
  sentChannel?: 'KAKAO' | 'SMS' | 'EMAIL';
  status: 'DRAFT' | 'SENT';
}

export interface DispatchDoc2nd {
  docNo: string;
  refDoc1stNo: string;
  issuedAt: string;
  recipientCompany: string;
  recipientManager: string;
  recipientPhone: string;
  recipientEmail: string;
  siteCompany: string;
  equipmentModel: string;
  serialNumber: string;
  engineerName: string;
  visitedAt: string;
  rootCause: string;
  actionTaken: string;
  parts: EstimatePartItem[];
  techLaborFee: number;
  travelFee: number;
  supplyTotal: number;
  vat: number;
  grandTotal: number;
  bankInfo: string;
  sentAt?: string;
  sentChannel?: 'KAKAO' | 'SMS' | 'EMAIL';
  approvalStatus: 'PENDING' | 'SENT' | 'APPROVED';
}

export type DispatchChannelType = 'KAKAO' | 'SMS' | 'EMAIL';

