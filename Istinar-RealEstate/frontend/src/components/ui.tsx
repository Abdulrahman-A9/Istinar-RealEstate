"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AlertCircle, Inbox } from "lucide-react";

export function Button({ variant = "primary", small = false, className = "", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "dark" | "outline" | "soft" | "danger"; small?: boolean }) {
  return <button className={`button button-${variant}${small ? " button-sm" : ""} ${className}`} {...props}>{children}</button>;
}

export function StatusChip({ children, tone = "teal", dot = false }: { children: ReactNode; tone?: "teal" | "sand" | "red" | "green"; dot?: boolean }) {
  return <span className={`chip ${tone}${dot ? " dot" : ""}`}>{children}</span>;
}

export function EmptyState({ title, description, action, icon }: { title: string; description: string; action?: ReactNode; icon?: ReactNode }) {
  return <section className="empty-state">
    <div>
      <div className="empty-icon">{icon || <Inbox size={23} />}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  </section>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <section className="empty-state">
    <div>
      <div className="empty-icon" style={{ color: "var(--red)", background: "#fae8e6" }}><AlertCircle size={23} /></div>
      <h3>تعذر تحميل هذه البيانات</h3>
      <p>{message}</p>
      {retry && <Button variant="outline" onClick={retry}>إعادة المحاولة</Button>}
    </div>
  </section>;
}

export function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return <div className="card card-pad" aria-label="جارٍ التحميل">
    {Array.from({ length: rows }, (_, index) => <div className="loading-line" style={{ width: `${86 - (index % 3) * 16}%`, marginBottom: 15 }} key={index} />)}
  </div>;
}

export function InlineDemoNotice({ mode }: { mode?: "demo" | "live" }) {
  if (mode !== "demo") return null;
  return <div className="notice" role="status">تعمل الآن بوضع العرض التجريبي إلى أن يتصل خادم Django. ستنتقل هذه الشاشة تلقائياً إلى البيانات الحية عند توفرها.</div>;
}
