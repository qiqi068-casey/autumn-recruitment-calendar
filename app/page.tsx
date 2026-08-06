"use client";

import { FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type EventType = "deadline" | "assessment" | "interview";
type EventStatus = "todo" | "progress" | "done";
type RecruitEvent = {
  id: string;
  company: string;
  role: string;
  date: string;
  time?: string;
  type: EventType;
  status: EventStatus;
  sourceUrl?: string;
  note?: string;
};

const typeMeta: Record<EventType, { label: string; short: string; color: string }> = {
  deadline: { label: "投递 DDL", short: "DDL", color: "coral" },
  assessment: { label: "笔试 / 测评", short: "测评", color: "purple" },
  interview: { label: "面试", short: "面试", color: "green" },
};

const pad = (n: number) => String(n).padStart(2, "0");
const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = toDateKey(new Date());

const holidays2026: Record<string, string> = {
  "2026-01-01": "元旦", "2026-01-02": "元旦", "2026-01-03": "元旦",
  "2026-02-15": "春节", "2026-02-16": "春节", "2026-02-17": "春节", "2026-02-18": "春节", "2026-02-19": "春节", "2026-02-20": "春节", "2026-02-21": "春节", "2026-02-22": "春节", "2026-02-23": "春节",
  "2026-04-04": "清明", "2026-04-05": "清明", "2026-04-06": "清明",
  "2026-05-01": "劳动节", "2026-05-02": "劳动节", "2026-05-03": "劳动节", "2026-05-04": "劳动节", "2026-05-05": "劳动节",
  "2026-06-19": "端午", "2026-06-20": "端午", "2026-06-21": "端午",
  "2026-09-25": "中秋", "2026-09-26": "中秋", "2026-09-27": "中秋",
  "2026-10-01": "国庆", "2026-10-02": "国庆", "2026-10-03": "国庆", "2026-10-04": "国庆", "2026-10-05": "国庆", "2026-10-06": "国庆", "2026-10-07": "国庆",
};
type IntentLevel = "high" | "low";
type WatchCompany = { id: string; name: string; intent: IntentLevel };

type HolidayDay = { label: string; kind: "holiday" | "workday" | "statutory" };

const holidayCalendar: Record<string, HolidayDay> = {
  // 2024—2026 entries follow the annual State Council holiday notices.
  "2024-01-01": { label: "元旦", kind: "holiday" },
  ...Object.fromEntries(["2024-02-10", "2024-02-11", "2024-02-12", "2024-02-13", "2024-02-14", "2024-02-15", "2024-02-16", "2024-02-17"].map((date) => [date, { label: "春节", kind: "holiday" }])),
  "2024-02-04": { label: "班", kind: "workday" }, "2024-02-18": { label: "班", kind: "workday" },
  ...Object.fromEntries(["2024-04-04", "2024-04-05", "2024-04-06"].map((date) => [date, { label: "清明", kind: "holiday" }])),
  "2024-04-07": { label: "班", kind: "workday" },
  ...Object.fromEntries(["2024-05-01", "2024-05-02", "2024-05-03", "2024-05-04", "2024-05-05"].map((date) => [date, { label: "劳动节", kind: "holiday" }])),
  "2024-04-28": { label: "班", kind: "workday" }, "2024-05-11": { label: "班", kind: "workday" },
  ...Object.fromEntries(["2024-06-08", "2024-06-09", "2024-06-10"].map((date) => [date, { label: "端午", kind: "holiday" }])),
  ...Object.fromEntries(["2024-09-15", "2024-09-16", "2024-09-17"].map((date) => [date, { label: "中秋", kind: "holiday" }])),
  "2024-09-14": { label: "班", kind: "workday" },
  ...Object.fromEntries(["2024-10-01", "2024-10-02", "2024-10-03", "2024-10-04", "2024-10-05", "2024-10-06", "2024-10-07"].map((date) => [date, { label: "国庆", kind: "holiday" }])),
  "2024-09-29": { label: "班", kind: "workday" }, "2024-10-12": { label: "班", kind: "workday" },

  "2025-01-01": { label: "元旦", kind: "holiday" },
  ...Object.fromEntries(["2025-01-28", "2025-01-29", "2025-01-30", "2025-01-31", "2025-02-01", "2025-02-02", "2025-02-03", "2025-02-04"].map((date) => [date, { label: "春节", kind: "holiday" }])),
  "2025-01-26": { label: "班", kind: "workday" }, "2025-02-08": { label: "班", kind: "workday" },
  ...Object.fromEntries(["2025-04-04", "2025-04-05", "2025-04-06"].map((date) => [date, { label: "清明", kind: "holiday" }])),
  ...Object.fromEntries(["2025-05-01", "2025-05-02", "2025-05-03", "2025-05-04", "2025-05-05"].map((date) => [date, { label: "劳动节", kind: "holiday" }])),
  "2025-04-27": { label: "班", kind: "workday" },
  ...Object.fromEntries(["2025-05-31", "2025-06-01", "2025-06-02"].map((date) => [date, { label: "端午", kind: "holiday" }])),
  ...Object.fromEntries(["2025-10-01", "2025-10-02", "2025-10-03", "2025-10-04", "2025-10-05", "2025-10-06", "2025-10-07", "2025-10-08"].map((date) => [date, { label: "国庆·中秋", kind: "holiday" }])),
  "2025-09-28": { label: "班", kind: "workday" }, "2025-10-11": { label: "班", kind: "workday" },

  "2026-01-04": { label: "班", kind: "workday" }, "2026-02-14": { label: "班", kind: "workday" }, "2026-02-28": { label: "班", kind: "workday" },
  "2026-05-09": { label: "班", kind: "workday" }, "2026-09-20": { label: "班", kind: "workday" }, "2026-10-10": { label: "班", kind: "workday" },

  // The 2027 adjustment notice is not published yet; these are statutory dates only.
  "2027-01-01": { label: "元旦·法定", kind: "statutory" },
  "2027-02-05": { label: "春节·法定", kind: "statutory" }, "2027-02-06": { label: "春节·法定", kind: "statutory" }, "2027-02-07": { label: "春节·法定", kind: "statutory" }, "2027-02-08": { label: "春节·法定", kind: "statutory" },
  "2027-04-05": { label: "清明·法定", kind: "statutory" },
  "2027-05-01": { label: "劳动节·法定", kind: "statutory" }, "2027-05-02": { label: "劳动节·法定", kind: "statutory" },
  "2027-06-09": { label: "端午·法定", kind: "statutory" },
  "2027-09-15": { label: "中秋·法定", kind: "statutory" },
  "2027-10-01": { label: "国庆·法定", kind: "statutory" }, "2027-10-02": { label: "国庆·法定", kind: "statutory" }, "2027-10-03": { label: "国庆·法定", kind: "statutory" },
};

const initialEvents: RecruitEvent[] = [];

const emptyForm = (): Omit<RecruitEvent, "id"> => ({
  company: "",
  role: "",
  date: todayKey,
  time: "",
  type: "deadline",
  status: "todo",
  sourceUrl: "",
  note: "",
});

export default function Home() {
  const [events, setEvents] = useState<RecruitEvent[]>(initialEvents);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [filter, setFilter] = useState<EventType | "all">("all");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [hydrated, setHydrated] = useState(false);
  const [memo, setMemo] = useState("");
  const [watchCompanies, setWatchCompanies] = useState<WatchCompany[]>([]);
  const [watchCompanyDraft, setWatchCompanyDraft] = useState("");
  const [watchIntent, setWatchIntent] = useState<IntentLevel>("high");
  const [confirmMemoClear, setConfirmMemoClear] = useState(false);
  const [confirmEventDelete, setConfirmEventDelete] = useState(false);
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("autumn-recruitment-events");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Array<RecruitEvent & { type: EventType | "application" }>;
        setEvents(parsed.map((event) => ({ ...event, type: event.type === "application" ? "deadline" : event.type })));
      } catch { /* keep demo data */ }
    }
    setMemo(localStorage.getItem("autumn-recruitment-memo") ?? "");
    const savedCompanies = localStorage.getItem("autumn-recruitment-watch-companies");
    if (savedCompanies) {
      try { setWatchCompanies(JSON.parse(savedCompanies) as WatchCompany[]); } catch { /* keep an empty watch list */ }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem("autumn-recruitment-events", JSON.stringify(events));
  }, [events, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem("autumn-recruitment-memo", memo);
  }, [memo, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem("autumn-recruitment-watch-companies", JSON.stringify(watchCompanies));
  }, [watchCompanies, hydrated]);

  useEffect(() => {
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [modalOpen]);

  const filtered = useMemo(() => events.filter((event) => {
    const matchesType = filter === "all" || event.type === filter;
    const text = `${event.company} ${event.role} ${event.note ?? ""}`.toLowerCase();
    return matchesType && text.includes(query.trim().toLowerCase());
  }), [events, filter, query]);

  const calendarMonths = useMemo(() => Array.from({ length: 96 }, (_, index) => new Date(2024, index, 1)), []);
  const calendarScrollRef = useRef<HTMLDivElement>(null);

  function goToMonth(targetMonth: Date, behavior: ScrollBehavior = "smooth") {
    setMonth(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1));
    const container = calendarScrollRef.current;
    const target = container?.querySelector<HTMLElement>(`[data-month="${targetMonth.getFullYear()}-${pad(targetMonth.getMonth() + 1)}"]`);
    if (container && target) {
      const top = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
      if (behavior === "auto") container.scrollTop = top;
      else container.scrollTo({ top, behavior });
    }
  }

  useLayoutEffect(() => {
    goToMonth(new Date(), "auto");
  }, []);

  function syncMonthFromScroll() {
    const container = calendarScrollRef.current;
    if (!container) return;
    const viewport = container.getBoundingClientRect();
    let visibleMonth: HTMLElement | null = null;
    let greatestVisibleHeight = 0;
    container.querySelectorAll<HTMLElement>(".calendar-month").forEach((section) => {
      const bounds = section.getBoundingClientRect();
      const visibleHeight = Math.max(0, Math.min(bounds.bottom, viewport.bottom) - Math.max(bounds.top, viewport.top));
      if (visibleHeight > greatestVisibleHeight) {
        greatestVisibleHeight = visibleHeight;
        visibleMonth = section;
      }
    });
    const value = visibleMonth?.dataset.month;
    if (!value) return;
    const [year, monthNumber] = value.split("-").map(Number);
    if (year !== month.getFullYear() || monthNumber - 1 !== month.getMonth()) setMonth(new Date(year, monthNumber - 1, 1));
  }

  const weekStartDate = new Date();
  weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay());
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  const weekStartKey = toDateKey(weekStartDate);
  const weekEndKey = toDateKey(weekEndDate);
  const weekEvents = events.filter((event) => event.date >= weekStartKey && event.date <= weekEndKey);
  const completedWeekEvents = weekEvents.filter((event) => event.status === "done");
  const weekInterviews = weekEvents.filter((event) => event.type === "interview");
  const completedWeekInterviews = weekInterviews.filter((event) => event.status === "done");
  const weekRangeLabel = `${weekStartDate.getMonth() + 1}.${weekStartDate.getDate()} — ${weekEndDate.getMonth() + 1}.${weekEndDate.getDate()}`;
  const stats = {
    applications: new Set(events.filter((event) => event.type === "deadline" && event.status === "done").map((event) => event.company.trim().toLowerCase())).size,
    weeklyTotal: weekEvents.length,
    weeklyCompleted: completedWeekEvents.length,
    weeklyInterviews: weekInterviews.length,
    weeklyInterviewsCompleted: completedWeekInterviews.length,
  };
  const weeklyProgress = stats.weeklyTotal ? Math.round((stats.weeklyCompleted / stats.weeklyTotal) * 100) : 0;
  const interviewProgress = stats.weeklyInterviews ? Math.round((stats.weeklyInterviewsCompleted / stats.weeklyInterviews) * 100) : 0;

  function openCreate(date = selectedDate) {
    setEditingId(null);
    setForm({ ...emptyForm(), date });
    setModalOpen(true);
  }

  function openEdit(event: RecruitEvent) {
    setEditingId(event.id);
    setForm({ company: event.company, role: event.role, date: event.date, time: event.time ?? "", type: event.type, status: event.status, sourceUrl: event.sourceUrl ?? "", note: event.note ?? "" });
    setModalOpen(true);
  }

  function saveEvent(e: FormEvent) {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim() || !form.date) return;
    if (editingId) {
      setEvents((all) => all.map((item) => item.id === editingId ? { ...form, id: editingId } : item));
    } else {
      setEvents((all) => [...all, { ...form, id: crypto.randomUUID() }]);
    }
    setModalOpen(false);
  }

  function removeEvent() {
    if (!editingId) return;
    setEvents((all) => all.filter((e) => e.id !== editingId));
    setConfirmEventDelete(false);
    setModalOpen(false);
  }

  function toggleCompleted(id: string) {
    setEvents((all) => all.map((event) => event.id === id
      ? { ...event, status: event.status === "done" ? "todo" : "done" }
      : event));
  }

  function addWatchCompany(e: FormEvent) {
    e.preventDefault();
    const name = watchCompanyDraft.trim();
    if (!name || watchCompanies.some((company) => company.name.toLowerCase() === name.toLowerCase())) return;
    setWatchCompanies((companies) => [...companies, { id: crypto.randomUUID(), name, intent: watchIntent }]);
    setWatchCompanyDraft("");
  }

  function toggleWatchIntent(id: string) {
    setWatchCompanies((companies) => companies.map((company) => company.id === id ? { ...company, intent: company.intent === "high" ? "low" : "high" } : company));
  }

  function removeWatchCompany(id: string) {
    setWatchCompanies((companies) => companies.filter((company) => company.id !== id));
  }

  const selectedEvents = filtered
    .filter((e) => e.date === selectedDate)
    .sort((a, b) => {
      const priority = Number(b.type === "interview") - Number(a.type === "interview");
      if (priority !== 0) return priority;
      return (a.time || "99:99").localeCompare(b.time || "99:99");
    });
  const selectedDayTotal = events.filter((event) => event.date === selectedDate).length;
  const monthLabel = `${month.getFullYear()}年 ${month.getMonth() + 1}月`;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">秋</div>
          <div><strong>秋招日历</strong><span>把每一次机会安排得刚刚好</span></div>
        </div>
        <div className="header-actions">
          <label className="search"><span>⌕</span><input ref={searchInputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索公司或岗位" aria-label="搜索公司或岗位" /></label>
          <button className="primary search-button" onClick={() => searchInputRef.current?.focus()}>搜索</button>
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">AUTUMN RECRUITMENT · {new Date().getFullYear()}</p>
          <h1>Your offer is coming.</h1>
          <p className="subtitle">集中管理投递截止、测评和面试，不错过每一个重要节点。</p>
        </div>
        <div className="application-total-card">
          <span>累计投递</span>
          <strong>{stats.applications}<em>家公司</em></strong>
        </div>
      </section>

      <section className="stats-grid" aria-label="秋招数据概览">
        <div className="progress-card coral">
          <div className="progress-head"><div><small>本周待办进度 <span>{weekRangeLabel}</span></small><strong>{stats.weeklyCompleted}<em> / {stats.weeklyTotal} 项</em></strong></div></div>
          <div className="progress-track" aria-label={`本周待办完成 ${weeklyProgress}%`}><i style={{ width: `${weeklyProgress}%` }} /></div>
        </div>
        <div className="progress-card green">
          <div className="progress-head"><div><small>本周面试进度 <span>{weekRangeLabel}</span></small><strong>{stats.weeklyInterviewsCompleted}<em> / {stats.weeklyInterviews} 场</em></strong></div></div>
          <div className="progress-track" aria-label={`本周面试完成 ${interviewProgress}%`}><i style={{ width: `${interviewProgress}%` }} /></div>
        </div>
      </section>

      <section className="workspace">
        <div className="calendar-card">
          <div className="calendar-toolbar">
            <div className="month-switcher">
              <button aria-label="上个月" onClick={() => goToMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
              <div className="month-picker-wrap">
                <button className="month-picker" type="button" aria-haspopup="dialog" aria-expanded={monthMenuOpen} onClick={() => { setPickerYear(month.getFullYear()); setMonthMenuOpen((open) => !open); }}><span>{monthLabel}</span></button>
                {monthMenuOpen && <div className="month-dropdown" role="dialog" aria-label="选择月份">
                  <div className="month-dropdown-head"><button type="button" aria-label="上一年" onClick={() => setPickerYear((year) => Math.max(2024, year - 1))}>‹</button><strong>{pickerYear}年</strong><button type="button" aria-label="下一年" onClick={() => setPickerYear((year) => Math.min(2031, year + 1))}>›</button></div>
                  <div className="month-options">{Array.from({ length: 12 }, (_, index) => <button type="button" key={index} className={pickerYear === month.getFullYear() && index === month.getMonth() ? "active" : ""} onClick={() => { goToMonth(new Date(pickerYear, index, 1)); setMonthMenuOpen(false); }}>{index + 1}月</button>)}</div>
                </div>}
              </div>
              <button aria-label="下个月" onClick={() => goToMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
              <button className="today-btn" onClick={() => { goToMonth(new Date()); setSelectedDate(todayKey); }}>今天</button>
            </div>
            <div className="filters">
              {(["all", "deadline", "assessment", "interview"] as const).map((item) => (
                <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
                  {item === "all" ? "全部" : typeMeta[item].label}
                </button>
              ))}
            </div>
          </div>
          <div className="week-row fixed-week-row">{["一", "二", "三", "四", "五", "六", "日"].map((d, index) => <span key={d} className={index >= 5 ? "weekend" : ""}>周{d}</span>)}</div>
          <div className="calendar-scroll continuous" ref={calendarScrollRef} onScroll={syncMonthFromScroll}>
            {calendarMonths.map((calendarMonth) => {
              const year = calendarMonth.getFullYear();
              const monthIndex = calendarMonth.getMonth();
              const leadingBlanks = (calendarMonth.getDay() + 6) % 7;
              const dayCount = new Date(year, monthIndex + 1, 0).getDate();
              const cells = [...Array.from({ length: leadingBlanks }, () => null), ...Array.from({ length: dayCount }, (_, index) => new Date(year, monthIndex, index + 1))];
              while (cells.length % 7) cells.push(null);
              const monthKey = `${year}-${pad(monthIndex + 1)}`;
              return <section className="calendar-month" data-month={monthKey} key={monthKey}>
                <div className="calendar-grid">
                  {cells.map((date, index) => {
                    if (!date) return <span className="day-cell blank" aria-hidden="true" key={`blank-${index}`} />;
                    const key = toDateKey(date);
                    const dayEvents = filtered.filter((e) => e.date === key);
                    const weekend = date.getDay() === 6 ? "saturday" : date.getDay() === 0 ? "sunday" : "";
                    const nearTerm = key >= weekStartKey && key <= weekEndKey;
                    const extraHoliday = holidayCalendar[key];
                    const holiday = extraHoliday ?? (holidays2026[key] ? { label: holidays2026[key], kind: "holiday" as const } : undefined);
                    const holidayClass = holiday ? (holiday.kind === "workday" ? "makeup-workday" : holiday.kind === "statutory" ? "statutory-holiday" : "holiday") : "";
                    return <button key={key} className={`day-cell ${weekend} ${holidayClass} ${nearTerm ? "near-term" : ""} ${key === todayKey ? "today" : ""} ${key === selectedDate ? "selected" : ""}`} onClick={() => setSelectedDate(key)} onDoubleClick={() => openCreate(key)} title={holiday?.kind === "statutory" ? "2027 年调休安排待国务院办公厅通知" : undefined}>
                      <span className="day-number">{date.getDate()}</span>
                      {holiday && <span className={`holiday-label ${holiday.kind}`}>{holiday.label}</span>}
                      <div className="day-events">
                        {dayEvents.slice(0, 2).map((event) => <span key={event.id} className={`event-chip ${typeMeta[event.type].color} ${event.status === "done" ? "completed" : "pending"}`}><i />{event.company}<b>{event.status === "done" ? "已完成" : typeMeta[event.type].short}</b></span>)}
                        {dayEvents.length > 2 && <span className="more">＋{dayEvents.length - 2}</span>}
                      </div>
                    </button>;
                  })}
                </div>
              </section>;
            })}
          </div>
          <div className="legend">{Object.entries(typeMeta).map(([key, meta]) => <span key={key}><i className={meta.color} />{meta.label}</span>)}<span className="near-term-key"><i />本周</span><small>双击日期可快速添加</small></div>
        </div>

        <aside className="side-panel">
          <div className="side-heading"><div><p>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" })}</p><h2>当日安排（{selectedDayTotal}）</h2></div><button onClick={() => openCreate(selectedDate)} aria-label="添加当天安排">＋</button></div>
          <div className="selected-list">
            {selectedEvents.length ? selectedEvents.map((event) => (
              <div className={`agenda-item ${event.status === "done" ? "completed" : ""}`} key={event.id}>
                <button className="agenda-open" type="button" onClick={() => openEdit(event)} aria-label={`编辑 ${event.company} ${event.role}`}>
                  <span className={`agenda-line ${typeMeta[event.type].color}`} />
                  <span className="agenda-copy"><span className="agenda-mainline"><strong>{event.company}</strong><em>{event.role}{event.time && <span className="agenda-time"> · {event.time}</span>}</em></span></span>
                  <span className={`agenda-type ${typeMeta[event.type].color}`}>{typeMeta[event.type].short}</span>
                </button>
                {event.sourceUrl && <a className="application-link" href={event.sourceUrl} target="_blank" rel="noreferrer" aria-label={`打开 ${event.company} ${event.role} 的投递链接`}>链接</a>}
                <button className="completion-check" type="button" aria-label={event.status === "done" ? "标记为未完成" : "标记为已完成"} aria-pressed={event.status === "done"} onClick={() => toggleCompleted(event.id)}><span>✓</span></button>
              </div>
            )) : <div className="empty"><span>☕</span><strong>这一天还没有安排</strong><p>留一点空白，也留一点呼吸。</p></div>}
          </div>

          <div className="memo-panel">
            <div className="memo-title"><div><h3>备忘录</h3></div><span>自动保存</span></div>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} aria-label="备忘录" />
            <div className="memo-footer"><span>{memo.length} 字</span><button className="trash-button" type="button" onClick={() => setConfirmMemoClear(true)} disabled={!memo} aria-label="清空秋招备忘"><i /></button></div>
          </div>

          <div className="watchlist-panel">
            <div className="watchlist-title"><div><p>APPLICATION QUEUE</p><h3>待投递公司</h3></div><span>{watchCompanies.length} 家</span></div>
            <form className="watchlist-add" onSubmit={addWatchCompany}>
              <input value={watchCompanyDraft} onChange={(e) => setWatchCompanyDraft(e.target.value)} placeholder="输入公司名称" aria-label="待投递公司名称" />
              <select value={watchIntent} onChange={(e) => setWatchIntent(e.target.value as IntentLevel)} aria-label="选择意向度"><option value="high">高意向</option><option value="low">低意向</option></select>
              <button type="submit" disabled={!watchCompanyDraft.trim()} aria-label="添加待投递公司">＋</button>
            </form>
            <div className="intent-groups">
              {(["high", "low"] as const).map((intent) => {
                const companies = watchCompanies.filter((company) => company.intent === intent);
                return <section className={`intent-group ${intent}`} key={intent}>
                  <div className="intent-heading"><span><i />{intent === "high" ? "高意向度" : "低意向度"}</span><b>{companies.length}</b></div>
                  <div className="intent-list">{companies.length ? companies.map((company) => <div className="intent-item" key={company.id}><strong>{company.name}</strong><button type="button" onClick={() => toggleWatchIntent(company.id)} title={intent === "high" ? "移至低意向" : "移至高意向"}>{intent === "high" ? "降" : "升"}</button><button className="remove" type="button" onClick={() => removeWatchCompany(company.id)} aria-label={`删除 ${company.name}`}>×</button></div>) : <p>暂时没有公司</p>}</div>
                </section>;
              })}
            </div>
          </div>
        </aside>
      </section>

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <form className="modal" onSubmit={saveEvent} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-head"><div>{!editingId && <p>记录新机会</p>}<h2 id="modal-title">{editingId ? "更新进展" : "添加秋招安排"}</h2></div><button type="button" aria-label="关闭弹窗" onClick={() => setModalOpen(false)}>×</button></div>
            <div className="form-grid">
              <label><span>公司名称 *</span><input autoFocus required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="例如：腾讯" /></label>
              <label><span>岗位名称 *</span><input required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="例如：产品经理" /></label>
              <div className="date-time-group"><label><span>日期 *</span><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label className="compact-time"><span>具体时间（选填）</span><select aria-label="具体时间" value={form.time ?? ""} onChange={(e) => setForm({ ...form, time: e.target.value })}><option value="">00:00</option>{Array.from({ length: 96 }, (_, index) => { const value = `${pad(Math.floor(index / 4))}:${pad((index % 4) * 15)}`; return <option key={value} value={value}>{value}</option>; })}</select></label></div>
              <label><span>进度</span><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EventType })}>{Object.entries(typeMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</select></label>
              <label className="full"><span>招聘 / 投递链接</span><input type="url" value={form.sourceUrl ?? ""} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://…（以后可从记录中直接打开）" /></label>
              <label className="full"><span>备注</span><textarea rows={5} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="面试轮次、测评链接、需要准备的内容……" /></label>
            </div>
            <div className="modal-actions">{editingId && <button type="button" className="danger" onClick={() => setConfirmEventDelete(true)}>删除</button>}<span /><button type="button" className="secondary" onClick={() => setModalOpen(false)}>取消</button><button className="primary" type="submit">保存</button></div>
          </form>
        </div>
      )}

      {confirmMemoClear && (
        <div className="confirm-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmMemoClear(false); }}>
          <div className="confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
            <span className="confirm-icon"><i /></span>
            <h2 id="confirm-title">确认清空备忘？</h2>
            <p id="confirm-description">清空后无法恢复，已记录的备忘内容将全部删除。</p>
            <div><button className="secondary" type="button" onClick={() => setConfirmMemoClear(false)}>取消</button><button className="confirm-danger" type="button" onClick={() => { setMemo(""); setConfirmMemoClear(false); }}>确认清空</button></div>
          </div>
        </div>
      )}

      {confirmEventDelete && (
        <div className="confirm-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmEventDelete(false); }}>
          <div className="confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="delete-event-title" aria-describedby="delete-event-description">
            <span className="confirm-icon"><i /></span>
            <h2 id="delete-event-title">确认删除安排？</h2>
            <p id="delete-event-description">删除后无法恢复，这条秋招进展将从日历中移除。</p>
            <div><button className="secondary" type="button" onClick={() => setConfirmEventDelete(false)}>取消</button><button className="confirm-danger" type="button" onClick={removeEvent}>确认删除</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
