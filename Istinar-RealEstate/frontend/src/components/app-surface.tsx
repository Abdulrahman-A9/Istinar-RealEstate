"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowUpLeft, BadgeCheck, BarChart3, BellRing, BookOpenCheck, Building2, Check, ChevronLeft,
  CircleDollarSign, ClipboardCheck, Compass, Copy, Download, Eye, FilePenLine, Filter, Grid2X2, Heart,
  Landmark, LayoutList, LoaderCircle, LockKeyhole, MapPin, MessageSquareMore, PencilLine, Phone, Plus,
  RefreshCw, Search, Send, Settings2, ShieldAlert, Sparkles, TrendingUp, UserCheck, Users, X,
} from "lucide-react";
import { api, authStore } from "@/lib/api";
import { currency, demoAnalyses, demoDevelopments, demoInterests, demoLots, demoMetrics, demoProviders } from "@/lib/demo-data";
import type { Analysis, DashboardMetrics, Development, Interest, Lot, Provider } from "@/lib/types";
import { BackLink, PublicShell, RoleSwitcher, WorkspaceShell } from "@/components/shell";
import { LotPlanCanvas } from "@/components/plan-canvas";
import { Button, EmptyState, InlineDemoNotice, LoadingBlock, StatusChip } from "@/components/ui";

type Mode = "demo" | "live";

