export type LotStatus = "available" | "reserved" | "sold" | "hold";
export type InterestStatus = "new" | "contacted" | "qualified" | "closed";

export interface Provider {
  id: string | number;
  slug: string;
  name: string;
  city: string;
  tagline: string;
  description: string;
  verified: boolean;
  developmentCount: number;
  activeLots: number;
  accent: string;
}

export interface Development {
  id: string | number;
  slug: string;
  providerId: string | number;
  providerName: string;
  name: string;
  city: string;
  district: string;
  type: string;
  description: string;
  totalLots: number;
  availableLots: number;
  minPrice: number;
  area: string;
  status: "published" | "draft" | "review";
  featured?: boolean;
  signal: string;
}

export interface Lot {
  id: string | number;
  developmentId: string | number;
  code: string;
  block: string;
  area: number;
  price: number;
  status: LotStatus;
  use: string;
  frontage: number;
  depth: number;
  orientation: string;
  demandScore: number;
  geometry: string;
  notes?: string;
}

export interface Interest {
  id: string | number;
  lotCode: string;
  development: string;
  customer: string;
  phone: string;
  email: string;
  source: string;
  status: InterestStatus;
  createdAt: string;
  budget: number;
}

export interface Analysis {
  id: string | number;
  title: string;
  lotCode: string;
  score: number;
  verdict: string;
  createdAt: string;
  estimatedRevenue: number;
  confidence: "مرتفع" | "متوسط" | "استكشافي";
}

export interface DashboardMetrics {
  views: number;
  interests: number;
  conversion: number;
  availability: number;
  trend: number;
}

export interface ApiEnvelope<T> {
  data?: T;
  results?: T;
  detail?: string;
  message?: string;
}
