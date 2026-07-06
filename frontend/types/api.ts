// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'MANAGER' | 'SALES_AGENT';
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST' | 'DISQUALIFIED';
export type LeadSource = 'WEBSITE' | 'REFERRAL' | 'COLD_CALL' | 'EMAIL_CAMPAIGN' | 'SOCIAL_MEDIA' | 'EVENT' | 'PARTNER' | 'INBOUND' | 'OTHER';
export type WellnessFocus = 'FITNESS' | 'NUTRITION' | 'SLEEP_RECOVERY' | 'MENTAL_WELLNESS' | 'WEIGHT_MANAGEMENT' | 'SKINCARE' | 'OTHER';

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  wellnessFocus: WellnessFocus | null;
  jobTitle: string | null;
  website: string | null;
  linkedinUrl: string | null;
  leadSource: LeadSource;
  status: LeadStatus;
  estimatedValue: string | null;
  currency: string;
  tags: string[];
  customFields: Record<string, unknown> | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
  _count: { activities: number; notes: number };
}

export interface CreateLeadPayload {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  wellnessFocus?: WellnessFocus;
  jobTitle?: string;
  leadSource?: LeadSource;
  status?: LeadStatus;
  estimatedValue?: number;
  tags?: string[];
}

// ─── Products & Purchases ───────────────────────────────────────────────────────

export type ProductCategory = 'SUPPLEMENT' | 'EQUIPMENT' | 'PROGRAM' | 'DEVICE' | 'APPAREL';
export type PurchaseStatus = 'COMPLETED' | 'REFUNDED' | 'CANCELLED';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  description: string | null;
  price: string;
  currency: string;
  replenishmentDays: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductPayload {
  name: string;
  sku: string;
  category: ProductCategory;
  description?: string;
  price: number;
  currency?: string;
  replenishmentDays?: number;
}

export interface Purchase {
  id: string;
  quantity: number;
  unitPrice: string;
  currency: string;
  status: PurchaseStatus;
  purchasedAt: string;
  nextReplenishmentAt: string | null;
  notes: string | null;
  product: Product;
}

export interface CreatePurchasePayload {
  productId: string;
  quantity?: number;
  unitPrice?: number;
  currency?: string;
  status?: PurchaseStatus;
  purchasedAt?: string;
  notes?: string;
}

export interface ReplenishmentDue {
  id: string;
  quantity: number;
  nextReplenishmentAt: string;
  lead: { id: string; name: string; company: string | null };
  product: { id: string; name: string; category: ProductCategory };
}

// ─── Activities ───────────────────────────────────────────────────────────────

export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'DEMO' | 'NOTE' | 'TASK';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  duration: number | null;
  outcome: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  itemType: 'activity';
}

export interface Note {
  id: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  itemType: 'note';
}

export type TimelineItem = Activity | Note;

export interface ActivityFeedItem extends Activity {
  lead: { id: string; name: string; company: string | null };
}

export interface CreateActivityPayload {
  type: ActivityType;
  title: string;
  description?: string;
  scheduledAt?: string;
  duration?: number;
  outcome?: string;
}

// ─── Notifications ──────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export interface AiSummary {
  customerProfile: string;
  painPoints: string[];
  buyingSignals: string[];
  objections: string[];
  suggestedAction: string;
}

export interface LeadScore {
  score: number;
  confidence: number;
  reasons: string[];
}

export interface FollowUp {
  content: string;
  type: 'email' | 'whatsapp' | 'call_script';
  tone: 'professional' | 'friendly' | 'persuasive';
}

export interface RagChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RagTaskCreated {
  activityId: string;
  leadId: string;
  leadName: string;
  title: string;
  type: ActivityType;
  scheduledAt: string | null;
  assignedTo: { id: string; firstName: string; lastName: string };
}

export interface RagChatResponse {
  answer: string;
  sources: Array<{ leadId: string; leadName: string; snippet: string }>;
  taskCreated?: RagTaskCreated;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  total: number;
  active: number;
  won: number;
  lost: number;
  conversionRate: number;
  statusCounts: Record<LeadStatus, number>;
  revenueTrend: Array<{ month: string; revenue: number }>;
}