function useCatalog() {
  const pathname = usePathname() || "/";
  const [providers, setProviders] = useState<Provider[]>(demoProviders);
  const [developments, setDevelopments] = useState<Development[]>(demoDevelopments);
  const [lots, setLots] = useState<Lot[]>(demoLots);
  const [interests, setInterests] = useState<Interest[]>(demoInterests);
  const [analyses, setAnalyses] = useState<Analysis[]>(demoAnalyses);
  const [metrics, setMetrics] = useState<DashboardMetrics>(demoMetrics);
  const [mode, setMode] = useState<Mode>("demo");
  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState("");

  useEffect(() => {
    let active = true;
    const canLoadProviderDashboard = Boolean(authStore.access && pathname.startsWith("/provider"));
    const protectedRequests = authStore.access
      ? [api.interests(), api.analyses(), api.providerDashboard()]
      : [
          Promise.resolve({ data: demoInterests, mode: "demo" as Mode }),
          Promise.resolve({ data: demoAnalyses, mode: "demo" as Mode }),
          Promise.resolve({ data: demoMetrics, mode: "demo" as Mode }),
        ];
    if (authStore.access && !canLoadProviderDashboard) {
      protectedRequests[2] = Promise.resolve({ data: demoMetrics, mode: "demo" as Mode });
    }
    Promise.allSettled([api.providers(), api.developments(), api.lots(), ...protectedRequests]).then((result) => {
      if (!active) return;
      const [providerResult, developmentResult, lotResult] = result;
      const interestResult = result[3] as PromiseSettledResult<{ data: Interest[]; mode: Mode }>;
      const analysisResult = result[4] as PromiseSettledResult<{ data: Analysis[]; mode: Mode }>;
      const metricResult = result[5] as PromiseSettledResult<{ data: DashboardMetrics; mode: Mode }>;
      const getData = <T,>(entry: PromiseSettledResult<{ data: T; mode: Mode }>, fallback: T) => entry.status === "fulfilled" ? entry.value.data : fallback;
      setProviders(getData(providerResult, demoProviders));
      setDevelopments(getData(developmentResult, demoDevelopments));
      setLots(getData(lotResult, demoLots));
      setInterests(getData(interestResult, demoInterests));
      setAnalyses(getData(analysisResult, demoAnalyses));
      setMetrics(getData(metricResult, demoMetrics));
      const publicResults = [providerResult, developmentResult, lotResult];
      setMode(publicResults.every((entry) => entry.status === "fulfilled" && entry.value.mode === "live") ? "live" : "demo");
      const rejected = result.slice(0, 3).find((entry) => entry.status === "rejected");
      if (rejected?.status === "rejected") setServiceError(rejected.reason instanceof Error ? rejected.reason.message : "تعذر تحميل جزء من البيانات الحية.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [pathname]);

  return { providers, developments, lots, interests, analyses, metrics, mode, loading, serviceError };
}

function TitleBlock({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="section-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1 className="display">{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}

function MetricGrid({ metrics, admin = false }: { metrics: DashboardMetrics; admin?: boolean }) {
  const cells = admin ? [
    ["الشركات النشطة", "36", "+3 هذا الشهر"], ["مخططات منشورة", "81", "+9 هذا الشهر"], ["طلبات جديدة", "126", "+18% أسبوعياً"], ["جاهز للمراجعة", "7", "تحتاج قراراً"],
  ] : [
    ["مشاهدات المخططات", metrics.views.toLocaleString("ar-SA"), `+${metrics.trend}% هذا الشهر`], ["طلبات اهتمام", metrics.interests.toLocaleString("ar-SA"), "+14 هذا الأسبوع"], ["تحويل إلى اهتمام", `${metrics.conversion}%`, "+0.8 نقطة"], ["القطع المتاحة", `${metrics.availability}%`, "من إجمالي المعروض"],
  ];
  return <section className="metric-grid">{cells.map(([label, value, trend], index) => <article className="metric" key={label}><label>{label}</label><strong className="num">{value}</strong><span className={`trend ${index === 3 && admin ? "down" : ""}`}>{trend}</span></article>)}</section>;
}

function DevelopmentTile({ development, wide = false }: { development: Development; wide?: boolean }) {
  return <Link href={`/developments/${development.slug}`} className={`development-tile ${wide ? "" : "sand-tile"}`}>
    <div className="tile-body"><span className="tile-kicker">{development.city} · {development.district}</span><h3>{development.name}</h3><p>{development.description}</p></div>
    <div className="tile-footer"><span><b className="num">{development.availableLots}</b> قطعة متاحة</span><span>من {currency(development.minPrice)} <ArrowLeft size={15} style={{ verticalAlign: "middle" }} /></span></div>
  </Link>;
}

function HomePage({ catalog }: { catalog: ReturnType<typeof useCatalog> }) {
  const featured = catalog.developments.filter((item) => item.featured).slice(0, 2);
  return <>
    <section className="hero">
      <div className="hero-content">
        <span className="eyebrow" style={{ color: "#8ed4c8" }}>الطبقة الذكية بين العرض العقاري والقرار</span>
        <h1 className="display">الأرض أوضح، والقرار <em>أذكى.</em></h1>
        <p>استنار يحوّل المخطط من ملف ثابت إلى تجربة تفاعلية قابلة للقياس: استكشف القطع، افهم الطلب، واتخذ قرارك بثقة.</p>
        <div className="hero-actions"><Link href="/developments" className="button button-primary">استكشف المخططات <ArrowLeft size={17} /></Link><Link href="/register" className="button button-outline">أنت مقدم خدمة؟ ابدأ الآن</Link></div>
      </div>
      <div className="hero-ledger"><span><b className="num">1,420+</b> مستكشف فرصة</span><span><b className="num">81</b> مخطط تفاعلي</span><span><b className="num">4.8%</b> تحويل واضح</span></div>
    </section>
    <InlineDemoNotice mode={catalog.mode} />
    <section style={{ marginTop: 42 }}>
      <div className="section-heading"><div><div className="eyebrow">مخططات مختارة</div><h2 className="display">مساحات تستحق أن تُفهم</h2><p>بيانات دقيقة وسياق واضح قبل التواصل أو الاستثمار.</p></div><Link href="/developments" className="button button-outline">كل المخططات <ChevronLeft size={17} /></Link></div>
      <div className="editorial-grid">{(featured.length ? featured : catalog.developments.slice(0, 2)).map((development, index) => <DevelopmentTile development={development} wide={index === 0} key={development.id} />)}</div>
    </section>
    <section style={{ marginTop: 52 }} className="surface-grid">
      <div className="card card-pad"><div className="split-head"><div><div className="eyebrow">لمقدمي الخدمة</div><h2 className="display" style={{ margin: "6px 0" }}>كل طلب يصبح إشارة</h2></div><BarChart3 color="var(--teal)" size={29} /></div><p className="subtle">انشر مخططك، راقب اهتمام العملاء، وحدد أين يتجه الطلب قبل أن تسعّر أو تطلق حملة جديدة.</p><div className="divider" /><div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}><div><b className="num" style={{ fontSize: 23 }}>126</b><br /><small className="muted">طلب اهتمام</small></div><div><b className="num" style={{ fontSize: 23 }}>18.4K</b><br /><small className="muted">مشاهدة</small></div><div><b className="num" style={{ fontSize: 23 }}>38</b><br /><small className="muted">قطعة متاحة</small></div></div><Link className="button button-dark" href="/provider" style={{ marginTop: 22 }}>شاهد مساحة الشركة</Link></div>
      <div className="aside-stack"><div className="thin-card card-pad"><Sparkles size={21} color="var(--sand)" /><h3 style={{ margin: "9px 0 5px" }}>حلّل فرصة قبل أن تلتزم</h3><p className="subtle" style={{ margin: 0 }}>ابنِ فرضيتك حول الاستخدام، التكلفة، والطلب المحلي. نتائج مفسرة وليست وعوداً غامضة.</p><Link href="/analyze" className="button button-soft button-sm" style={{ marginTop: 15 }}>افتح محلل الفرص</Link></div><div className="thin-card card-pad"><Users size={21} color="var(--teal)" /><h3 style={{ margin: "9px 0 4px" }}>وجهة واحدة لكل الأطراف</h3><p className="subtle" style={{ margin: 0 }}>مقدم الخدمة ينشر ويدير، العميل يستكشف، والمستثمر يختبر الفكرة.</p></div></div>
    </section>
    <section style={{ marginTop: 52 }}><div className="section-heading"><div><div className="eyebrow">شركات موثوقة</div><h2 className="display">عرض عقاري منظم</h2></div><Link href="/providers" className="button button-outline">كل الشركات</Link></div><div className="provider-grid">{catalog.providers.map((provider) => <ProviderCard provider={provider} key={provider.id} />)}</div></section>
    <section style={{ marginTop: 54 }}><RoleSwitcher /></section>
  </>;
}

function ProviderCard({ provider }: { provider: Provider }) {
  return <Link href={`/providers/${provider.slug}`} className="provider-card"><span className="brand-dot" style={{ background: provider.accent }} /><div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 11 }}><div><h3>{provider.name}</h3><p className="subtle" style={{ margin: 0 }}>{provider.city} · {provider.tagline}</p></div>{provider.verified && <BadgeCheck color="var(--teal)" size={19} />}</div><div className="divider" /><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span><b className="num">{provider.developmentCount}</b> مخططات</span><span><b className="num">{provider.activeLots}</b> قطعة نشطة</span></div></Link>;
}

function DirectoryFilters({ placeholder = "ابحث بالاسم أو المدينة" }: { placeholder?: string }) {
  return <div className="filters"><div className="field grow"><label>البحث</label><div style={{ position: "relative" }}><Search size={16} style={{ position: "absolute", right: 11, top: 13, color: "var(--muted)" }} /><input className="input" style={{ paddingRight: 35 }} placeholder={placeholder} /></div></div><div className="field"><label>المدينة</label><select className="select" defaultValue=""><option value="">كل المدن</option><option>حائل</option><option>الرياض</option><option>الجبيل</option></select></div><Button variant="outline"><Filter size={16} /> تصفية</Button></div>;
}

function ProvidersPage({ catalog }: { catalog: ReturnType<typeof useCatalog> }) {
  return <><TitleBlock eyebrow="دليل الشركاء" title="مقدمو خدمة يقدّمون العرض بوضوح" description="شركات تدير مخططاتها وطلبات عملائها عبر استنار." /><DirectoryFilters placeholder="ابحث عن شركة أو مدينة" /><div className="provider-grid" style={{ marginTop: 18 }}>{catalog.providers.map((provider) => <ProviderCard provider={provider} key={provider.id} />)}</div></>;
}

function ProviderProfile({ provider, developments }: { provider: Provider; developments: Development[] }) {
  const related = developments.filter((item) => item.providerId === provider.id);
  return <><BackLink href="/providers">كل مقدمي الخدمة</BackLink><section className="card card-pad" style={{ borderTop: `4px solid ${provider.accent}` }}><div style={{ display: "flex", gap: 16, justifyContent: "space-between", alignItems: "start", flexWrap: "wrap" }}><div><span className="brand-dot" style={{ background: provider.accent }} /><h1 className="display" style={{ fontSize: 42, margin: "11px 0 4px" }}>{provider.name}</h1><p className="subtle">{provider.city} · {provider.tagline} {provider.verified && <BadgeCheck size={16} color="var(--teal)" style={{ verticalAlign: "middle" }} />}</p></div><Button variant="outline"><MessageSquareMore size={17} /> تواصل مع الشركة</Button></div><div className="divider" /><p style={{ maxWidth: 700 }}>{provider.description}</p><div style={{ display: "flex", gap: 26, marginTop: 20 }}><span><b className="num" style={{ fontSize: 24 }}>{provider.developmentCount}</b><br /><small className="muted">مخططات</small></span><span><b className="num" style={{ fontSize: 24 }}>{provider.activeLots}</b><br /><small className="muted">قطعة نشطة</small></span></div></section><section style={{ marginTop: 34 }}><TitleBlock eyebrow="من الشركة" title="مخططات منشورة" />{related.length ? <div className="editorial-grid">{related.map((development, index) => <DevelopmentTile development={development} wide={index === 0} key={development.id} />)}</div> : <EmptyState title="لا توجد مخططات منشورة بعد" description="سيظهر هنا كل ما تقرر الشركة نشره عبر استنار." />}</section></>;
}

function DevelopmentsPage({ catalog }: { catalog: ReturnType<typeof useCatalog> }) {
  return <><TitleBlock eyebrow="استكشاف العرض" title="مخططات قابلة للفهم قبل الاتصال" description="فلتر حسب المدينة أو الاستخدام، ثم ادخل إلى المخطط لتفحص القطع وحالتها." /><DirectoryFilters placeholder="ابحث باسم مخطط أو حي" /><div className="editorial-grid" style={{ marginTop: 18 }}>{catalog.developments.map((development, index) => <DevelopmentTile development={development} wide={index % 3 === 0} key={development.id} />)}</div></>;
}

function LotInterestDialog({ lot, development, onClose }: { lot: Lot | null; development?: Development; onClose: () => void }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  if (!lot) return null;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    const form = new FormData(event.currentTarget); const name = String(form.get("name") || "").trim(); const phone = String(form.get("phone") || "").trim();
    if (name.length < 2 || phone.length < 8) { setError("أدخل الاسم ورقم تواصل صحيحين."); return; }
    try {
      await api.createInterest({ lot_id: lot.id, full_name: name, phone, email: form.get("email"), message: form.get("note"), source: "public_plan" });
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر إرسال الطلب. حاول مرة أخرى.");
    }
  };
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="interest-title"><div className="modal-panel"><button onClick={onClose} className="modal-close" aria-label="إغلاق"><X size={19} /></button>{sent ? <div className="modal-result"><Check size={32} /><h2 id="interest-title">وصل اهتمامك</h2><p>سيتواصل فريق {development?.providerName || "مقدم الخدمة"} معك حول القطعة {lot.code}. احتفظنا بتفاصيل طلبك في مساحة استنار.</p><Button onClick={onClose}>تم</Button></div> : <><span className="eyebrow">طلب اهتمام</span><h2 id="interest-title">القطعة {lot.code}</h2><p className="subtle">{development?.name || "المخطط"} · {currency(lot.price)} · {lot.area} م²</p><form className="form-stack" onSubmit={submit}><div className="field"><label htmlFor="interest-name">الاسم الكامل</label><input id="interest-name" name="name" className="input" autoComplete="name" required /></div><div className="field"><label htmlFor="interest-phone">رقم الجوال</label><input id="interest-phone" name="phone" className="input" inputMode="tel" autoComplete="tel" required /></div><div className="field"><label htmlFor="interest-email">البريد الإلكتروني</label><input id="interest-email" name="email" type="email" className="input" autoComplete="email" /></div><div className="field"><label htmlFor="interest-note">ملاحظة اختيارية</label><textarea id="interest-note" name="note" className="textarea" placeholder="مثلاً: أفضل التواصل مساءً" /></div>{error && <p className="field-error">{error}</p>}<Button type="submit"><Send size={16} /> إرسال الطلب</Button></form></>}</div></div>;
}

function DevelopmentViewer({ development, lots }: { development: Development; lots: Lot[] }) {
  const [interestLot, setInterestLot] = useState<Lot | null>(null);
  const developmentLots = lots.filter((lot) => lot.developmentId === development.id);
  return <><BackLink href="/developments">كل المخططات</BackLink><section className="section-heading"><div><div className="eyebrow">{development.city} · {development.district}</div><h1 className="display">{development.name}</h1><p>{development.description}</p></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><StatusChip tone="teal" dot>{development.signal}</StatusChip><StatusChip tone="sand">{development.type}</StatusChip></div></section><div className="thin-card card-pad" style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 18 }}><span><b className="num">{development.totalLots}</b> قطعة إجمالية</span><span><b className="num">{development.availableLots}</b> قطعة متاحة</span><span>تبدأ من <b>{currency(development.minPrice)}</b></span><span>المساحة <b>{development.area}</b></span></div>{developmentLots.length ? <LotPlanCanvas lots={developmentLots} onInterest={setInterestLot} onFavorite={() => undefined} /> : <EmptyState title="لم تُرسم القطع بعد" description="يجري مقدم الخدمة تجهيز المخطط التفاعلي. يمكنك حفظ الصفحة للرجوع إليها." action={<Button variant="outline">حفظ المخطط</Button>} />}<section className="surface-grid" style={{ marginTop: 24 }}><div className="card card-pad"><div className="split-head"><h2>عن المخطط</h2><BookOpenCheck size={20} color="var(--teal)" /></div><p className="subtle">المعلومات المعروضة أدناه توضح خصائص المخطط كما نشرها مقدم الخدمة. قبل إتمام أي اتفاق، يرجى مراجعة الوثائق والالتزامات النظامية مع مقدم الخدمة.</p><div className="divider" /><div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}><div><small className="muted">الاستخدام</small><br /><b>{development.type}</b></div><div><small className="muted">الحالة</small><br /><b>منشور ومحدّث</b></div><div><small className="muted">الجهة</small><br /><b>{development.providerName}</b></div></div></div><aside className="thin-card card-pad"><h3 style={{ marginTop: 0 }}>تريد أن تقارن؟</h3><p className="subtle">أضف القطع المناسبة ثم شاهدها جنباً إلى جنب وفق المساحة والسعر وإشارة الطلب.</p><Link href="/compare" className="button button-outline">اذهب للمقارنة</Link></aside></section><LotInterestDialog lot={interestLot} development={development} onClose={() => setInterestLot(null)} /></>;
}

