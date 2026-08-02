"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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

const statusLabel: Record<EventStatus, string> = {
  todo: "待处理",
  progress: "进行中",
  done: "已完成",
};

const pad = (n: number) => String(n).padStart(2, "0");
const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = toDateKey(new Date());

function offsetDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

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

  useEffect(() => {
    const saved = localStorage.getItem("autumn-recruitment-events");
    if (saved) {
      try { setEvents(JSON.parse(saved)); } catch { /* keep demo data */ }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem("autumn-recruitment-events", JSON.stringify(events));
  }, [events, hydrated]);

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

  const upcoming = useMemo(() => [...events]
    .filter((e) => e.date >= todayKey && e.status !== "done")
    .sort((a, b) => `${a.date}${a.time ?? ""}`.localeCompare(`${b.date}${b.time ?? ""}`))
    .slice(0, 6), [events]);

  const stats = {
    applications: events.filter((e) => e.type === "application").length,
    upcoming: events.filter((e) => e.date >= todayKey && e.status !== "done").length,
    interviews: events.filter((e) => e.type === "interview").length,
    completed: events.filter((e) => e.status === "done").length,
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
          <label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索公司或岗位" aria-label="搜索公司或岗位" /></label>
          <button className="primary" onClick={() => openCreate()}>＋ 添加安排</button>
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
        <div className="stat-card"><span className="stat-icon blue">↗</span><div><small>累计投递</small><strong>{stats.applications}</strong></div><em>家公司</em></div>
        <div className="stat-card"><span className="stat-icon coral">◷</span><div><small>待办安排</small><strong>{stats.upcoming}</strong></div><em>项</em></div>
        <div className="stat-card"><span className="stat-icon green">◎</span><div><small>面试进程</small><strong>{stats.interviews}</strong></div><em>场</em></div>
        <div className="stat-card"><span className="stat-icon purple">✓</span><div><small>已完成</small><strong>{stats.completed}</strong></div><em>项</em></div>
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
          <div className="week-row">{["一", "二", "三", "四", "五", "六", "日"].map((d) => <span key={d}>周{d}</span>)}</div>
          <div className="calendar-grid">
            {calendarDays.map((date) => {
              const key = toDateKey(date);
              const dayEvents = filtered.filter((e) => e.date === key);
              const outside = date.getMonth() !== month.getMonth();
              return (
                <button key={key} className={`day-cell ${outside ? "outside" : ""} ${key === todayKey ? "today" : ""} ${key === selectedDate ? "selected" : ""}`} onClick={() => setSelectedDate(key)} onDoubleClick={() => openCreate(key)}>
                  <span className="day-number">{date.getDate()}</span>
                  <div className="day-events">
                    {dayEvents.slice(0, 3).map((event) => <span key={event.id} className={`event-chip ${typeMeta[event.type].color}`}><i />{event.company}<b>{typeMeta[event.type].short}</b></span>)}
                    {dayEvents.length > 3 && <span className="more">另有 {dayEvents.length - 3} 项</span>}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="legend">{Object.entries(typeMeta).map(([key, meta]) => <span key={key}><i className={meta.color} />{meta.label}</span>)}<small>双击日期可快速添加</small></div>
        </div>

        <aside className="side-panel">
          <div className="side-heading"><div><p>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" })}</p><h2>当日安排</h2></div><button onClick={() => openCreate(selectedDate)} aria-label="添加当天安排">＋</button></div>
          <div className="selected-list">
            {selectedEvents.length ? selectedEvents.map((event) => (
              <button className="agenda-item" key={event.id} onClick={() => openEdit(event)}>
                <span className={`agenda-line ${typeMeta[event.type].color}`} />
                <span className="agenda-copy"><small>{event.time || typeMeta[event.type].label}</small><strong>{event.company}</strong><em>{event.role}</em></span>
                <span className={`status ${event.status}`}>{statusLabel[event.status]}</span>
              </button>
            )) : <div className="empty"><span>☕</span><strong>这一天还没有安排</strong><p>留一点空白，也留一点呼吸。</p></div>}
          </div>

          <div className="upcoming-title"><h3>接下来</h3><span>{upcoming.length} 项待办</span></div>
          <div className="upcoming-list">
            {upcoming.slice(0, 4).map((event) => (
              <button key={event.id} onClick={() => { setSelectedDate(event.date); openEdit(event); }}>
                <span className="date-tile"><b>{new Date(`${event.date}T12:00:00`).getDate()}</b><small>{new Date(`${event.date}T12:00:00`).toLocaleDateString("zh-CN", { month: "short" })}</small></span>
                <span><strong>{event.company} · {typeMeta[event.type].short}</strong><small>{event.role}{event.time ? ` · ${event.time}` : ""}</small></span>
              </button>
            ))}
          </div>
        </aside>
      </section>

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <form className="modal" onSubmit={saveEvent}>
            <div className="modal-head"><div><p>{editingId ? "更新进展" : "记录新机会"}</p><h2>{editingId ? "编辑秋招安排" : "添加秋招安排"}</h2></div><button type="button" onClick={() => setModalOpen(false)}>×</button></div>
            <div className="form-grid">
              <label><span>公司名称 *</span><input autoFocus required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="例如：腾讯" /></label>
              <label><span>岗位名称 *</span><input required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="例如：产品经理" /></label>
              <label><span>日期 *</span><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
              <label><span>时间</span><input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label>
              <label><span>安排类型</span><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EventType })}>{Object.entries(typeMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</select></label>
              <label><span>当前状态</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EventStatus })}>{Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              <label className="full"><span>备注</span><textarea rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="面试轮次、测评链接、需要准备的内容……" /></label>
            </div>
            <div className="modal-actions">{editingId && <button type="button" className="danger" onClick={removeEvent}>删除</button>}<span /><button type="button" className="secondary" onClick={() => setModalOpen(false)}>取消</button><button className="primary" type="submit">保存安排</button></div>
          </form>
        </div>
      )}
    </main>
  );
}
