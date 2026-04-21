"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, X, Check, Clock,
  Phone, User, Loader2, Sparkles, ArrowLeft,
} from "lucide-react";

const OPENING_HOUR = 8;
const CLOSING_HOUR = 23;
const SLOT_MINUTES = 90;

const generateSlots = () => {
  const slots = [];
  let minutes = OPENING_HOUR * 60;
  const endMinutes = CLOSING_HOUR * 60;
  while (minutes + SLOT_MINUTES <= endMinutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const endH = Math.floor((minutes + SLOT_MINUTES) / 60);
    const endM = (minutes + SLOT_MINUTES) % 60;
    slots.push({
      key: `${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}`,
      label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      endLabel: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
    });
    minutes += SLOT_MINUTES;
  }
  return slots;
};

const SLOTS = generateSlots();

const formatDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isPastDay = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < today;
};

const isPastSlot = (date: Date, slotKey: string) => {
  const now = new Date();
  const slotDate = new Date(date);
  const h = parseInt(slotKey.slice(0, 2));
  const m = parseInt(slotKey.slice(2, 4));
  slotDate.setHours(h, m, 0, 0);
  return slotDate < now;
};

const DAYS_IT = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];
const DAYS_FULL_IT = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

const buildMonthGrid = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { date: Date; currentMonth: boolean }[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), currentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), currentMonth: true });
  }
  while (cells.length < 42) {
    const lastDate = cells[cells.length - 1].date;
    const next = new Date(lastDate);
    next.setDate(next.getDate() + 1);
    cells.push({ date: next, currentMonth: false });
  }
  return cells;
};

type Booking = { name: string; phone: string; createdAt: string };
type BookingDetail = Booking & { date: Date; slot: (typeof SLOTS)[0] };