function LotDetail({ lot, developments }: { lot: Lot; developments: Development[] }) {
  const development = developments.find((item) => item.id === lot.developmentId);
  const [interestLot, setInterestLot] = useState<Lot | null>(null);
  return <><BackLink href={development ? `/developments/${development.slug}` : "/developments"}>العودة إلى المخطط</BackLink><div className="surface-grid"><section className="card card-pad"><div className="split-head"><div><StatusChip tone={lot.status === "available" ? "green" : "sand"} dot>{lot.status === "available" ? "متاحة" : "غير متاحة الآن"}</StatusChip><h1 className="display" style={{ fontSize: 45, margin: "12px 0 0" }}>القطعة {lot.code}</h1><p className="subtle">{development?.name || "مخطط استنار"} · بلوك {lot.block}</p></div><Button variant="outline"><Heart size={17} /> حفظ</Button></div><div className="divider" /><h2 className="num" style={{ fontSize: 38, margin: "10px 0" }}>{currency(lot.price)}</h2><div className="info-row"><span>المساحة</span><b><span className="num">{lot.area}</span> م²</b></div><div className="info-row"><span>الاستخدام</span><b>{lot.use}</b></div><div className="info-row"><span>الاتجاه</span><b>{lot.orientation}</b></div><div className="info-row"><span>الواجهة × العمق</span><b><span className="num">{lot.frontage} × {lot.depth}</span> م</b></div><Button disabled={lot.status !== "available"} onClick={() => setInterestLot(lot)} style={{ marginTop: 20 }}>أرسل اهتماماً</Button></section><aside className="aside-stack"><div className="thin-card card-pad"><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><div><small className="muted">إشارة الطلب</small><br /><b className="num" style={{ fontSize: 29 }}>{lot.demandScore}<small>/100</small></b></div><TrendingUp color="var(--teal)" size={30} /></div><p className="subtle" style={{ marginBottom: 0 }}>مؤشر سلوكي استرشادي مشتق من تفاعل مستخدمي استنار، وليس تقييماً سعرياً.</p></div><div className="thin-card card-pad"><h3 style={{ marginTop: 0 }}>قبل اتخاذ القرار</h3><ul style={{ paddingInlineStart: 18, color: "var(--muted)", marginBottom: 0 }}><li>راجع صك الملكية ومطابقة الحدود.</li><li>تحقق من القيود التنظيمية.</li><li>تواصل مع مقدم الخدمة للمعاينة.</li></ul></div></aside></div><LotInterestDialog lot={interestLot} development={development} onClose={() => setInterestLot(null)} /></>;
}

function AuthPage({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState("provider");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim(); const password = String(form.get("password") || "");
    if (!email.includes("@") || password.length < 8) { setError("أدخل بريداً صحيحاً وكلمة مرور من 8 أحرف على الأقل."); return; }
    setBusy(true); setError("");
    try {
      let destination = role === "provider" ? "/provider" : "/dashboard";
      if (register) {
        await api.register({ first_name: form.get("name"), email, password, role: role === "provider" ? "provider_owner" : "entrepreneur" });
      } else {
        await api.login(email, password);
        const user = await api.me();
        destination = user.role === "platform_admin" ? "/admin" : ["provider_owner", "provider_staff"].includes(user.role) ? "/provider" : "/dashboard";
      }
      router.push(destination);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر الدخول حالياً. تحقق من بيانات الحساب أو جرّب لاحقاً.");
    } finally { setBusy(false); }
  };
  return <div className="form-shell"><Link href="/" className="brand" aria-label="استنار العقارية"><span className="brand-mark"><i /></span><span className="brand-word">استنار</span></Link><h1 className="display">{register ? "أنشئ مساحة عملك" : "مرحباً بعودتك"}</h1><p>{register ? "ابدأ بشركة عقارية أو حساب استكشاف، ثم أضف مخططك أو ابدأ رحلتك الاستثمارية." : "ادخل إلى المساحة المناسبة لدورك في استنار."}</p>{error && <div className="notice error" role="alert">{error}</div>}<form className="form-stack" onSubmit={submit} style={{ marginTop: error ? 15 : 0 }}>{register && <><div className="field"><label htmlFor="auth-name">الاسم</label><input id="auth-name" name="name" className="input" autoComplete="name" required /></div><div className="field"><label htmlFor="auth-role">أستخدم استنار بصفتي</label><select id="auth-role" className="select" value={role} onChange={(event) => setRole(event.target.value)}><option value="provider">مقدم خدمة عقارية</option><option value="customer">مستكشف أو مستثمر</option></select></div></>}<div className="field"><label htmlFor="auth-email">البريد الإلكتروني</label><input id="auth-email" name="email" type="email" className="input" autoComplete="email" required /></div><div className="field"><label htmlFor="auth-password">كلمة المرور</label><input id="auth-password" name="password" type="password" minLength={8} className="input" autoComplete={register ? "new-password" : "current-password"} required /></div><Button type="submit" disabled={busy}>{busy ? <><LoaderCircle size={16} className="spin" /> جارٍ الإرسال</> : register ? "إنشاء الحساب" : "تسجيل الدخول"}</Button></form><p className="form-footer">{register ? <>لديك حساب بالفعل؟ <Link href="/login" style={{ color: "var(--teal)", fontWeight: 800 }}>تسجيل الدخول</Link></> : <>لا تملك حساباً؟ <Link href="/register" style={{ color: "var(--teal)", fontWeight: 800 }}>أنشئ حساباً</Link></>}</p>{!register && <div className="notice" style={{ marginTop: 16 }}>للعرض التجريبي: <b>owner@najd.local</b> أو <b>investor@istinar.local</b> وكلمة المرور <b>DemoPass123!</b></div>}</div>;
}

function AnalyzePage({ lots }: { lots: Lot[] }) {
  const [result, setResult] = useState<Analysis | null>(null);
  const [selectedLot, setSelectedLot] = useState(String(lots.find((lot) => lot.status === "available")?.id || ""));
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true);
    const lot = lots.find((item) => String(item.id) === selectedLot) || lots[0];
    try {
      const form = new FormData(event.currentTarget);
      const response = await api.createAnalysis({
        lot_id: lot.id,
        business_type: form.get("useCase"),
        budget: form.get("budget"),
        business_model: "direct_operations",
        target_segment: "local_residents",
        project_stage: "exploration",
        inputs: { hypothesis: form.get("hypothesis") },
      });
      setResult(response);
    }
    catch { setResult({ id: Date.now(), title: "تحليل فرصة مبدئي", lotCode: lot.code, score: Math.min(94, lot.demandScore + 3), verdict: "فرضية قابلة للتطوير مع تحقق ميداني من الحركة والتشغيل.", createdAt: "الآن", estimatedRevenue: Math.round(lot.price * 2.2), confidence: "استكشافي" }); }
    finally { setBusy(false); }
  };
  return <><TitleBlock eyebrow="محلل استنار" title="اختبر الفكرة قبل أن تلتزم" description="نقطة بداية لقرار أفضل: وضّح القطعة والاستخدام والميزانية، ثم راجع الافتراضات لا الرقم فقط." /><div className="surface-grid"><section className="card card-pad"><form className="form-stack" onSubmit={submit}><div className="field"><label htmlFor="analysis-lot">القطعة محل الدراسة</label><select id="analysis-lot" className="select" value={selectedLot} onChange={(event) => setSelectedLot(event.target.value)}>{lots.filter((lot) => lot.status === "available").map((lot) => <option value={lot.id} key={lot.id}>{lot.code} · {lot.use} · {currency(lot.price)}</option>)}</select></div><div className="field"><label htmlFor="analysis-use">فكرة الاستخدام</label><select name="useCase" id="analysis-use" className="select" defaultValue="مقهى ومخبوزات"><option>مقهى ومخبوزات</option><option>مطعم سريع</option><option>خدمات طبية</option><option>مكتب أعمال</option><option>استثمار سكني</option></select></div><div className="field"><label htmlFor="analysis-budget">ميزانية التجهيز التقريبية</label><input name="budget" id="analysis-budget" className="input" inputMode="numeric" defaultValue="450000" /></div><div className="field"><label htmlFor="analysis-note">ما الفرضية التي تريد اختبارها؟</label><textarea id="analysis-note" name="hypothesis" className="textarea" placeholder="مثال: هل تكفي حركة الحي لدعم مقهى يومي؟" /></div><div className="notice">النتيجة استرشادية. استنار يوضح منطق التقييم ولا يقدّم ضمان دخل أو توصية استثمارية.</div><Button type="submit" disabled={busy}>{busy ? <><LoaderCircle size={16} className="spin" /> جارٍ التحليل</> : <><Sparkles size={16} /> أنشئ التحليل</>}</Button></form></section><aside className="aside-stack">{result ? <AnalysisResult analysis={result} /> : <div className="thin-card card-pad"><Sparkles size={27} color="var(--sand)" /><h3>كيف يعمل التقييم؟</h3><p className="subtle">نوازن بين خصائص القطعة، مستوى التفاعل داخل استنار، ومدخلاتك التشغيلية. كل عامل يظهر لك بوضوح مع حدوده.</p><div className="divider" /><div className="info-row"><span>الملاءمة المكانية</span><b>مفسرة</b></div><div className="info-row"><span>إشارة الطلب</span><b>سلوكية</b></div><div className="info-row"><span>الافتراضات</span><b>قابلة للتعديل</b></div></div>}<div className="thin-card card-pad"><LockKeyhole size={20} color="var(--teal)" /><h3 style={{ margin: "8px 0 4px" }}>تحليلات Pro</h3><p className="subtle" style={{ margin: 0 }}>مقارنات أعمق وتقارير قابلة للتصدير متاحة ضمن خطتك.</p></div></aside></div></>;
}

