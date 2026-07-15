"use client";

import Link from "next/link";
import { BarChart3, Building2, ChevronLeft, CircleUserRound, Compass, FileBarChart, Heart, LayoutDashboard, Map, Menu, ShieldCheck, Sparkles, Users } from "lucide-react";
import type { ReactNode } from "react";

const publicLinks = [
  ["/developments", "المخططات"], ["/providers", "مقدمو الخدمة"], ["/analyze", "حلّل فرصة"], ["/compare", "المقارنة"],
];

export function Brand() {
  return <span className="brand"><span className="brand-mark"><i /></span><span className="brand-word">استنار <small style={{ fontWeight: 500, color: "var(--sand)", fontSize: 11 }}>العقارية</small></span></span>;
}

export function PublicShell({ children, pathname }: { children: ReactNode; pathname: string }) {
  return <div className="page-shell">
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" aria-label="استنار العقارية"><Brand /></Link>
        <nav className="nav-links" aria-label="التنقل الرئيسي">
          {publicLinks.map(([href, label]) => <Link className={pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)) ? "active" : ""} href={href} key={href}>{label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link className="button button-outline button-sm header-login" href="/login">تسجيل الدخول</Link>
          <Link className="button button-primary button-sm" href="/register">ابدأ كشركة</Link>
        </div>
      </div>
    </header>
    <main className="main-wrap">{children}</main>
  </div>;
}

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };
const providerNav: NavItem[] = [
  { href: "/provider", label: "نظرة عامة", icon: LayoutDashboard },
  { href: "/provider/developments", label: "المخططات", icon: Map },
  { href: "/provider/interests", label: "طلبات الاهتمام", icon: Users },
  { href: "/provider/analytics", label: "تحليلات الطلب", icon: BarChart3 },
  { href: "/provider/settings", label: "الشركة والفريق", icon: Building2 },
  { href: "/provider/billing", label: "الخطة والفوترة", icon: FileBarChart },
];
const customerNav: NavItem[] = [
  { href: "/dashboard", label: "ملخصي", icon: LayoutDashboard },
  { href: "/dashboard/favorites", label: "المحفوظات", icon: Heart },
  { href: "/dashboard/analyses", label: "تحليلاتي", icon: Sparkles },
  { href: "/analyze", label: "حلّل فرصة", icon: Compass },
];
const adminNav: NavItem[] = [
  { href: "/admin", label: "المركز", icon: LayoutDashboard },
  { href: "/admin/providers", label: "الشركات", icon: Building2 },
  { href: "/admin/developments", label: "المخططات", icon: Map },
  { href: "/admin/users", label: "المستخدمون", icon: Users },
  { href: "/admin/subscriptions", label: "الاشتراكات", icon: FileBarChart },
];

function currentNav(kind: "provider" | "customer" | "admin") { return kind === "provider" ? providerNav : kind === "admin" ? adminNav : customerNav; }
const headings: Record<string, [string, string]> = {
  "/provider": ["مساحة العمل", "صباح الخير، فريق رؤية الأرض"],
  "/provider/developments": ["المخططات", "كل ما تنشره الشركة وتديره"],
  "/provider/interests": ["طلبات الاهتمام", "طلبات حقيقية تحتاج متابعة واضحة"],
  "/provider/analytics": ["تحليلات الطلب", "افهم الحركة قبل قرار التسعير"],
  "/provider/settings": ["الشركة والفريق", "الهوية والصلاحيات والإعدادات"],
  "/provider/billing": ["الخطة والفوترة", "الاستخدام الحالي وخيارات النمو"],
  "/dashboard": ["مساحتي", "فرصك ومحفوظاتك في مكان واحد"],
  "/dashboard/favorites": ["المحفوظات", "القطع التي تريد الرجوع إليها"],
  "/dashboard/analyses": ["تحليلاتي", "قراراتك المحفوظة وفرضياتها"],
  "/admin": ["مركز المنصة", "صحة استنار والحركة التي تحتاج قراراً"],
  "/admin/providers": ["الشركات", "إدارة مقدمي الخدمة والتحقق"],
  "/admin/developments": ["مراجعة المخططات", "ضمان جودة المحتوى المنشور"],
  "/admin/users": ["المستخدمون", "الأدوار وحالة الحسابات"],
  "/admin/subscriptions": ["الاشتراكات", "الخطط والفوترة المؤسسية"],
};