export default function PadelBooking() {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookings, setBookings] = useState<Record<string, Booking>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; slot: (typeof SLOTS)[0] } | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [viewDetail, setViewDetail] = useState<BookingDetail | null>(null);
  const [toast, setToast] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const loadBookings = useCallback(async () => {
    try {
      const res = await fetch("/api/bookings");
      const data = await res.json();
      setBookings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
    const interval = setInterval(loadBookings, 8000);
    return () => clearInterval(interval);
  }, [loadBookings]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const getBookingKey = (date: Date, slotKey: string) => `${formatDateKey(date)}_${slotKey}`;

  const dayBookingCount = (date: Date) =>
    SLOTS.filter((s) => bookings[getBookingKey(date, s.key)]).length;

  const dayAvailableCount = (date: Date) => {
    if (isPastDay(date)) return 0;
    return SLOTS.filter((s) => !bookings[getBookingKey(date, s.key)] && !isPastSlot(date, s.key)).length;
  };

  const prevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  const goToToday = () => { setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(null); };

  const handleSlotClick = (slot: (typeof SLOTS)[0]) => {
    if (!selectedDate) return;
    if (isPastSlot(selectedDate, slot.key)) return;
    const key = getBookingKey(selectedDate, slot.key);
    if (bookings[key]) {
      setViewDetail({ ...bookings[key], date: selectedDate, slot });
    } else {
      setSelectedSlot({ date: selectedDate, slot });
      setName(""); setPhone(""); setError("");
    }
  };

  const handleConfirm = async () => {
    if (!name.trim() || !phone.trim()) { setError("Inserisci nome e telefono"); return; }
    if (phone.trim().length < 6) { setError("Numero di telefono non valido"); return; }
    if (!selectedSlot) return;
    setSubmitting(true);
    setError("");

    const key = getBookingKey(selectedSlot.date, selectedSlot.slot.key);

    try {
      const checkRes = await fetch(`/api/bookings/check?key=${encodeURIComponent(key)}`);
      const { exists } = await checkRes.json();
      if (exists) {
        setError("Questo slot è stato appena prenotato da qualcun altro");
        setSubmitting(false);
        await loadBookings();
        setTimeout(() => setSelectedSlot(null), 1500);
        return;
      }

      await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, name: name.trim(), phone: phone.trim() }),
      });

      setBookings((prev) => ({
        ...prev,
        [key]: { name: name.trim(), phone: phone.trim(), createdAt: new Date().toISOString() },
      }));
      setToast(`Prenotazione confermata · ${selectedSlot.slot.label}`);
      setSelectedSlot(null);
    } catch {
      setError("Errore nel salvataggio. Riprova.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!viewDetail) return;
    const key = getBookingKey(viewDetail.date, viewDetail.slot.key);
    setSubmitting(true);
    try {
      await fetch(`/api/bookings?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      setBookings((prev) => { const next = { ...prev }; delete next[key]; return next; });
      setToast("Prenotazione annullata");
      setViewDetail(null);
    } catch {
      setError("Errore nell'annullamento");
    } finally {
      setSubmitting(false);
    }
  };

  const monthGrid = buildMonthGrid(viewMonth.getFullYear(), viewMonth.getMonth());
  const monthBookings = monthGrid.filter((c) => c.currentMonth).reduce((acc, c) => acc + dayBookingCount(c.date), 0);

  return (
    <div
      className="min-h-screen text-stone-100"
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        background: "radial-gradient(ellipse at top, #1a1f1a 0%, #0a0d0b 50%, #050706 100%)",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@300;400;500;600;700&display=swap');
        .font-display { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; }
        .grain {
          position: fixed; inset: 0; pointer-events: none; z-index: 1; opacity: 0.04;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          mix-blend-mode: overlay;
        }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(190, 242, 100, 0.15); } 50% { box-shadow: 0 0 30px rgba(190, 242, 100, 0.3); } }
        .animate-fade-up { animation: fadeUp 0.5s ease-out both; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out both; }
        .animate-scale-in { animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-slide-in { animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .pulse-dot { animation: glow 2s ease-in-out infinite; }
        .day-cell { transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1); }
        .day-cell:not(.disabled):hover { transform: translateY(-1px); }
        .slot-row { transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1); }
        .slot-row:not(.disabled):hover { transform: translateX(2px); }
        input:focus { outline: none; }
      `}</style>

      <div className="grain" />

      {/* HEADER */}
      <header className="relative z-10 border-b border-white/5 backdrop-blur-xl bg-black/20 sticky top-0">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3.5 animate-fade-in">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-lime-300 to-lime-500 flex items-center justify-center shadow-lg shadow-lime-500/20 pulse-dot">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#0a0d0b" strokeWidth="2.2">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12 Q 12 6, 21 12" fill="none" />
                <path d="M3 12 Q 12 18, 21 12" fill="none" />
              </svg>
            </div>
            <div>
              <div className="text-[9px] tracking-[0.35em] text-lime-400/80 font-semibold">PADEL · CLUB</div>
              <div className="font-display text-xl font-semibold tracking-tight leading-none text-white">
                Centrale 41
              </div>
            </div>
          </div>
          <button
            onClick={goToToday}
            className="text-[11px] font-semibold tracking-[0.15em] uppercase px-4 py-2.5 rounded-full bg-lime-400 text-stone-950 hover:bg-lime-300 transition-colors shadow-lg shadow-lime-500/20"
          >
            Oggi
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
        {/* VISTA MENSILE */}
        {!selectedDate && (
          <div className={mounted ? "animate-fade-up" : ""}>
            <div className="mb-10">
              <div className="text-[10px] tracking-[0.35em] text-lime-400/70 font-semibold mb-2 flex items-center gap-2">
                <Sparkles size={10} /> PRENOTAZIONE CAMPO
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-white leading-[0.95]">
                Scegli <em className="italic font-normal text-lime-400">il giorno</em>.
              </h1>
              <p className="mt-3 text-stone-400 text-sm max-w-md leading-relaxed">
                Seleziona una data sul calendario per vedere tutti gli orari disponibili.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 mb-6">
              <button onClick={prevMonth} className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all">
                <ChevronLeft size={18} className="text-stone-300" />
              </button>
              <div className="text-center flex-1">
                <div className="text-[10px] tracking-[0.3em] text-stone-500 font-medium mb-0.5">MESE</div>
                <div className="font-display text-xl sm:text-2xl font-medium tracking-tight text-white">
                  {MONTHS_IT[viewMonth.getMonth()]} <span className="text-stone-500 font-light">{viewMonth.getFullYear()}</span>
                </div>
              </div>
              <button onClick={nextMonth} className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all">
                <ChevronRight size={18} className="text-stone-300" />
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-stone-500">
                <Loader2 className="animate-spin mb-3 text-lime-400" size={24} />
                <span className="text-xs tracking-[0.2em]">CARICAMENTO</span>
              </div>
            ) : (
              <>
                <div className="rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur p-3 sm:p-5">
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
                    {DAYS_IT.map((d) => (
                      <div key={d} className="text-center py-2 text-[10px] tracking-[0.25em] font-semibold text-stone-500">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {monthGrid.map((cell, i) => {
                      const isToday = isSameDay(cell.date, today);
                      const past = isPastDay(cell.date);
                      const booked = dayBookingCount(cell.date);
                      const available = dayAvailableCount(cell.date);
                      const fullyBooked = cell.currentMonth && !past && available === 0 && booked > 0;
                      const disabled = past || !cell.currentMonth;

                      let classes = "day-cell aspect-square sm:aspect-[4/5] rounded-xl flex flex-col items-center justify-center p-1 sm:p-2 relative ";
                      if (!cell.currentMonth) classes += "opacity-20 disabled cursor-not-allowed ";
                      else if (past) classes += "bg-white/[0.02] text-stone-700 disabled cursor-not-allowed ";
                      else if (isToday) classes += "bg-gradient-to-br from-lime-400 to-lime-500 text-stone-950 cursor-pointer hover:shadow-lg hover:shadow-lime-500/30 shadow-md shadow-lime-500/20 ";
                      else if (fullyBooked) classes += "bg-stone-800/60 border border-white/5 text-stone-400 cursor-pointer hover:bg-stone-700/60 ";
                      else classes += "bg-white/[0.03] border border-white/5 text-white cursor-pointer hover:bg-white/[0.08] hover:border-lime-400/30 ";

                      return (
                        <button key={i} disabled={disabled} onClick={() => !disabled && setSelectedDate(cell.date)} className={classes}>
                          <div className={`font-display text-base sm:text-2xl font-medium leading-none ${isToday ? "text-stone-950" : ""}`}>
                            {cell.date.getDate()}
                          </div>
                          {cell.currentMonth && !past && (
                            <div className="mt-1 sm:mt-1.5 flex items-center gap-0.5">
                              {fullyBooked ? (
                                <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-stone-500 font-semibold">Pieno</span>
                              ) : booked > 0 ? (
                                <div className="flex gap-0.5">
                                  {Array.from({ length: Math.min(booked, 3) }).map((_, idx) => (
                                    <div key={idx} className={`w-1 h-1 rounded-full ${isToday ? "bg-stone-900/70" : "bg-lime-400/70"}`} />
                                  ))}
                                  {booked > 3 && <span className={`text-[8px] leading-none ${isToday ? "text-stone-900/70" : "text-lime-400/70"}`}>+</span>}
                                </div>
                              ) : (
                                <div className={`w-1 h-1 rounded-full ${isToday ? "bg-stone-900/40" : "bg-stone-600"}`} />
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap gap-4 text-stone-500">
                    <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded bg-gradient-to-br from-lime-400 to-lime-500" /><span>Oggi</span></div>
                    <div className="flex items-center gap-2"><div className="flex gap-0.5"><div className="w-1 h-1 rounded-full bg-lime-400/70" /><div className="w-1 h-1 rounded-full bg-lime-400/70" /></div><span>Prenotazioni attive</span></div>
                    <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded bg-stone-800/60" /><span>Completo</span></div>
                  </div>
                  {monthBookings > 0 && (
                    <div className="text-stone-500">
                      <span className="text-white font-medium">{monthBookings}</span> prenotazioni questo mese
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* VISTA SLOT DEL GIORNO */}
        {selectedDate && (
          <div className="animate-slide-in">
            <button onClick={() => setSelectedDate(null)} className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors mb-6 text-sm">
              <ArrowLeft size={16} />
              <span className="tracking-wide">Torna al calendario</span>
            </button>

            <div className="mb-8">
              <div className="text-[10px] tracking-[0.35em] text-lime-400/70 font-semibold mb-2">
                {DAYS_FULL_IT[selectedDate.getDay()].toUpperCase()}
              </div>
              <h1 className="font-display text-5xl sm:text-6xl font-light tracking-tight text-white leading-[0.95]">
                {selectedDate.getDate()} <em className="italic font-normal text-lime-400">{MONTHS_IT[selectedDate.getMonth()].toLowerCase()}</em>
              </h1>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime-400/10 border border-lime-400/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                  <span className="text-lime-300 font-medium tracking-wider">{dayAvailableCount(selectedDate)} DISPONIBILI</span>
                </div>
                {dayBookingCount(selectedDate) > 0 && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                    <span className="text-stone-300 font-medium tracking-wider">{dayBookingCount(selectedDate)} PRENOTATI</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {SLOTS.map((slot, idx) => {
                const key = getBookingKey(selectedDate, slot.key);
                const booking = bookings[key];
                const past = isPastSlot(selectedDate, slot.key);
                const booked = !!booking;

                let classes = "slot-row w-full flex items-center gap-4 p-4 sm:p-5 rounded-2xl text-left ";
                if (past) classes += "bg-white/[0.02] border border-transparent opacity-40 disabled cursor-not-allowed ";
                else if (booked) classes += "bg-stone-800/60 border border-white/5 cursor-pointer hover:bg-stone-800/80 hover:border-white/10 ";
                else classes += "bg-gradient-to-r from-lime-400/8 to-transparent border border-lime-400/20 cursor-pointer hover:from-lime-400/15 hover:border-lime-400/40 ";

                return (
                  <button key={slot.key} disabled={past} onClick={() => handleSlotClick(slot)} className={classes} style={{ animationDelay: `${idx * 0.03}s` }}>
                    <div className="flex flex-col items-start min-w-[70px] sm:min-w-[90px]">
                      <div className={`font-display text-2xl sm:text-3xl font-medium leading-none ${past ? "text-stone-600" : booked ? "text-stone-400" : "text-white"}`}>
                        {slot.label}
                      </div>
                      <div className={`text-[10px] tracking-wider mt-1 ${past ? "text-stone-700" : "text-stone-500"}`}>
                        → {slot.endLabel}
                      </div>
                    </div>
                    <div className={`w-px h-10 ${past ? "bg-white/5" : booked ? "bg-white/10" : "bg-lime-400/20"}`} />
                    <div className="flex-1 min-w-0">
                      {past ? (
                        <div className="text-[10px] tracking-[0.25em] text-stone-700 font-semibold">PASSATO</div>
                      ) : booked ? (
                        <div>
                          <div className="text-[10px] tracking-[0.25em] text-stone-500 font-semibold mb-0.5">PRENOTATO DA</div>
                          <div className="text-white font-medium truncate">{booking.name}</div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-[10px] tracking-[0.25em] text-lime-400/80 font-semibold mb-0.5">DISPONIBILE</div>
                          <div className="text-stone-300 text-sm">Tocca per prenotare · 90 min</div>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {past ? null : booked ? (
                        <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
                          <User size={14} className="text-stone-400" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-lime-400 flex items-center justify-center shadow-lg shadow-lime-500/20">
                          <ChevronRight size={16} className="text-stone-950" strokeWidth={2.5} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* MODAL PRENOTAZIONE */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-20 flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => !submitting && setSelectedSlot(null)}>
          <div className="relative w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-3xl p-7 sm:p-9 border border-white/10 shadow-2xl" style={{ background: "linear-gradient(180deg, #1a1f1a 0%, #0f1310 100%)" }}>
              <div className="flex items-start justify-between mb-7">
                <div>
                  <div className="text-[10px] tracking-[0.3em] text-lime-400/80 font-semibold mb-2">NUOVA PRENOTAZIONE</div>
                  <div className="font-display text-3xl font-medium tracking-tight text-white leading-tight">
                    {DAYS_FULL_IT[selectedSlot.date.getDay()]} {selectedSlot.date.getDate()}<br />
                    <span className="text-stone-400 italic font-light">{MONTHS_IT[selectedSlot.date.getMonth()]}</span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime-400/10 border border-lime-400/20">
                    <Clock size={11} className="text-lime-400" />
                    <span className="text-xs text-lime-300 font-medium tracking-wider">
                      {selectedSlot.slot.label} → {selectedSlot.slot.endLabel} · 90 MIN
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedSlot(null)} disabled={submitting} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors">
                  <X size={16} className="text-stone-400" />
                </button>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <div className="flex items-center gap-2 text-[10px] tracking-[0.25em] font-semibold text-stone-500 mb-2">
                    <User size={11} /> NOME E COGNOME
                  </div>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mario Rossi" disabled={submitting} autoFocus
                    className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white text-base placeholder:text-stone-600 focus:border-lime-400/50 focus:bg-black/60 transition-colors" />
                </label>
                <label className="block">
                  <div className="flex items-center gap-2 text-[10px] tracking-[0.25em] font-semibold text-stone-500 mb-2">
                    <Phone size={11} /> TELEFONO
                  </div>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="333 1234567" disabled={submitting}
                    className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white text-base placeholder:text-stone-600 focus:border-lime-400/50 focus:bg-black/60 transition-colors" />
                </label>
                {error && (
                  <div className="text-xs text-red-300 bg-red-950/40 border border-red-800/40 rounded-xl px-4 py-3 animate-fade-in">{error}</div>
                )}
                <button onClick={handleConfirm} disabled={submitting}
                  className="w-full mt-2 bg-lime-400 text-stone-950 py-4 rounded-full font-semibold tracking-wide hover:bg-lime-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-lime-500/20">
                  {submitting ? <><Loader2 className="animate-spin" size={17} /> Attendi...</> : <><Check size={17} strokeWidth={2.5} /> Conferma prenotazione</>}
                </button>
                <p className="text-[10px] text-stone-600 text-center leading-relaxed pt-1">
                  I tuoi dati sono visibili ai soci del circolo per il coordinamento delle prenotazioni.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETTAGLIO */}
      {viewDetail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-20 flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => !submitting && setViewDetail(null)}>
          <div className="relative w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-3xl p-7 sm:p-9 border border-white/10 shadow-2xl" style={{ background: "linear-gradient(180deg, #1a1f1a 0%, #0f1310 100%)" }}>
              <div className="flex items-start justify-between mb-7">
                <div>
                  <div className="text-[10px] tracking-[0.3em] text-stone-500 font-semibold mb-2">PRENOTAZIONE ATTIVA</div>
                  <div className="font-display text-3xl font-medium tracking-tight text-white leading-tight">
                    {DAYS_FULL_IT[viewDetail.date.getDay()]} {viewDetail.date.getDate()}<br />
                    <span className="text-stone-400 italic font-light">{MONTHS_IT[viewDetail.date.getMonth()]}</span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <Clock size={11} className="text-stone-400" />
                    <span className="text-xs text-stone-300 font-medium tracking-wider">
                      {viewDetail.slot.label} → {viewDetail.slot.endLabel}
                    </span>
                  </div>
                </div>
                <button onClick={() => setViewDetail(null)} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors">
                  <X size={16} className="text-stone-400" />
                </button>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-3 p-4 bg-black/30 rounded-xl border border-white/5">
                  <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
                    <User size={15} className="text-stone-400" />
                  </div>
                  <div>
                    <div className="text-[9px] tracking-[0.25em] text-stone-500 font-semibold">PRENOTATO DA</div>
                    <div className="font-medium text-white">{viewDetail.name}</div>
                  </div>
                </div>
                <a href={`tel:${viewDetail.phone}`} className="flex items-center gap-3 p-4 bg-black/30 rounded-xl border border-white/5 hover:border-lime-400/30 hover:bg-black/50 transition-all group">
                  <div className="w-9 h-9 rounded-full bg-lime-400/10 flex items-center justify-center group-hover:bg-lime-400/20 transition-colors">
                    <Phone size={15} className="text-lime-400" />
                  </div>
                  <div>
                    <div className="text-[9px] tracking-[0.25em] text-stone-500 font-semibold">CONTATTO</div>
                    <div className="font-medium text-white group-hover:text-lime-300 transition-colors">{viewDetail.phone}</div>
                  </div>
                </a>
              </div>

              <button onClick={handleCancel} disabled={submitting}
                className="w-full border border-red-800/40 bg-red-950/20 text-red-300 py-3.5 rounded-full font-medium hover:bg-red-950/40 hover:border-red-700/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting ? <Loader2 className="animate-spin" size={15} /> : <X size={15} />}
                Annulla prenotazione
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 animate-scale-in">
          <div className="bg-stone-900/95 backdrop-blur-xl text-white px-5 py-3.5 rounded-full text-sm font-medium shadow-2xl border border-lime-400/20 flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-lime-400 flex items-center justify-center">
              <Check size={13} className="text-stone-950" strokeWidth={3} />
            </div>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