function AnalysisResult({ analysis }: { analysis: Analysis }) {
  return <div className="card card-pad"><div style={{ display: "flex", gap: 18, alignItems: "center" }}><div className="analysis-score"><span className="num">{analysis.score}</span></div><div><span className="eyebrow">تقييم الفرصة</span><h3 style={{ margin: "4px 0" }}>{analysis.verdict}</h3><StatusChip tone={analysis.confidence === "مرتفع" ? "green" : "sand"}>{analysis.confidence}</StatusChip></div></div><div className="divider" /><div className="mini-bars"><div className="bar-row"><span>ملاءمة الموقع</span><span className="bar-track"><i style={{ width: `${analysis.score}%` }} /></span><b className="num">{analysis.score}</b></div><div className="bar-row"><span>إشارة الطلب</span><span className="bar-track"><i style={{ width: `${Math.max(52, analysis.score - 8)}%`, background: "var(--sand)" }} /></span><b className="num">{Math.max(52, analysis.score - 8)}</b></div><div className="bar-row"><span>الجدوى المبدئية</span><span className="bar-track"><i style={{ width: `${Math.max(48, analysis.score - 15)}%`, background: "#465a75" }} /></span><b className="num">{Math.max(48, analysis.score - 15)}</b></div></div><div className="divider" /><small className="muted">إيراد سنوي افتراضي</small><br /><b className="num" style={{ fontSize: 23 }}>{currency(analysis.estimatedRevenue)}</b><Button variant="outline" small style={{ width: "100%", marginTop: 16 }}>احفظ التحليل</Button></div>;
}

function ComparePage({ lots }: { lots: Lot[] }) {
  const [selected, setSelected] = useState<Array<string | number>>([101, 105, 202].filter((id) => lots.some((lot) => String(lot.id) === String(id))));
  const choices = lots.filter((lot) => lot.status === "available");
  const compareLots = choices.filter((lot) => selected.includes(lot.id));
  const toggle = (id: string | number) => setSelected((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : prev.length < 3 ? [...prev, id] : prev);
  return <><TitleBlock eyebrow="مقارنة القطع" title="ضع الخيارات جنباً إلى جنب" description="حتى 3 قطع، مع خصائص واضحة وإشارات قابلة للفهم." action={<Link className="button button-soft" href="/analyze"><Sparkles size={16} /> حلّل فرصة</Link>} /><section className="filters"><div className="field grow"><label>اختر قطعاً للمقارنة ({selected.length}/3)</label><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{choices.map((lot) => <button key={lot.id} onClick={() => toggle(lot.id)} className={`chip ${selected.includes(lot.id) ? "teal" : ""}`}>{selected.includes(lot.id) && <Check size={13} />}{lot.code}</button>)}</div></div></section>{compareLots.length ? <div className="table-wrap" style={{ marginTop: 20 }}><table className="data-table"><thead><tr><th>خاصية</th>{compareLots.map((lot) => <th key={lot.id}>القطعة {lot.code}</th>)}</tr></thead><tbody><tr><td>الحالة</td>{compareLots.map((lot) => <td key={lot.id}><StatusChip tone={lot.status === "available" ? "green" : "sand"} dot>{lot.status === "available" ? "متاحة" : "محجوزة"}</StatusChip></td>)}</tr><tr><td>السعر</td>{compareLots.map((lot) => <td key={lot.id}><b>{currency(lot.price)}</b></td>)}</tr><tr><td>المساحة</td>{compareLots.map((lot) => <td key={lot.id}><span className="num">{lot.area}</span> م²</td>)}</tr><tr><td>الواجهة × العمق</td>{compareLots.map((lot) => <td key={lot.id}><span className="num">{lot.frontage} × {lot.depth}</span> م</td>)}</tr><tr><td>الاتجاه</td>{compareLots.map((lot) => <td key={lot.id}>{lot.orientation}</td>)}</tr><tr><td>إشارة الطلب</td>{compareLots.map((lot) => <td key={lot.id}><b className="num" style={{ color: "var(--teal)" }}>{lot.demandScore}/100</b></td>)}</tr><tr><td>الإجراء</td>{compareLots.map((lot) => <td key={lot.id}><Link href={`/lots/${lot.id}`} className="button button-outline button-sm">التفاصيل</Link></td>)}</tr></tbody></table></div> : <EmptyState title="اختر قطعة واحدة على الأقل" description="ابدأ باختيار قطع متاحة من القائمة أعلاه." />}</>;
}

function CustomerDashboard({ section, lots, analyses }: { section: "home" | "favorites" | "analyses"; lots: Lot[]; analyses: Analysis[] }) {
  const favorites = lots.filter((lot) => ["101", "105", "202"].includes(String(lot.id)));
  if (section === "favorites") return <><InlineDemoNotice mode="demo" /><TitleBlock eyebrow="محفوظاتك" title="قطع تريد الرجوع إليها" description="تم حفظها للمقارنة أو تحليل فرصة لاحقاً." action={<Link href="/compare" className="button button-outline">قارن المحفوظات</Link>} />{favorites.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>القطعة</th><th>الاستخدام</th><th>المساحة</th><th>السعر</th><th>إشارة الطلب</th><th></th></tr></thead><tbody>{favorites.map((lot) => <tr key={lot.id}><td><b>{lot.code}</b><br /><small className="muted">بلوك {lot.block}</small></td><td>{lot.use}</td><td><span className="num">{lot.area}</span> م²</td><td>{currency(lot.price)}</td><td><b className="num" style={{ color: "var(--teal)" }}>{lot.demandScore}</b></td><td><Link href={`/lots/${lot.id}`} className="button button-outline button-sm">عرض</Link></td></tr>)}</tbody></table></div> : <EmptyState title="لم تحفظ أي قطعة" description="من أي مخطط، استخدم زر حفظ للمقارنة كي تظهر هنا." action={<Link href="/developments" className="button button-primary">استكشف المخططات</Link>} />}</>;
  if (section === "analyses") return <><TitleBlock eyebrow="سجل القرار" title="تحليلاتي المحفوظة" description="احتفظ بالفرضيات لتراجعها وتطور قرارك مع الوقت." action={<Link href="/analyze" className="button button-primary"><Sparkles size={16} /> تحليل جديد</Link>} /><div style={{ display: "grid", gap: 14 }}>{analyses.map((analysis) => <article className="card card-pad" key={analysis.id}><div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "start", flexWrap: "wrap" }}><div><span className="eyebrow">القطعة {analysis.lotCode}</span><h2 style={{ margin: "4px 0" }}>{analysis.title}</h2><p className="subtle" style={{ margin: 0 }}>{analysis.verdict}</p></div><div style={{ textAlign: "left" }}><b className="num" style={{ fontSize: 29, color: "var(--teal)" }}>{analysis.score}<small>/100</small></b><br /><StatusChip tone={analysis.confidence === "مرتفع" ? "green" : "sand"}>{analysis.confidence}</StatusChip></div></div><div className="divider" /><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><span className="muted">{analysis.createdAt}</span><span>إيراد افتراضي: <b>{currency(analysis.estimatedRevenue)}</b></span><Button variant="outline" small>فتح التحليل</Button></div></article>)}</div></>;
  return <><div className="pro-banner"><div><h3>مساحة قرارك، في مكان واحد</h3><p>لديك 3 تحليلات Pro متبقية هذا الشهر. استخدمها للفرضيات التي تستحق تدقيقاً أعمق.</p><div className="usage-bar"><i /></div></div><Link href="/analyze" className="button button-primary">حلّل فرصة</Link></div><div style={{ marginTop: 24 }}><MetricGrid metrics={{ views: 12, interests: 5, conversion: 3, availability: 9, trend: 2 }} /></div><div className="surface-grid" style={{ marginTop: 22 }}><section className="card card-pad"><div className="split-head"><h2>آخر ما حفظته</h2><Link href="/dashboard/favorites" className="subtle">عرض الكل</Link></div>{favorites.slice(0, 3).map((lot) => <div className="info-row" key={lot.id}><span><b>{lot.code}</b> · {lot.use}<br /><small className="muted"><span className="num">{lot.area}</span> م² · {currency(lot.price)}</small></span><Link href={`/lots/${lot.id}`}><ChevronLeft size={18} /></Link></div>)}</section><aside className="card card-pad"><div className="split-head"><h2>آخر تحليل</h2><Sparkles size={19} color="var(--sand)" /></div>{analyses.slice(0, 1).map((analysis) => <div key={analysis.id}><div style={{ display: "flex", gap: 15, alignItems: "center" }}><div className="analysis-score" style={{ width: 74, height: 74, fontSize: 20, borderWidth: 6 }}>{analysis.score}</div><div><b>{analysis.title}</b><br /><small className="muted">{analysis.verdict}</small></div></div><Link href="/dashboard/analyses" className="button button-outline button-sm" style={{ marginTop: 16 }}>كل التحليلات</Link></div>)}</aside></div></>;
}