export function WorkspaceShell({ children, pathname, kind }: { children: ReactNode; pathname: string; kind: "provider" | "customer" | "admin" }) {
  const nav = currentNav(kind);
  const exact = pathname.startsWith("/provider/developments/") ? "/provider/developments" : pathname;
  const [title, subtitle] = headings[exact] || (pathname.startsWith("/provider/developments/") ? ["محرر المخطط", "أنشئ تجربة بيع واضحة من المصدر"] : ["استنار", "مساحة عمل منظمة"]);
  return <div className="workspace">
    <aside className="side-nav">
      <Link href="/" aria-label="العودة للرئيسية"><Brand /></Link>
      <div className="nav-section">{kind === "provider" ? "مساحة الشركة" : kind === "admin" ? "تشغيل المنصة" : "مساحتي"}</div>
      <nav aria-label="تنقل مساحة العمل">
        {nav.map((item) => { const Icon = item.icon; const active = pathname === item.href || (item.href !== "/provider" && item.href !== "/dashboard" && item.href !== "/admin" && pathname.startsWith(`${item.href}/`)); return <Link href={item.href} className={active ? "active" : ""} key={item.href}><Icon size={18} /><span>{item.label}</span></Link>; })}
      </nav>
      {kind === "provider" && <>
        <div className="nav-section">الاستكشاف</div>
        <Link href="/analyze"><Sparkles size={18} /><span>محلل الفرص</span></Link>
        <Link href="/developments"><Compass size={18} /><span>استكشف السوق</span></Link>
      </>}
      <div className="side-footer"><b>{kind === "admin" ? "إدارة استنار" : kind === "provider" ? "رؤية الأرض للتطوير" : "حساب مستكشف"}</b><p>{kind === "provider" ? "خطة فريق · 3 مقاعد" : "استنار العقارية"}</p></div>
    </aside>
    <section className="workspace-main">
      <header className="workspace-topbar">
        <div><h1>{title}</h1><p>{subtitle}</p></div>
        <div className="user-cluster">
          {kind === "admin" && <span className="chip sand"><ShieldCheck size={13} /> مدير منصة</span>}
          <button className="button button-outline button-icon button-sm" aria-label="التنبيهات"><Menu size={17} /></button>
          <div className="avatar">{kind === "admin" ? "أد" : "مر"}</div>
        </div>
      </header>
      <main className="workspace-content">{children}</main>
    </section>
    <nav className="mobile-nav" aria-label="تنقل الهاتف">
      {nav.slice(0, 4).map((item) => { const Icon = item.icon; const active = pathname === item.href || pathname.startsWith(`${item.href}/`); return <Link href={item.href} className={active ? "active" : ""} key={item.href}><Icon size={17} /><span>{item.label}</span></Link>; })}
    </nav>
  </div>;
}

export function BackLink({ href, children = "العودة" }: { href: string; children?: ReactNode }) {
  return <Link href={href} className="chip" style={{ marginBottom: 16 }}><ChevronLeft size={14} />{children}</Link>;
}

export function RoleSwitcher() {
  return <div className="thin-card card-pad" style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}><div style={{ display: "flex", gap: 10, alignItems: "center" }}><CircleUserRound size={20} color="var(--teal)" /><span><b>تجربة استنار الكاملة</b><br /><small className="muted">تبدّل بين المساحات لاختبار كل دور</small></span></div><div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><Link className="button button-outline button-sm" href="/dashboard">مستكشف</Link><Link className="button button-outline button-sm" href="/provider">مقدم خدمة</Link><Link className="button button-outline button-sm" href="/admin">إدارة المنصة</Link></div></div>;
}
