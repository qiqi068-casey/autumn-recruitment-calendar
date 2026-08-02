"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type EventType = "deadline" | "application" | "assessment" | "interview";
type EventStatus = "todo" | "progress" | "done";
type RecruitEvent = {
  id: string;
  company: string;
  role: string;
  date: string;
  time?: string;
  type: EventType;
  status: EventStatus;
  note?: string;
};

const typeMeta: Record<EventType, { label: string; short: string; color: string }> = {
  deadline: { label: "投递 DDL", short: "DDL", color: "coral" },
  application: { label: "已投递", short: "投递", color: "blue" },
  assessment: { label: "笔试 / 测评", short: "测评", color: "purple" },
  interview: { label: "面试", short: "面试", color: "green" },
};

const pad = (n: number) => String(n).padStart(2, "0");
const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = toDateKey(new Date());

function offsetDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

const holidays2026: Record<string, string> = {
  "2026-01-01": "元旦", "2026-01-02": "元旦", "2026-01-03": "元旦",
  "2026-02-15": "春节", "2026-02-16": "春节", "2026-02-17": "春节", "2026-02-18": "春节", "2026-02-19": "春节", "2026-02-20": "春节", "2026-02-21": "春节", "2026-02-22": "春节", "2026-02-23": "春节",
  "2026-04-04": "清明", "2026-04-05": "清明", "2026-04-06": "清明",
  "2026-05-01": "劳动节", "2026-05-02": "劳动节", "2026-05-03": "劳动节", "2026-05-04": "劳动节", "2026-05-05": "劳动节",
  "2026-06-19": "端午", "2026-06-20": "端午", "2026-06-21": "端午",
  "2026-09-25": "中秋", "2026-09-26": "中秋", "2026-09-27": "中秋",
  "2026-10-01": "国庆", "2026-10-02": "国庆", "2026-10-03": "国庆", "2026-10-04": "国庆", "2026-10-05": "国庆", "2026-10-06": "国庆", "2026-10-07": "国庆",
};

const initialEvents: RecruitEvent[] = [
  { id: "1", company: "字节跳动", role: "产品经理", date: offsetDate(1), type: "deadline", status: "todo", note: "完善项目经历后投递" },
  { id: "2", company: "腾讯", role: "用户研究", date: todayKey, type: "application", status: "done", note: "官网校招渠道" },
  { id: "3", company: "美团", role: "商业分析", date: offsetDate(2), time: "19:00", type: "assessment", status: "todo", note: "提前测试摄像头" },
  { id: "4", company: "阿里巴巴", role: "策略运营", date: offsetDate(4), time: "14:30", type: "interview", status: "progress", note: "一面｜业务面" },
  { id: "5", company: "小红书", role: "社区运营", date: offsetDate(-2), type: "application", status: "done" },
  { id: "6", company: "京东", role: "管培生", date: offsetDate(7), type: "deadline", status: "todo" },
];