function ProviderDashboard({ catalog }: { catalog: ReturnType<typeof useCatalog> }) {
  const today = catalog.interests.filter((interest) => interest.status === "new").slice(0, 3);
  return <><InlineDemoNotice mode={catalog.mode} /><MetricGrid metrics={catalog.metrics} /><div className="surface-grid" style={{ marginTop: 22 }}><section className="card card-pad"><div className="split-head"><div><h2>طلبات تحتاج متابعة</h2><p className="subtle" style={{ margin: 3 }}>رتّب التواصل بناءً على الحداثة والميزانية.</p></div><Link href="/provider/interests" className="button button-outline button-sm">صندوق الطلبات</Link></div><div className="activity-list">{today.map((interest) => <div className="activity-item" key={interest.id}><div className="activity-icon"><MessageSquareMore size={16} /></div><div style={{ flex: 1 }}><p><b>{interest.customer}</b> مهتم بالقطعة <b>{interest.lotCode}</b></p><small>{interest.createdAt} · ميزانية {currency(interest.budget)}</small></div><StatusChip tone="teal" dot>جديد</StatusChip></div>)}</div></section><aside className="aside-stack"><div className="thin-card card-pad"><div className="split-head"><h3>أداء المخططات</h3><TrendingUp size={19} color="var(--green)" /></div><div className="mini-bars"><div className="bar-row"><span>روضة حائل</span><span className="bar-track"><i style={{ width: "82%" }} /></span><b>82</b></div><div className="bar-row"><span>سما الجبيل</span><span className="bar-track"><i style={{ width: "58%", background: "var(--sand)" }} /></span><b>58</b></div><div className="bar-row"><span>قمم الأعمال</span><span className="bar-track"><i style={{ width: "42%", background: "#4e6683" }} /></span><b>42</b></div></div><Link href="/provider/analytics" className="button button-outline button-sm" style={{ marginTop: 16 }}>عرض التحليلات</Link></div><div className="thin-card card-pad"><p className="eyebrow">إجراء موصى به</p><h3 style={{ margin: "5px 0" }}>حدّث حالة 4 قطع</h3><p className="subtle">هناك اهتمام حديث بقطع لا تزال قيد المراجعة. حافظ على دقة العرض أمام العملاء.</p><Link className="button button-soft button-sm" href="/provider/developments/1">فتح المحرر</Link></div></aside></div><section style={{ marginTop: 26 }}><div className="split-head"><h2>مخططاتك</h2><Link href="/provider/developments/new" className="button button-primary button-sm"><Plus size={16} /> مخطط جديد</Link></div><ProviderDevelopmentTable developments={catalog.developments.filter((item) => item.providerId === 1)} /></section></>;
}

function ProviderDevelopmentTable({ developments }: { developments: Development[] }) {
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>المخطط</th><th>الحالة</th><th>القطع المتاحة</th><th>المشاهدات</th><th>الاهتمامات</th><th></th></tr></thead><tbody>{developments.map((development, index) => <tr key={development.id}><td><b>{development.name}</b><br /><small className="muted">{development.city} · {development.type}</small></td><td><StatusChip tone={development.status === "published" ? "green" : "sand"} dot>{development.status === "published" ? "منشور" : "قيد المراجعة"}</StatusChip></td><td><b className="num">{development.availableLots}/{development.totalLots}</b></td><td><span className="num">{(6820 - index * 1470).toLocaleString("ar-SA")}</span></td><td><span className="num">{42 - index * 11}</span></td><td><Link href={`/provider/developments/${development.id}`} className="button button-outline button-sm"><PencilLine size={14} /> إدارة</Link></td></tr>)}</tbody></table></div>;
}

function ProviderDevelopmentsPage({ catalog }: { catalog: ReturnType<typeof useCatalog> }) {
  const own = catalog.developments.filter((item) => item.providerId === 1);
  return <><TitleBlock title="مخططاتك" description="انشر تجربة واضحة، ثم حافظ على دقة القطع والحالات وإشارات الاهتمام." action={<Link href="/provider/developments/new" className="button button-primary"><Plus size={17} /> إنشاء مخطط</Link>} /><DirectoryFilters placeholder="ابحث في مخططات الشركة" />{own.length ? <div style={{ marginTop: 18 }}><ProviderDevelopmentTable developments={own} /></div> : <EmptyState title="لا يوجد مخطط بعد" description="ابدأ بإنشاء مخططك الأول، ثم أضف القطع وارسمها فوق الصورة أو الخريطة." action={<Link href="/provider/developments/new" className="button button-primary">إنشاء مخطط</Link>} />}</>;
}

function ProviderDevelopmentForm({ development }: { development?: Development }) {
  const router = useRouter(); const [saved, setSaved] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaved(true); window.setTimeout(() => router.push(development ? "/provider/developments" : "/provider/developments/1"), 850); };
  return <><BackLink href="/provider/developments">كل المخططات</BackLink><TitleBlock eyebrow={development ? "محرر المخطط" : "مخطط جديد"} title={development ? development.name : "ابدأ بمعلومات واضحة"} description="يمكنك تعديل هذه التفاصيل لاحقاً. الخطوة التالية هي إضافة القطع ورسمها." /><div className="surface-grid"><section className="card card-pad"><form className="form-stack" onSubmit={submit}><div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 14 }}><div className="field"><label htmlFor="dev-name">اسم المخطط</label><input id="dev-name" className="input" defaultValue={development?.name} placeholder="مثال: روضة حائل" required /></div><div className="field"><label htmlFor="dev-type">الاستخدام</label><select id="dev-type" className="select" defaultValue={development?.type || "سكني"}><option>سكني</option><option>تجاري</option><option>متعدد الاستخدام</option></select></div><div className="field"><label htmlFor="dev-city">المدينة</label><input id="dev-city" className="input" defaultValue={development?.city} placeholder="المدينة" required /></div><div className="field"><label htmlFor="dev-district">الحي</label><input id="dev-district" className="input" defaultValue={development?.district} placeholder="الحي أو المنطقة" required /></div></div><div className="field"><label htmlFor="dev-description">وصف موجز</label><textarea id="dev-description" className="textarea" defaultValue={development?.description} placeholder="ما الذي يميز المخطط؟" required /></div><div className="field"><label htmlFor="dev-cover">صورة/مخطط مرجعي</label><input id="dev-cover" type="file" className="input" accept="image/*,.pdf" /><small className="muted">ستُستخدم كمرجع للرسم. لا تُنشر حتى تُراجع التصميم.</small></div><div className="notice">في النسخة الأولى، ارسم القطع فوق مرجع المخطط وحدد السعر والحالة يدوياً. يدعم الاستيراد الجغرافي لاحقاً.</div>{saved && <div className="notice">تم حفظ المسودة. يجري فتح محرر القطع…</div>}<Button type="submit"><Check size={16} /> {development ? "حفظ التعديلات" : "حفظ والانتقال للقطع"}</Button></form></section><aside className="aside-stack"><div className="thin-card card-pad"><span className="eyebrow">دليل الإعداد</span><h3>من ملف إلى تجربة بيع</h3><ol style={{ paddingInlineStart: 19, color: "var(--muted)", marginBottom: 0 }}><li>أدخل هوية المخطط.</li><li>أضف القطع وخصائصها.</li><li>ارسم حدود كل قطعة.</li><li>انشر الرابط العام.</li></ol></div><div className="thin-card card-pad"><ShieldAlert size={20} color="var(--sand)" /><h3 style={{ margin: "8px 0 4px" }}>قبل النشر</h3><p className="subtle" style={{ margin: 0 }}>تحقق من حدود القطع والأسعار وحالة التوفر. العميل يرى ما تنشره مباشرة.</p></div></aside></div></>;
}

