// Ateliê da Ótica - Type Definitions

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  createdAt: string;
}

export type CustomerOrigin = 'google' | 'instagram' | 'indication' | 'store' | 'whatsapp' | 'other' | 'unknown';
export type ContactPreference = 'whatsapp' | 'phone' | 'email' | 'sms' | 'none';
export type CommunicationStatus = 'authorized' | 'pending' | 'declined' | 'unsubscribed';

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  email: string;
  origin: CustomerOrigin;
  contactPreference: ContactPreference;
  communicationStatus: CommunicationStatus;
  notes: string;
  lastPurchaseDate: string | null;
  nextActionDate: string | null;
  responsible: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProductCategory = 'frames' | 'lenses' | 'sunglasses' | 'accessories' | 'services' | 'other';

export interface Product {
  id: string;
  organizationId: string;
  name: string;
  category: ProductCategory;
  price: number;
  cost: number;
  code: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'pix' | 'cash' | 'credit' | 'debit' | 'installment' | 'other';
export type SaleStatus = 'completed' | 'pending' | 'cancelled' | 'refunded';

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Sale {
  id: string;
  organizationId: string;
  number: string;
  customerId: string | null;
  customerName: string;
  date: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  origin: CustomerOrigin;
  responsible: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadStage = 'new_contact' | 'in_service' | 'quote_sent' | 'awaiting_return' | 'won' | 'lost';
export type LossReason = 'price' | 'competitor' | 'no_need' | 'no_response' | 'other';

export interface Lead {
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  email: string;
  origin: CustomerOrigin;
  stage: LeadStage;
  estimatedValue: number;
  responsible: string;
  nextContactDate: string;
  lossReason: LossReason | null;
  notes: string;
  customerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quote {
  id: string;
  organizationId: string;
  leadId: string;
  customerId: string | null;
  customerName: string;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  validUntil: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type FollowUpStatus = 'pending' | 'scheduled' | 'sent' | 'responded' | 'completed' | 'cancelled' | 'failed';
export type FollowUpReason = 'post_purchase' | 'satisfaction' | 'prescription_review' | 'maintenance' | 'inactive_client' | 'pending_quote' | 'other';

export interface FollowUpTask {
  id: string;
  organizationId: string;
  customerId: string;
  customerName: string;
  reason: FollowUpReason;
  description: string;
  channel: ContactPreference;
  scheduledDate: string;
  status: FollowUpStatus;
  responsible: string;
  result: string;
  nextActionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'blocked';

export interface MessageEvent {
  id: string;
  organizationId: string;
  customerId: string;
  customerName: string;
  templateId: string;
  templateName: string;
  channel: 'whatsapp' | 'sms' | 'email';
  status: MessageStatus;
  content: string;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  failureReason: string;
  retryCount: number;
  isTestMode: boolean;
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  organizationId: string;
  name: string;
  content: string;
  channel: 'whatsapp' | 'sms' | 'email';
  active: boolean;
  createdAt: string;
}

export interface MarketingCampaign {
  id: string;
  organizationId: string;
  name: string;
  platform: string;
  startDate: string;
  endDate: string;
  investment: number;
  leadsGenerated: number;
  quotesRelated: number;
  salesAttributed: number;
  revenueAttributed: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export interface AppState {
  organization: Organization;
  user: UserProfile;
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  leads: Lead[];
  quotes: Quote[];
  followUps: FollowUpTask[];
  messageEvents: MessageEvent[];
  messageTemplates: MessageTemplate[];
  campaigns: MarketingCampaign[];
  auditLogs: AuditLog[];
}