const emptyForm = (): Omit<RecruitEvent, "id"> => ({
  company: "",
  role: "",
  date: todayKey,
  time: "",
  type: "deadline",
  status: "todo",
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
  const [confirmMemoClear, setConfirmMemoClear] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("autumn-recruitment-events");
    if (saved) {
      try { setEvents(JSON.parse(saved)); } catch { /* keep demo data */ }
    }
    setMemo(localStorage.getItem("autumn-recruitment-memo") ?? "");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem("autumn-recruitment-events", JSON.stringify(events));
  }, [events, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem("autumn-recruitment-memo", memo);
  }, [memo, hydrated]);

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

  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);

  const nearTermEndKey = offsetDate(6);
  const nearTermEvents = events.filter((event) => event.date >= todayKey && event.date <= nearTermEndKey);
  const stats = {
    applications: new Set(nearTermEvents.filter((event) => event.type !== "deadline").map((event) => event.company.trim().toLowerCase())).size,
    upcoming: nearTermEvents.length,
    interviews: nearTermEvents.filter((event) => event.type === "interview" && event.status === "done").length,
    completed: nearTermEvents.filter((event) => event.status === "done").length,
  };

  function openCreate(date = selectedDate) {
    setEditingId(null);
    setForm({ ...emptyForm(), date });
    setModalOpen(true);
  }

  function openEdit(event: RecruitEvent) {
    setEditingId(event.id);
    setForm({ company: event.company, role: event.role, date: event.date, time: event.time ?? "", type: event.type, status: event.status, note: event.note ?? "" });
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
    setModalOpen(false);
  }

  function updateTime(part: "hour" | "minute", value: string) {
    const [currentHour = "", currentMinute = ""] = form.time?.split(":") ?? [];
    const hour = part === "hour" ? value : currentHour;
    const minute = part === "minute" ? value : currentMinute;
    setForm({ ...form, time: hour ? `${hour}:${minute || "00"}` : "" });
  }

  function toggleCompleted(id: string) {
    setEvents((all) => all.map((event) => event.id === id
      ? { ...event, status: event.status === "done" ? "todo" : "done" }
      : event));
  }

  const selectedEvents = filtered.filter((e) => e.date === selectedDate);
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
          <h1>今天也在向理想 offer<br />靠近一点点。</h1>
          <p className="subtitle">集中管理投递截止、测评和面试，不错过每一个重要节点。</p>
        </div>
        <div className="quote-card">
          <span className="quote-mark">“</span>
          <p>别让机会藏在聊天记录里，<br />把它放进日历。</p>
          <small>{new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })}</small>
        </div>
      </section>

      <section className="stats-grid" aria-label="秋招数据概览">
        <div className="stat-card blue"><div><small>累计投递</small><strong>{stats.applications}<em>家公司</em></strong><span>今天起 7 天内进入投递流程</span></div></div>
        <div className="stat-card coral"><div><small>全部安排</small><strong>{stats.upcoming}<em>项</em></strong><span>今天起 7 天内所有日程</span></div></div>
        <div className="stat-card green"><div><small>完成面试</small><strong>{stats.interviews}<em>场</em></strong><span>今天起 7 天内已勾选面试</span></div></div>
        <div className="stat-card purple"><div><small>已完成</small><strong>{stats.completed}<em>项</em></strong><span>今天起 7 天内已勾选安排</span></div></div>
      </section>

      <section className="workspace">
        <div className="calendar-card">
          <div className="calendar-toolbar">
            <div className="month-switcher">
              <button aria-label="上个月" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
              <h2>{monthLabel}</h2>
              <button aria-label="下个月" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
              <button className="today-btn" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSelectedDate(todayKey); }}>今天</button>
            </div>
            <div className="filters">
              {(["all", "deadline", "application", "assessment", "interview"] as const).map((item) => (
                <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
                  {item === "all" ? "全部" : typeMeta[item].label}
                </button>
              ))}
            </div>
          </div>
          <div className="week-row">{["一", "二", "三", "四", "五", "六", "日"].map((d, index) => <span key={d} className={index === 5 ? "saturday" : index === 6 ? "sunday" : ""}>周{d}</span>)}</div>
          <div className="calendar-grid">
            {calendarDays.map((date) => {
              const key = toDateKey(date);
              const dayEvents = filtered.filter((e) => e.date === key);
              const outside = date.getMonth() !== month.getMonth();
              const weekend = date.getDay() === 6 ? "saturday" : date.getDay() === 0 ? "sunday" : "";
              const nearTerm = key >= todayKey && key <= nearTermEndKey;
              const holiday = holidays2026[key];
              return (
                <button key={key} className={`day-cell ${outside ? "outside" : ""} ${weekend} ${holiday ? "holiday" : ""} ${nearTerm ? "near-term" : ""} ${key === todayKey ? "today" : ""} ${key === selectedDate ? "selected" : ""}`} onClick={() => setSelectedDate(key)} onDoubleClick={() => openCreate(key)}>
                  <span className="day-number">{date.getDate()}</span>
                  {holiday && <span className="holiday-label">{holiday}</span>}
                  <div className="day-events">
                    {dayEvents.slice(0, 3).map((event) => <span key={event.id} className={`event-chip ${typeMeta[event.type].color} ${event.status === "done" ? "completed" : "pending"}`}><i />{event.company}<b>{event.status === "done" ? "已完成" : typeMeta[event.type].short}</b></span>)}
                    {dayEvents.length > 3 && <span className="more">另有 {dayEvents.length - 3} 项</span>}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="legend">{Object.entries(typeMeta).map(([key, meta]) => <span key={key}><i className={meta.color} />{meta.label}</span>)}<span className="near-term-key"><i />近 7 天</span><small>双击日期可快速添加</small></div>
        </div>

        <aside className="side-panel">
          <div className="side-heading"><div><p>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" })}</p><h2>当日安排</h2></div><button onClick={() => openCreate(selectedDate)} aria-label="添加当天安排">＋</button></div>
          <div className="selected-list">
            {selectedEvents.length ? selectedEvents.map((event) => (
              <div className={`agenda-item ${event.status === "done" ? "completed" : ""}`} key={event.id}>
                <button className="agenda-open" type="button" onClick={() => openEdit(event)} aria-label={`编辑 ${event.company} ${event.role}`}>
                  <span className={`agenda-line ${typeMeta[event.type].color}`} />
                  <span className="agenda-copy"><small>{typeMeta[event.type].label}</small><span className="agenda-mainline"><strong>{event.company}</strong><em>{event.role}{event.time && <span className="agenda-time"> · {event.time}</span>}</em></span></span>
                </button>
                <button className="completion-check" type="button" aria-label={event.status === "done" ? "标记为未完成" : "标记为已完成"} aria-pressed={event.status === "done"} onClick={() => toggleCompleted(event.id)}><span>✓</span></button>
              </div>
            )) : <div className="empty"><span>☕</span><strong>这一天还没有安排</strong><p>留一点空白，也留一点呼吸。</p></div>}
          </div>

          <div className="memo-panel">
            <div className="memo-title"><div><h3>备忘录</h3></div><span>自动保存</span></div>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} aria-label="备忘录" />
            <div className="memo-footer"><span>{memo.length} 字</span><button className="trash-button" type="button" onClick={() => setConfirmMemoClear(true)} disabled={!memo} aria-label="清空秋招备忘"><i /></button></div>
          </div>
        </aside>
      </section>

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <form className="modal" onSubmit={saveEvent} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-head"><div><p>{editingId ? "更新进展" : "记录新机会"}</p><h2 id="modal-title">{editingId ? "编辑秋招安排" : "添加秋招安排"}</h2></div><button type="button" aria-label="关闭弹窗" onClick={() => setModalOpen(false)}>×</button></div>
            <div className="form-grid">
              <label><span>公司名称 *</span><input autoFocus required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="例如：腾讯" /></label>
              <label><span>岗位名称 *</span><input required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="例如：产品经理" /></label>
              <label><span>日期 *</span><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
              <label><span>具体时间</span><span className="time-selects"><select aria-label="小时" value={form.time?.split(":")[0] ?? ""} onChange={(e) => updateTime("hour", e.target.value)}><option value="">小时</option>{Array.from({ length: 24 }, (_, hour) => pad(hour)).map((hour) => <option key={hour} value={hour}>{hour} 时</option>)}</select><b>:</b><select aria-label="分钟" value={form.time?.split(":")[1] ?? "00"} disabled={!form.time} onChange={(e) => updateTime("minute", e.target.value)}>{["00", "15", "30", "45"].map((minute) => <option key={minute} value={minute}>{minute} 分</option>)}</select></span></label>
              <label><span>安排类型</span><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EventType })}>{Object.entries(typeMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</select></label>
              <label className="full"><span>备注</span><textarea rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="面试轮次、测评链接、需要准备的内容……" /></label>
            </div>
            <div className="modal-actions">{editingId && <button type="button" className="danger" onClick={removeEvent}>删除</button>}<span /><button type="button" className="secondary" onClick={() => setModalOpen(false)}>取消</button><button className="primary" type="submit">保存安排</button></div>
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
    </main>
  );
}