function ProviderEditor({ development, lots }: { development: Development; lots: Lot[] }) {
  const [active, setActive] = useState("lots"); const [saved, setSaved] = useState(false);
  const ownLots = lots.filter((lot) => lot.developmentId === development.id);
  return <><BackLink href="/provider/developments">العودة للمخططات</BackLink><div className="section-heading"><div><div className="eyebrow">محرر المخطط</div><h1 className="display">{development.name}</h1><p>{development.city} · {development.type} · آخر حفظ منذ 3 دقائق</p></div><div style={{ display: "flex", gap: 8 }}><Button variant="outline" onClick={() => setSaved(true)}><Copy size={16} /> حفظ مسودة</Button><Link className="button button-primary" href={`/developments/${development.slug}`}><Eye size={16} /> معاينة عامة</Link></div></div>{saved && <div className="notice" style={{ marginBottom: 16 }}>تم حفظ المسودة محلياً. عند اتصال الخادم، ستنتقل التعديلات إلى API.</div>}<div className="segmented" style={{ marginBottom: 16 }}><button className={active === "lots" ? "active" : ""} onClick={() => setActive("lots")}>القطع</button><button className={active === "setup" ? "active" : ""} onClick={() => setActive("setup")}>بيانات المخطط</button><button className={active === "publish" ? "active" : ""} onClick={() => setActive("publish")}>النشر</button></div>{active === "lots" ? <div className="surface-grid"><section className="card card-pad"><div className="split-head"><div><h2>قطع المخطط</h2><p className="subtle" style={{ margin: 3 }}>تغيير الحالة والسعر ينعكس على تجربة العميل.</p></div><Button small><Plus size={15} /> قطعة</Button></div><div className="table-wrap"><table className="data-table"><thead><tr><th>القطعة</th><th>المساحة</th><th>السعر</th><th>الحالة</th><th>إشارة الطلب</th><th></th></tr></thead><tbody>{ownLots.map((lot) => <tr key={lot.id}><td><b>{lot.code}</b><br /><small className="muted">بلوك {lot.block}</small></td><td><span className="num">{lot.area}</span> م²</td><td>{currency(lot.price)}</td><td><StatusChip tone={lot.status === "available" ? "green" : lot.status === "reserved" ? "sand" : "red"} dot>{lot.status === "available" ? "متاحة" : lot.status === "reserved" ? "محجوزة" : "معلقة"}</StatusChip></td><td><b className="num">{lot.demandScore}</b></td><td><button className="button button-outline button-sm"><PencilLine size={14} /> تعديل</button></td></tr>)}</tbody></table></div></section><aside className="thin-card card-pad"><h3>دقة المخطط</h3><p className="subtle">تم ربط {ownLots.length} قطع بالرسم التفاعلي. كل قطعة تظهر للعميل بحالة واضحة.</p><div className="divider" /><div className="info-row"><span>متاحة</span><b className="num">{ownLots.filter((lot) => lot.status === "available").length}</b></div><div className="info-row"><span>محجوزة</span><b className="num">{ownLots.filter((lot) => lot.status === "reserved").length}</b></div><div className="info-row"><span>مباعة/معلقة</span><b className="num">{ownLots.filter((lot) => lot.status === "sold" || lot.status === "hold").length}</b></div></aside></div> : active === "setup" ? <ProviderDevelopmentForm development={development} /> : <div className="surface-grid"><section className="card card-pad"><h2>رابط المخطط العام</h2><p className="subtle">شارك هذا الرابط عند جاهزية المخطط. لا يظهر للمستكشفين قبل النشر.</p><div style={{ display: "flex", gap: 8 }}><input className="input" readOnly value={`istinar.sa/developments/${development.slug}`} /><Button variant="outline"><Copy size={16} /> نسخ</Button></div><div className="divider" /><label style={{ display: "flex", gap: 10, alignItems: "center" }}><input type="checkbox" defaultChecked /> السماح بتلقي طلبات اهتمام</label><Button style={{ marginTop: 20 }}>نشر التغييرات</Button></section><aside className="thin-card card-pad"><h3>فحص النشر</h3><div className="info-row"><span>البيانات الأساسية</span><StatusChip tone="green">مكتملة</StatusChip></div><div className="info-row"><span>القطع المرسومة</span><StatusChip tone="green">مكتملة</StatusChip></div><div className="info-row"><span>مراجعة المحتوى</span><StatusChip tone="sand">بانتظار المراجعة</StatusChip></div></aside></div>}</>;
}

const interestMeta: Record<Interest["status"], { label: string; tone: "teal" | "sand" | "green" | "red" }> = { new: { label: "جديد", tone: "teal" }, contacted: { label: "تم التواصل", tone: "sand" }, qualified: { label: "مؤهل", tone: "green" }, closed: { label: "مغلق", tone: "red" } };

function ProviderInterestsPage({ interests }: { interests: Interest[] }) {
  const [activeId, setActiveId] = useState<string | number | null>(interests[0]?.id || null);
  const active = interests.find((interest) => interest.id === activeId) || interests[0];
  return <><TitleBlock title="طلبات اهتمام قابلة للمتابعة" description="تنظيم بسيط يضع بيانات العميل والسياق والخطوة التالية في مكان واحد." action={<Button variant="outline"><Download size={16} /> تصدير</Button>} /><div className="filters"><div className="field grow"><label>ابحث في الطلبات</label><input className="input" placeholder="الاسم، القطعة أو رقم الجوال" /></div><div className="field"><label>الحالة</label><select className="select"><option>كل الحالات</option><option>جديد</option><option>تم التواصل</option><option>مؤهل</option></select></div><Button variant="outline"><Filter size={16} /> تصفية</Button></div>{interests.length ? <div className="interest-layout" style={{ marginTop: 18 }}><section className="card interest-list">{interests.map((interest) => { const meta = interestMeta[interest.status]; return <button className={`interest-row ${active?.id === interest.id ? "active" : ""}`} onClick={() => setActiveId(interest.id)} key={interest.id}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b>{interest.customer}</b><StatusChip tone={meta.tone} dot>{meta.label}</StatusChip></div><span>القطعة {interest.lotCode} · {interest.development}</span><small>{interest.createdAt}</small></button>; })}</section>{active && <InterestDetail interest={active} />}</div> : <EmptyState title="لا توجد طلبات بعد" description="عندما يرسل مستكشف اهتمامه بقطعة، ستجد البيانات وخطوات المتابعة هنا." />}</>;
}

function InterestDetail({ interest }: { interest: Interest }) {
  const [status, setStatus] = useState<Interest["status"]>(interest.status);
  const meta = interestMeta[status];
  return <aside className="card card-pad"><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }}><div><span className="eyebrow">طلب اهتمام</span><h2 style={{ margin: "4px 0" }}>{interest.customer}</h2><StatusChip tone={meta.tone} dot>{meta.label}</StatusChip></div><button className="button button-outline button-icon button-sm" aria-label="المزيد"><Settings2 size={16} /></button></div><div className="divider" /><div className="info-row"><span><Phone size={15} /> الجوال</span><b dir="ltr">{interest.phone}</b></div><div className="info-row"><span>البريد</span><b dir="ltr">{interest.email}</b></div><div className="info-row"><span>القطعة</span><b>{interest.lotCode} · {interest.development}</b></div><div className="info-row"><span>الميزانية</span><b>{currency(interest.budget)}</b></div><div className="info-row"><span>المصدر</span><b>{interest.source}</b></div><div className="divider" /><div className="field"><label htmlFor="interest-status">حرّك الطلب</label><select id="interest-status" className="select" value={status} onChange={(event) => setStatus(event.target.value as Interest["status"])}><option value="new">جديد</option><option value="contacted">تم التواصل</option><option value="qualified">مؤهل</option><option value="closed">مغلق</option></select></div><div className="field" style={{ marginTop: 12 }}><label htmlFor="interest-internal-note">ملاحظة داخلية</label><textarea id="interest-internal-note" className="textarea" placeholder="ما الخطوة التالية؟" /></div><Button style={{ width: "100%", marginTop: 15 }}><Check size={16} /> حفظ المتابعة</Button></aside>;
}

function ProviderAnalyticsPage({ metrics, developments }: { metrics: DashboardMetrics; developments: Development[] }) {
  const own = developments.filter((item) => item.providerId === 1);
  return <><TitleBlock title="الطلب كما يحدث فعلاً" description="راقب أين يذهب الاهتمام، ثم قرر ما تحتاج إلى تحديثه أو عرضه بطريقة أوضح." action={<Button variant="outline"><Download size={16} /> تقرير الشهر</Button>} /><MetricGrid metrics={metrics} /><div className="surface-grid" style={{ marginTop: 22 }}><section className="card card-pad"><div className="split-head"><div><h2>الاهتمام خلال 7 أيام</h2><p className="subtle" style={{ margin: 3 }}>طلبات الاهتمام مقابل مشاهدات المخطط.</p></div><div className="segmented"><button className="active">7 أيام</button><button>30 يوماً</button></div></div><div className="line-chart" aria-label="رسم بياني لاتجاه الاهتمام"><div className="chart-grid"><i /><i /><i /><i /></div><svg viewBox="0 0 700 200" preserveAspectRatio="none" role="img" aria-label="اتجاه صاعد"><polyline points="0,172 100,148 195,160 285,95 375,126 470,62 570,90 700,25" fill="none" stroke="#08766f" strokeWidth="5" /><polyline points="0,185 100,170 195,173 285,154 375,145 470,132 570,143 700,110" fill="none" stroke="#b17a38" strokeWidth="3" strokeDasharray="7 7" /></svg><div className="chart-labels"><span>السبت</span><span>الأحد</span><span>الاثنين</span><span>الثلاثاء</span><span>الأربعاء</span><span>الخميس</span><span>الجمعة</span></div></div><div style={{ display: "flex", gap: 20, marginTop: 13, fontSize: 12 }}><span className="legend-item"><i style={{ background: "var(--teal)" }} /> طلبات اهتمام</span><span className="legend-item"><i style={{ background: "var(--sand)" }} /> مشاهدات</span></div></section><aside className="thin-card card-pad"><h3 style={{ marginTop: 0 }}>إشارة تستحق الانتباه</h3><div className="analysis-score" style={{ width: 82, height: 82, fontSize: 22, margin: "12px 0" }}>+18%</div><p className="subtle">ارتفع الاهتمام بقطع الواجهة الشمالية في روضة حائل خلال 7 أيام. راجع حالة القطع القريبة وأسعارها قبل حملتك التالية.</p><Link href="/provider/developments/1" className="button button-soft button-sm">فتح المخطط</Link></aside></div><section style={{ marginTop: 24 }}><div className="split-head"><h2>أداء كل مخطط</h2><span className="subtle">آخر 30 يوماً</span></div><div className="table-wrap"><table className="data-table"><thead><tr><th>المخطط</th><th>مشاهدات</th><th>حفظ</th><th>طلبات اهتمام</th><th>تحويل</th><th>إشارة</th></tr></thead><tbody>{own.map((development, index) => <tr key={development.id}><td><b>{development.name}</b><br /><small className="muted">{development.city}</small></td><td><span className="num">{(6820 - index * 1630).toLocaleString("ar-SA")}</span></td><td><span className="num">{321 - index * 57}</span></td><td><span className="num">{42 - index * 9}</span></td><td><b className="num">{(4.8 - index * .7).toFixed(1)}%</b></td><td><StatusChip tone={index === 0 ? "green" : "sand"}>{index === 0 ? "صاعد" : "مستقر"}</StatusChip></td></tr>)}</tbody></table></div></section></>;
}

