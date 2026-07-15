import { demoAnalyses, demoDevelopments, demoInterests, demoLots, demoMetrics, demoProviders } from "@/lib/demo-data";
import type { Analysis, DashboardMetrics, Development, Interest, Lot, LotStatus, Provider } from "@/lib/types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
const ACCESS_KEY = "istinar.access";
const REFRESH_KEY = "istinar.refresh";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

const browser = () => typeof window !== "undefined";

export const authStore = {
  get access() {
    return browser() ? window.localStorage.getItem(ACCESS_KEY) : null;
  },
  get refresh() {
    return browser() ? window.localStorage.getItem(REFRESH_KEY) : null;
  },
  save(access: string, refresh?: string) {
    if (!browser()) return;
    window.localStorage.setItem(ACCESS_KEY, access);
    if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    if (!browser()) return;
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};

function unwrap<T>(payload: unknown): T {
  if (Array.isArray(payload)) return payload as T;
  if (payload && typeof payload === "object") {
    const candidate = payload as Record<string, unknown>;
    if ("results" in candidate) return candidate.results as T;
    if ("data" in candidate) return candidate.data as T;
  }
  return payload as T;
}

async function refreshAccessToken() {
  const refresh = authStore.refresh;
  if (!refresh) return null;
  const response = await fetch(`${API_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!response.ok) return null;
  const payload = await response.json() as { access?: string };
  if (!payload.access) return null;
  authStore.save(payload.access);
  return payload.access;
}

async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const access = authStore.access;
  if (access) headers.set("Authorization", `Bearer ${access}`);
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers, signal: controller.signal });
  } catch {
    throw new ApiError("تعذر الوصول إلى الخادم. يتم عرض بيانات تجريبية.");
  } finally {
    clearTimeout(timeout);
  }
  if (response.status === 401 && !retried) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, init, true);
    authStore.clear();
  }
  if (!response.ok) {
    let message = "تعذر إتمام الطلب";
    try {
      const body = await response.json() as { detail?: string; message?: string };
      message = body.detail || body.message || message;
    } catch { /* response may not be JSON */ }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return unwrap<T>(await response.json());
}

async function withFallback<T>(operation: () => Promise<T>, fallback: T): Promise<{ data: T; mode: "live" | "demo" }> {
  try {
    return { data: await operation(), mode: "live" };
  } catch (error) {
    if (error instanceof ApiError && error.status > 0) throw error;
    return { data: fallback, mode: "demo" };
  }
}

type RawRecord = Record<string, unknown>;
const record = (value: unknown): RawRecord => value && typeof value === "object" ? value as RawRecord : {};
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : value == null ? fallback : String(value);
const numeric = (value: unknown, fallback = 0) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; };
const rawList = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const generatedGeometry = (index: number) => {
  const presets = [
    "polygon(8% 10%, 31% 10%, 29% 36%, 7% 38%)", "polygon(34% 10%, 57% 10%, 55% 36%, 32% 38%)", "polygon(60% 10%, 84% 10%, 82% 36%, 58% 38%)",
    "polygon(11% 51%, 35% 49%, 36% 76%, 10% 78%)", "polygon(39% 49%, 64% 50%, 65% 76%, 38% 76%)", "polygon(68% 49%, 91% 51%, 92% 78%, 67% 76%)",
  ];
  return presets[index % presets.length];
};

function normalizeProvider(value: unknown): Provider {
  const raw = record(value);
  return {
    id: text(raw.id), slug: text(raw.slug), name: text(raw.name, "شركة عقارية"), city: text(raw.city, "غير محدد"),
    tagline: text(raw.provider_type, "عرض عقاري منظم"), description: text(raw.description, ""), verified: Boolean(raw.is_featured || raw.status === "verified" || raw.status === "active"),
    developmentCount: numeric(raw.development_count), activeLots: numeric(raw.active_lots), accent: text(raw.primary_color, "#08766f"),
  };
}

function normalizeDevelopment(value: unknown): Development {
  const raw = record(value); const provider = normalizeProvider(raw.provider);
  const rawStatus = text(raw.status, "draft");
  const status: Development["status"] = rawStatus === "published" ? "published" : rawStatus === "review" || rawStatus === "pending_review" ? "review" : "draft";
  return {
    id: text(raw.id), slug: text(raw.slug), providerId: provider.id, providerName: provider.name, name: text(raw.name, "مخطط بدون اسم"), city: text(raw.city, provider.city), district: text(raw.district, ""), type: text(raw.development_type, "سكني"), description: text(raw.description, ""),
    totalLots: numeric(raw.total_lots), availableLots: numeric(raw.available_lots), minPrice: numeric(raw.starting_price), area: text(raw.area, "غير محددة"), status,
    featured: Boolean(raw.is_featured), signal: rawStatus === "published" ? "منشور" : rawStatus === "review" || rawStatus === "pending_review" ? "قيد المراجعة" : "مسودة",
  };
}

function normalizeLot(value: unknown, index: number): Lot {
  const raw = record(value); const metadata = record(raw.metadata); const rawStatus = text(raw.status, "available");
  const statuses: Record<string, LotStatus> = { available: "available", reserved: "reserved", sold: "sold", hold: "hold", held: "hold" };
  const polygon = raw.polygon;
  const geometry = typeof polygon === "string" && polygon.startsWith("polygon(") ? polygon : generatedGeometry(index);
  return {
    id: text(raw.id), developmentId: text(raw.development), code: text(raw.lot_number, `قطعة-${index + 1}`), block: text(metadata.block, "—"), area: numeric(raw.area), price: numeric(raw.price), status: statuses[rawStatus] || "hold",
    use: text(raw.usage_type, "سكني"), frontage: numeric(raw.frontage), depth: numeric(metadata.depth), orientation: text(metadata.orientation, "غير محدد"), demandScore: numeric(metadata.demand_score), geometry, notes: text(raw.description),
  };
}

function normalizeInterest(value: unknown, index: number): Interest {
  const raw = record(value); const status = text(raw.status, "new");
  return {
    id: text(raw.id), lotCode: text(raw.lot_number, text(raw.lot, "—")), development: text(raw.development_name, "مخطط استنار"), customer: text(raw.full_name, "مستكشف"), phone: text(raw.phone), email: text(raw.email), source: text(raw.source, "استنار"),
    status: (["new", "contacted", "qualified", "closed"].includes(status) ? status : "new") as Interest["status"], createdAt: text(raw.created_at, "الآن"), budget: numeric(raw.budget, numeric(record(raw.inputs).budget)),
  };
}

function normalizeAnalysis(value: unknown, index: number): Analysis {
  const raw = record(value); const outputs = record(raw.analysis_output);
  return {
    id: text(raw.id), title: text(raw.business_type, "تحليل فرصة"), lotCode: text(raw.lot_number, text(raw.lot_id, "—")), score: numeric(raw.score), verdict: text(raw.recommendation, "نتيجة استرشادية تحتاج مراجعة الفرضيات."),
    createdAt: text(raw.created_at, "الآن"), estimatedRevenue: numeric(outputs.estimated_revenue, numeric(raw.budget) * 1.8), confidence: text(raw.confidence_note, "استكشافي").includes("مرتفع") ? "مرتفع" : text(raw.confidence_note, "").includes("متوسط") ? "متوسط" : "استكشافي",
  };
}

function normalizeMetrics(value: unknown): DashboardMetrics {
  const raw = record(value); const metrics = record(raw.metrics);
  return { views: numeric(raw.views, numeric(metrics.views)), interests: numeric(raw.interests, numeric(metrics.interests)), conversion: numeric(raw.conversion, numeric(metrics.conversion)), availability: numeric(raw.availability, numeric(metrics.availability)), trend: numeric(raw.trend, numeric(metrics.trend)) };
}

export const api = {
  providers: () => withFallback(async () => rawList(await request<unknown[]>("/providers/")).map(normalizeProvider), demoProviders),
  provider: (slug: string) => withFallback(async () => normalizeProvider(await request<unknown>(`/providers/${slug}/`)), demoProviders.find((item) => item.slug === slug) || demoProviders[0]),
  developments: () => withFallback(async () => rawList(await request<unknown[]>("/developments/")).map(normalizeDevelopment), demoDevelopments),
  development: (slug: string) => withFallback(async () => normalizeDevelopment(await request<unknown>(`/developments/${slug}/`)), demoDevelopments.find((item) => item.slug === slug) || demoDevelopments[0]),
  lots: (developmentId?: string | number) => withFallback(
    async () => rawList(await request<unknown[]>(developmentId ? `/lots/?development=${developmentId}` : "/lots/")).map(normalizeLot),
    developmentId ? demoLots.filter((lot) => lot.developmentId === developmentId) : demoLots,
  ),
  lot: (id: string | number) => withFallback(async () => normalizeLot(await request<unknown>(`/lots/${id}/`), 0), demoLots.find((item) => String(item.id) === String(id)) || demoLots[0]),
  favorites: () => withFallback(async () => rawList(await request<unknown[]>("/favorites/")).map(normalizeLot), demoLots.filter((lot) => ["101", "105", "202"].includes(String(lot.id)))),
  analyses: () => withFallback(async () => rawList(await request<unknown[]>("/analyses/")).map(normalizeAnalysis), demoAnalyses),
  interests: () => withFallback(async () => rawList(await request<unknown[]>("/interests/")).map(normalizeInterest), demoInterests),
  providerDashboard: () => withFallback(async () => normalizeMetrics(await request<unknown>("/dashboard/provider/")), demoMetrics),
  adminOverview: () => withFallback(() => request<Record<string, number>>("/admin/overview/"), { providers: 36, developments: 81, users: 1420, pendingReviews: 7 }),
  async createInterest(payload: Record<string, unknown>) {
    return request<Interest>("/interests/", { method: "POST", body: JSON.stringify(payload) });
  },
  async toggleFavorite(lotId: string | number) {
    return request("/favorites/", { method: "POST", body: JSON.stringify({ lot_id: lotId }) });
  },
  async createAnalysis(payload: Record<string, unknown>) {
    return normalizeAnalysis(await request<unknown>("/analyses/", { method: "POST", body: JSON.stringify(payload) }), 0);
  },
  async login(email: string, password: string) {
    const tokens = await request<{ access: string; refresh: string }>("/auth/token/", { method: "POST", body: JSON.stringify({ email, password }) });
    authStore.save(tokens.access, tokens.refresh);
    return tokens;
  },
  me: () => request<{ id: string; email: string; role: string; first_name?: string; last_name?: string }>("/auth/me/"),
  async register(payload: Record<string, unknown>) {
    const result = await request<{ access?: string; refresh?: string }>("/auth/register/", { method: "POST", body: JSON.stringify(payload) });
    if (result.access) authStore.save(result.access, result.refresh);
    return result;
  },
};

export type ApiMode = "live" | "demo";
