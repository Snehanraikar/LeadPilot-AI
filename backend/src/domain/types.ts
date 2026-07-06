import { Role, LeadStatus, LeadSource, WellnessFocus, ActivityType, ProductCategory, PurchaseStatus } from '@prisma/client';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: Role;
  organizationId: string;
  organizationName: string;
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export interface CreateLeadDto {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  wellnessFocus?: WellnessFocus;
  jobTitle?: string;
  website?: string;
  linkedinUrl?: string;
  leadSource?: LeadSource;
  status?: LeadStatus;
  estimatedValue?: number;
  currency?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface UpdateLeadDto extends Partial<CreateLeadDto> {
  ownerId?: string;
}

export interface LeadFilters {
  status?: LeadStatus;
  source?: LeadSource;
  wellnessFocus?: WellnessFocus;
  ownerId?: string;
  search?: string;
  minValue?: number;
  maxValue?: number;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── Products & Purchases ──────────────────────────────────────────────────────

export interface CreateProductDto {
  name: string;
  sku: string;
  category: ProductCategory;
  description?: string;
  price: number;
  currency?: string;
  replenishmentDays?: number;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  isActive?: boolean;
}

export interface CreatePurchaseDto {
  productId: string;
  quantity?: number;
  unitPrice?: number;
  currency?: string;
  status?: PurchaseStatus;
  purchasedAt?: Date;
  notes?: string;
}

// ─── Activities ───────────────────────────────────────────────────────────────

export interface CreateActivityDto {
  type: ActivityType;
  title: string;
  description?: string;
  scheduledAt?: Date;
  duration?: number;
  outcome?: string;
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export interface AiSummaryResult {
  customerProfile: string;
  painPoints: string[];
  buyingSignals: string[];
  objections: string[];
  suggestedAction: string;
}

export interface LeadScoreResult {
  score: number;
  confidence: number;
  reasons: string[];
}

export type FollowUpTone = 'professional' | 'friendly' | 'persuasive';
export type FollowUpType = 'email' | 'whatsapp' | 'call_script';

export interface FollowUpResult {
  content: string;
  type: FollowUpType;
  tone: FollowUpTone;
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

export interface RagChatResult {
  answer: string;
  sources: Array<{ leadId: string; leadName: string; snippet: string }>;
  taskCreated?: RagTaskCreated;
}

export interface TaskIntent {
  createTask: boolean;
  leadName: string | null;
  title: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  activityType: ActivityType | null;
}