function ProviderSettingsPage() {
  const [saved, setSaved] = useState(false);
  return <><TitleBlock title="الشركة والفريق" description="الهوية التي يراها العميل، والأشخاص الذين يديرون البيانات خلفها." /><div className="surface-grid"><section className="card card-pad"><div className="split-head"><h2>ملف الشركة العام</h2><StatusChip tone="green" dot>موثق</StatusChip></div><form className="form-stack" onSubmit={(event) => { event.preventDefault(); setSaved(true); }}><div className="field"><label htmlFor="company-name">اسم الشركة</label><input id="company-name" className="input" defaultValue="رؤية الأرض للتطوير" /></div><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}><div className="field"><label htmlFor="company-city">المدينة الرئيسية</label><input id="company-city" className="input" defaultValue="حائل" /></div><div className="field"><label htmlFor="company-phone">رقم التواصل</label><input id="company-phone" className="input" dir="ltr" defaultValue="050 000 0000" /></div></div><div className="field"><label htmlFor="company-about">نبذة عامة</label><textarea id="company-about" className="textarea" defaultValue="شركة تطوير محلية تركّز على المجتمعات السكنية المتوازنة والمخططات القابلة للحياة." /></div>{saved && <div className="notice">تم حفظ التغييرات.</div>}<Button type="submit">حفظ الملف العام</Button></form></section><aside className="aside-stack"><div className="thin-card card-pad"><div className="split-head"><h3>الفريق والصلاحيات</h3><Button small variant="outline"><Plus size={14} /> دعوة</Button></div>{[["مريم الشمري", "مالكة", "مر"], ["سلمان القحطاني", "مدير مخططات", "سل"], ["هند الفهيد", "متابعة عملاء", "هف"]].map(([name, role, initials]) => <div className="activity-item" key={name}><div className="avatar">{initials}</div><div><p><b>{name}</b></p><small>{role}</small></div></div>)}</div><div className="thin-card card-pad"><h3 style={{ marginTop: 0 }}>إعدادات الظهور</h3><label style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 12 }}><input type="checkbox" defaultChecked /> إظهار الشركة في الدليل العام</label><label style={{ display: "flex", gap: 9, alignItems: "center" }}><input type="checkbox" defaultChecked /> استقبال طلبات الاهتمام بالبريد</label></div></aside></div></>;
}

function ProviderBillingPage() {
  return <><TitleBlock title="الخطة والفوترة" description="استخدم ما تحتاجه الآن، وتابع استخدامك قبل أن توسّع فريقك أو مخططاتك." /><div className="surface-grid"><section className="card card-pad"><span className="eyebrow">الخطة الحالية</span><h2 className="display" style={{ fontSize: 39, margin: "7px 0" }}>فريق</h2><p className="subtle">للشركات التي تدير أكثر من مخطط وتحتاج متابعة طلبات وتحليلات أوسع.</p><div className="divider" /><div className="info-row"><span>المقاعد</span><b><span className="num">3</span> من 5 مستخدمين</b></div><div className="info-row"><span>المخططات المنشورة</span><b><span className="num">2</span> من 10</b></div><div className="info-row"><span>تحليلات Pro</span><b><span className="num">12</span> من 20 هذا الشهر</b></div><Button style={{ marginTop: 20 }}>ترقية الخطة</Button></section><aside className="aside-stack"><div className="thin-card card-pad"><CircleDollarSign color="var(--teal)" size={22} /><h3 style={{ margin: "8px 0 3px" }}>الفوترة القادمة</h3><p className="subtle" style={{ margin: 0 }}>15 أغسطس 2026</p><b style={{ display: "block", fontSize: 23, marginTop: 7 }}>{currency(749)} / شهرياً</b></div><div className="thin-card card-pad"><h3 style={{ marginTop: 0 }}>آخر الفواتير</h3><div className="info-row"><span>15 يوليو 2026</span><Button small variant="outline">PDF</Button></div><div className="info-row"><span>15 يونيو 2026</span><Button small variant="outline">PDF</Button></div></div></aside></div></>;
}

function AdminHome({ catalog }: { catalog: ReturnType<typeof useCatalog> }) {
  const [overview, setOverview] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    if (!authStore.access) return;
    api.adminOverview().then((result) => setOverview(result.data)).catch(() => undefined);
  }, []);
  return <><InlineDemoNotice mode={catalog.mode} /><MetricGrid metrics={catalog.metrics} admin /><div className="surface-grid" style={{ marginTop: 22 }}><section className="card card-pad"><div className="split-head"><div><h2>قائمة المراجعة</h2><p className="subtle" style={{ margin: 3 }}>تحتاج هذه العناصر قراراً قبل أن تؤثر في تجربة المنصة.</p></div><StatusChip tone="sand" dot>{overview?.pendingReviews || 7} عناصر</StatusChip></div><div className="activity-list">{[["مراجعة مخطط المدار", "محتوى وصف المخطط يحتاج تأكيداً قبل النشر", "مراجعة"], ["توثيق شركة وسيط الشمال", "المستندات وصلت وتنتظر اعتماداً", "تحقق"], ["تنبيه جودة بيانات", "4 قطع لا تملك سعراً منشوراً", "بيانات"]].map(([title, description, tag]) => <div className="activity-item" key={title}><div className="activity-icon"><ClipboardCheck size={16} /></div><div style={{ flex: 1 }}><p><b>{title}</b></p><small>{description}</small></div><Button small variant="outline">{tag}</Button></div>)}</div></section><aside className="aside-stack"><div className="thin-card card-pad"><div className="split-head"><h3>سلامة المنصة</h3><StatusChip tone="green" dot>سليم</StatusChip></div><div className="info-row"><span>API</span><b>متاح</b></div><div className="info-row"><span>خدمة المهام</span><b>طبيعي</b></div><div className="info-row"><span>آخر نسخة بيانات</span><b>منذ 8 دقائق</b></div></div><div className="thin-card card-pad"><BellRing size={20} color="var(--sand)" /><h3 style={{ margin: "8px 0 4px" }}>ملاحظة نمو</h3><p className="subtle" style={{ margin: 0 }}>طلبات الاهتمام ارتفعت 18% هذا الأسبوع، مع نمو أكبر في المخططات التجارية.</p></div></aside></div><section style={{ marginTop: 26 }}><div className="split-head"><h2>آخر النشاطات</h2><span className="subtle">آخر 24 ساعة</span></div><div className="table-wrap"><table className="data-table"><thead><tr><th>الوقت</th><th>الحدث</th><th>الجهة</th><th>المستخدم</th><th>الحالة</th></tr></thead><tbody>{[["10:24", "تحليل فرصة جديد", "قمم للأعمال", "مستثمر", "سليم"], ["09:41", "تحديث حالة قطعة", "رؤية الأرض", "مريم الشمري", "سليم"], ["09:08", "شركة جديدة", "وسيط الشمال", "فريق المنصة", "بانتظار التحقق"]].map(([time, event, entity, user, status]) => <tr key={`${time}-${event}`}><td className="num">{time}</td><td><b>{event}</b></td><td>{entity}</td><td>{user}</td><td><StatusChip tone={status === "سليم" ? "green" : "sand"}>{status}</StatusChip></td></tr>)}</tbody></table></div></section></>;
}

function AdminProvidersPage({ providers }: { providers: Provider[] }) {
  const [query, setQuery] = useState("");
  const filtered = providers.filter((provider) => provider.name.includes(query) || provider.city.includes(query));
  return <><TitleBlock title="الشركات" description="المصدر الموثوق للعرض العقاري، مع حالة التحقق ومستوى النشاط." action={<Button variant="outline"><Download size={16} /> تصدير</Button>} /><div className="filters"><div className="field grow"><label>بحث</label><input value={query} onChange={(event) => setQuery(event.target.value)} className="input" placeholder="اسم الشركة أو المدينة" /></div><div className="field"><label>الحالة</label><select className="select"><option>كل الحالات</option><option>موثقة</option><option>بانتظار التحقق</option></select></div></div><div className="table-wrap" style={{ marginTop: 18 }}><table className="data-table"><thead><tr><th>الشركة</th><th>المدينة</th><th>الحالة</th><th>المخططات</th><th>القطع النشطة</th><th>إجراء</th></tr></thead><tbody>{filtered.map((provider) => <tr key={provider.id}><td><b>{provider.name}</b><br /><small className="muted">{provider.tagline}</small></td><td>{provider.city}</td><td><StatusChip tone={provider.verified ? "green" : "sand"} dot>{provider.verified ? "موثقة" : "بانتظار التحقق"}</StatusChip></td><td className="num">{provider.developmentCount}</td><td className="num">{provider.activeLots}</td><td><Button small variant="outline">إدارة</Button></td></tr>)}</tbody></table></div></>;
}

