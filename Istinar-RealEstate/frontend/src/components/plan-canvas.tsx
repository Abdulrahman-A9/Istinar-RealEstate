"use client";

import { Heart, MapPin, Ruler, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { currency } from "@/lib/demo-data";
import type { Lot } from "@/lib/types";
import { Button, StatusChip } from "@/components/ui";

const statusLabel: Record<Lot["status"], string> = { available: "متاحة", reserved: "محجوزة", sold: "مباعة", hold: "معلّقة" };
const statusTone: Record<Lot["status"], "green" | "sand" | "red" | "teal"> = { available: "green", reserved: "sand", sold: "teal", hold: "red" };

export function LotPlanCanvas({ lots, initialLotId, onInterest, onFavorite }: { lots: Lot[]; initialLotId?: number; onInterest?: (lot: Lot) => void; onFavorite?: (lot: Lot) => void }) {
  const [selectedId, setSelectedId] = useState(initialLotId || lots.find((item) => item.status === "available")?.id || lots[0]?.id);
  const selected = useMemo(() => lots.find((item) => item.id === selectedId) || lots[0], [lots, selectedId]);
  if (!selected) return null;

  return <div className="map-layout">
    <div className="map-canvas" aria-label="مخطط تفاعلي للقطع">
      <div className="map-road one">شارع رئيسي — 30م</div><div className="map-road two">شارع خدمات</div>
      {lots.map((lot) => <button
        key={lot.id}
        aria-label={`قطعة ${lot.code}، ${statusLabel[lot.status]}`}
        className={`lot-shape ${lot.status} ${lot.id === selected.id ? "selected" : ""}`}
        style={{ clipPath: lot.geometry, inset: 0 }}
        onClick={() => setSelectedId(lot.id)}
      >{lot.code}</button>)}
      <div className="map-legend" aria-label="دليل حالة القطع">
        <span className="legend-item"><i /> متاحة</span><span className="legend-item reserved"><i /> محجوزة</span><span className="legend-item sold"><i /> مباعة</span><span className="legend-item hold"><i /> معلقة</span>
      </div>
    </div>
    <aside className="lot-drawer" aria-live="polite">
      <div className="drawer-top">
        <StatusChip tone={statusTone[selected.status]} dot>{statusLabel[selected.status]}</StatusChip>
        <h3>القطعة {selected.code}</h3>
        <p className="subtle">بلوك {selected.block} · {selected.use}</p>
      </div>
      <p className="price">{currency(selected.price)}</p>
      <div className="info-row"><span><Ruler size={15} /> المساحة</span><b><span className="num">{selected.area}</span> م²</b></div>
      <div className="info-row"><span><MapPin size={15} /> الاتجاه</span><b>{selected.orientation}</b></div>
      <div className="info-row"><span>الواجهة × العمق</span><b><span className="num">{selected.frontage} × {selected.depth}</span> م</b></div>
      <div className="info-row"><span><Sparkles size={15} /> إشارة الطلب</span><b><span className="num">{selected.demandScore}</span>/100</b></div>
      {selected.notes && <p className="notice" style={{ marginTop: 16 }}>{selected.notes}</p>}
      <Button disabled={selected.status !== "available"} onClick={() => onInterest?.(selected)}>أرسل اهتماماً</Button>
      <Button variant="outline" onClick={() => onFavorite?.(selected)}><Heart size={16} /> حفظ للمقارنة</Button>
    </aside>
  </div>;
}