function AdminDevelopmentsPage({ developments }: { developments: Development[] }) {
  const [view, setView] = useState<"list" | "review">("list");
  return <><TitleBlock title="مراجعة المخططات" description="تحقق من جودة المحتوى والبيانات قبل أن يرى المستكشفون أي عرض." action={<div className="segmented"><button onClick={() => setView("list")} className={view === "list" ? "active" : ""}><LayoutList size={14} /> الكل</button><button onClick={() => setView("review")} className={view === "review" ? "active" : ""}><ShieldAlert size={14} /> للمراجعة</button></div>} /><div className="table-wrap"><table className="data-table"><thead><tr><th>المخطط</th><th>الشركة</th><th>القطع</th><th>الحالة</th><th>الإشارة</th><th></th></tr></thead><tbody>{developments.filter((development) => view === "list" || development.status === "review").map((development) => <tr key={development.id}><td><b>{development.name}</b><br /><small className="muted">{development.city} · {development.type}</small></td><td>{development.providerName}</td><td><span className="num">{development.availableLots}/{development.totalLots}</span></td><td><StatusChip tone={development.status === "published" ? "green" : "sand"} dot>{development.status === "published" ? "منشور" : "قيد المراجعة"}</StatusChip></td><td>{development.signal}</td><td><Button small variant="outline">مراجعة</Button></td></tr>)}</tbody></table></div></>;
}

function AdminUsersPage() {
  const users = [["مريم الشمري", "maryam@najd.local", "مالكة شركة", "نشط", "اليوم"], ["أحمد السالم", "investor@istinar.local", "مستثمر", "نشط", "أمس"], ["سارة الحربي", "sara@example.com", "عميلة", "نشط", "أمس"], ["فهد الشهري", "fahad@example.com", "مقدم خدمة", "معلّق", "10 يوليو"]];
  return <><TitleBlock title="المستخدمون" description="الأدوار وحالة الوصول عبر المنصة." action={<Button variant="outline"><Users size={16} /> دعوة مشرف</Button>} /><div className="filters"><div className="field grow"><label>بحث</label><input className="input" placeholder="اسم أو بريد إلكتروني" /></div><div className="field"><label>الدور</label><select className="select"><option>كل الأدوار</option><option>مقدم خدمة</option><option>مستثمر</option><option>عميل</option></select></div></div><div className="table-wrap" style={{ marginTop: 18 }}><table className="data-table"><thead><tr><th>المستخدم</th><th>الدور</th><th>الحالة</th><th>آخر نشاط</th><th></th></tr></thead><tbody>{users.map(([name, email, role, status, last]) => <tr key={email}><td><b>{name}</b><br /><small className="muted" dir="ltr">{email}</small></td><td>{role}</td><td><StatusChip tone={status === "نشط" ? "green" : "red"} dot>{status}</StatusChip></td><td>{last}</td><td><Button variant="outline" small>عرض</Button></td></tr>)}</tbody></table></div></>;
}

function AdminSubscriptionsPage() {
  const subscriptions = [["رؤية الأرض للتطوير", "فريق", "749 ر.س", "نشطة", "15 أغسطس"], ["نسيج العقارية", "Pro", "1,490 ر.س", "نشطة", "01 أغسطس"], ["وسيط الشمال", "أساسية", "249 ر.س", "تجريبية", "22 يوليو"]];
  return <><TitleBlock title="الاشتراكات والفوترة" description="نظرة تشغيلية على الخطط والحالة والتجديدات القادمة." action={<Button variant="outline"><Download size={16} /> تقرير الإيراد</Button>} /><MetricGrid metrics={demoMetrics} admin /><section style={{ marginTop: 24 }} className="table-wrap"><table className="data-table"><thead><tr><th>الشركة</th><th>الخطة</th><th>المبلغ الشهري</th><th>الحالة</th><th>التجديد</th><th></th></tr></thead><tbody>{subscriptions.map(([company, plan, amount, state, renewal]) => <tr key={company}><td><b>{company}</b></td><td>{plan}</td><td>{amount}</td><td><StatusChip tone={state === "نشطة" ? "green" : "sand"} dot>{state}</StatusChip></td><td>{renewal}</td><td><Button small variant="outline">التفاصيل</Button></td></tr>)}</tbody></table></section></>;
}

function NotFoundPage() {
  return <div className="form-shell" style={{ textAlign: "center" }}><Compass size={38} color="var(--teal)" /><h1 className="display">لم نجد هذه المساحة</h1><p>قد يكون الرابط تغير أو أن الصفحة غير متاحة لحسابك.</p><Link href="/" className="button button-primary">العودة إلى استنار</Link></div>;
}

export default function AppSurface() {
  const pathname = usePathname() || "/";
  const catalog = useCatalog();
  const parts = pathname.split("/").filter(Boolean);
  const apiWarning = catalog.serviceError ? <div className="notice error" role="alert" style={{ marginBottom: 16 }}>تعذر تحميل بعض بيانات الخادم: {catalog.serviceError}</div> : null;
  const publicContent = (() => {
    if (pathname === "/") return <HomePage catalog={catalog} />;
    if (pathname === "/providers") return <ProvidersPage catalog={catalog} />;
    if (parts[0] === "providers" && parts[1]) { const provider = catalog.providers.find((item) => item.slug === parts[1]); return provider ? <ProviderProfile provider={provider} developments={catalog.developments} /> : <NotFoundPage />; }
    if (pathname === "/developments") return <DevelopmentsPage catalog={catalog} />;
    if (parts[0] === "developments" && parts[1]) { const development = catalog.developments.find((item) => item.slug === parts[1]); return development ? <DevelopmentViewer development={development} lots={catalog.lots} /> : <NotFoundPage />; }
    if (parts[0] === "lots" && parts[1]) { const lot = catalog.lots.find((item) => String(item.id) === parts[1]); return lot ? <LotDetail lot={lot} developments={catalog.developments} /> : <NotFoundPage />; }
    if (pathname === "/login") return <AuthPage />;
    if (pathname === "/register") return <AuthPage register />;
    if (pathname === "/analyze") return <AnalyzePage lots={catalog.lots} />;
    if (pathname === "/compare") return <ComparePage lots={catalog.lots} />;
    return <NotFoundPage />;
  })();

  if (pathname.startsWith("/provider")) {
    let content: ReactNode;
    if (pathname === "/provider") content = <ProviderDashboard catalog={catalog} />;
    else if (pathname === "/provider/developments") content = <ProviderDevelopmentsPage catalog={catalog} />;
    else if (pathname === "/provider/developments/new") content = <ProviderDevelopmentForm />;
    else if (parts[1] === "developments" && parts[2]) { const development = catalog.developments.find((item) => String(item.id) === parts[2]); content = development ? <ProviderEditor development={development} lots={catalog.lots} /> : <NotFoundPage />; }
    else if (pathname === "/provider/interests") content = <ProviderInterestsPage interests={catalog.interests} />;
    else if (pathname === "/provider/analytics") content = <ProviderAnalyticsPage metrics={catalog.metrics} developments={catalog.developments} />;
    else if (pathname === "/provider/settings") content = <ProviderSettingsPage />;
    else if (pathname === "/provider/billing") content = <ProviderBillingPage />;
    else content = <NotFoundPage />;
    return <WorkspaceShell pathname={pathname} kind="provider">{apiWarning}{content}</WorkspaceShell>;
  }
  if (pathname.startsWith("/dashboard")) {
    const section = pathname === "/dashboard/favorites" ? "favorites" : pathname === "/dashboard/analyses" ? "analyses" : "home";
    return <WorkspaceShell pathname={pathname} kind="customer">{apiWarning}<CustomerDashboard section={section} lots={catalog.lots} analyses={catalog.analyses} /></WorkspaceShell>;
  }
  if (pathname.startsWith("/admin")) {
    let content: ReactNode;
    if (pathname === "/admin") content = <AdminHome catalog={catalog} />;
    else if (pathname === "/admin/providers") content = <AdminProvidersPage providers={catalog.providers} />;
    else if (pathname === "/admin/developments") content = <AdminDevelopmentsPage developments={catalog.developments} />;
    else if (pathname === "/admin/users") content = <AdminUsersPage />;
    else if (pathname === "/admin/subscriptions") content = <AdminSubscriptionsPage />;
    else content = <NotFoundPage />;
    return <WorkspaceShell pathname={pathname} kind="admin">{apiWarning}{content}</WorkspaceShell>;
  }
  return <PublicShell pathname={pathname}>{apiWarning}{catalog.loading && pathname !== "/" ? <LoadingBlock rows={5} /> : publicContent}</PublicShell>;
}
