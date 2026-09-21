import React, { useMemo, useState, useEffect } from 'react';
import { User, Checkin, EventItem } from '../types';
import { format, addDays, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import Papa from 'papaparse';

interface ShiftOverviewSheetProps {
  users: User[];
  checkins: Checkin[];
  onClose: () => void;
  event?: EventItem | null;
  eventsList?: EventItem[];
}

const SHIFT_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Ca Sáng':   { bg: 'bg-amber-50',   text: 'text-amber-800',   border: 'border-amber-300',   dot: 'bg-amber-400'   },
  'Ca Chiều':  { bg: 'bg-sky-50',     text: 'text-sky-800',     border: 'border-sky-300',     dot: 'bg-sky-400'     },
  'Ca Tối':    { bg: 'bg-violet-50',  text: 'text-violet-800',  border: 'border-violet-300',  dot: 'bg-violet-400'  },
  'Ca Cả Ngày':{ bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-400' },
  'default':   { bg: 'bg-gray-50',    text: 'text-gray-700',    border: 'border-gray-200',    dot: 'bg-gray-400'    },
};

function getShiftColor(shiftName?: string) {
  if (!shiftName) return SHIFT_COLORS.default;
  if (shiftName.includes('Sáng'))    return SHIFT_COLORS['Ca Sáng'];
  if (shiftName.includes('Chiều'))   return SHIFT_COLORS['Ca Chiều'];
  if (shiftName.includes('Tối') || shiftName.toLowerCase().includes('ot')) return SHIFT_COLORS['Ca Tối'];
  if (shiftName.includes('Cả Ngày') || shiftName.includes('Ngày')) return SHIFT_COLORS['Ca Cả Ngày'];
  return SHIFT_COLORS.default;
}

function getShiftShortName(shiftName?: string): string {
  if (!shiftName) return '—';
  if (shiftName.includes('Sáng'))    return 'Ca Sáng';
  if (shiftName.includes('Chiều'))   return 'Ca Chiều';
  if (shiftName.includes('Tối') || shiftName.toLowerCase().includes('ot')) return 'Ca Tối/OT';
  if (shiftName.includes('Cả Ngày') || shiftName.includes('Ngày')) return 'Cả Ngày';
  const match = shiftName.match(/\((.+)\)/);
  return match ? match[1] : shiftName.split(' ').slice(0, 2).join(' ');
}

export default function ShiftOverviewSheet({ users, checkins, onClose, event, eventsList = [] }: ShiftOverviewSheetProps) {
  const today = format(new Date(), 'yyyy-MM-dd');

  // Selected event filter inside the sheet (can switch between events)
  const [selectedEventId, setSelectedEventId] = useState<string>(() => {
    if (event?.id) return event.id;
    if (eventsList.length > 0) return eventsList[0].id;
    return 'all';
  });

  const activeEvent = useMemo(() => {
    if (selectedEventId === 'all') return null;
    return eventsList.find(e => e.id === selectedEventId) || event || null;
  }, [selectedEventId, eventsList, event]);

  // Filter checkins for the selected event
  const scopedCheckins = useMemo(() => {
    if (!activeEvent) return checkins;
    return checkins.filter(c => 
      c.eventId === activeEvent.id || 
      c.eventName === activeEvent.name || 
      (!c.eventId && !c.eventName && eventsList.length === 1)
    );
  }, [checkins, activeEvent, eventsList]);

  // Filter users relevant to this event
  const scopedUsers = useMemo(() => {
    if (!activeEvent) return users;
    const eventUserIds = new Set(scopedCheckins.map(c => c.userId));
    return users.filter(u => 
      u.eventId === activeEvent.id || 
      u.eventName === activeEvent.name || 
      eventUserIds.has(u.id) ||
      (!u.eventId && !u.eventName && eventsList.length === 1)
    );
  }, [users, scopedCheckins, activeEvent, eventsList]);

  const [startDate, setStartDate] = useState<string>(() => {
    if (event?.startDate) return event.startDate;
    const dates = scopedCheckins.map(c => c.workDate).filter(Boolean) as string[];
    if (dates.length === 0) return format(addDays(new Date(), -3), 'yyyy-MM-dd');
    return [...dates].sort()[0];
  });

  const [endDate, setEndDate] = useState<string>(() => {
    if (event?.endDate) return event.endDate;
    const dates = scopedCheckins.map(c => c.workDate).filter(Boolean) as string[];
    if (dates.length === 0) return format(addDays(new Date(), 4), 'yyyy-MM-dd');
    return [...dates].sort().reverse()[0];
  });

  // When activeEvent changes, update date range if event has dates
  useEffect(() => {
    if (activeEvent?.startDate && activeEvent?.endDate) {
      setStartDate(activeEvent.startDate);
      setEndDate(activeEvent.endDate);
    }
  }, [activeEvent?.id]);

  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightUser, setHighlightUser] = useState<string | null>(null);

  const dateColumns = useMemo<string[]>(() => {
    if (!startDate || !endDate) return [];
    const cols: string[] = [];
    try {
      let cur = parseISO(startDate);
      const end = parseISO(endDate);
      if (cur > end) return [];
      while (cur <= end) {
        cols.push(format(cur, 'yyyy-MM-dd'));
        cur = addDays(cur, 1);
      }
    } catch {
      return [];
    }
    return cols.slice(0, 31);
  }, [startDate, endDate]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return scopedUsers.filter(u =>
      !term ||
      u.fullName.toLowerCase().includes(term) ||
      (u.workRole || '').toLowerCase().includes(term) ||
      u.department.toLowerCase().includes(term) ||
      (u.phone || '').includes(term)
    );
  }, [scopedUsers, searchTerm]);

  const checkinMap = useMemo(() => {
    const map = new Map<string, Map<string, Checkin[]>>();
    scopedCheckins.forEach(c => {
      if (!c.workDate) return;
      if (statusFilter !== 'all' && c.status !== statusFilter) return;
      if (!map.has(c.userId)) map.set(c.userId, new Map());
      const dateMap = map.get(c.userId)!;
      if (!dateMap.has(c.workDate)) dateMap.set(c.workDate, []);
      dateMap.get(c.workDate)!.push(c);
    });
    return map;
  }, [scopedCheckins, statusFilter]);

  const userStats = useMemo(() => {
    const stats: Record<string, { approved: number; pending: number }> = {};
    filteredUsers.forEach(u => {
      const allUserCheckins = scopedCheckins.filter(c => c.userId === u.id);
      stats[u.id] = {
        approved: allUserCheckins.filter(c => c.status === 'approved').length,
        pending:  allUserCheckins.filter(c => c.status === 'pending').length,
      };
    });
    return stats;
  }, [filteredUsers, scopedCheckins]);

  const formatColDate = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      return {
        dayName: format(d, 'EEE', { locale: vi }),
        dayNum:  format(d, 'dd/MM'),
        isToday:   dateStr === today,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      };
    } catch {
      return { dayName: '', dayNum: dateStr, isToday: false, isWeekend: false };
    }
  };

  const totalApproved = scopedCheckins.filter(c => c.status === 'approved').length;
  const totalPending  = scopedCheckins.filter(c => c.status === 'pending').length;

  const handleExportCSV = () => {
    const rows = filteredUsers.map(u => {
      const uShifts = scopedCheckins.filter(c => c.userId === u.id && c.status === 'approved');
      const row: Record<string, any> = {
        'Họ và Tên': u.fullName,
        'Số điện thoại': `"${u.phone}"`,
        'Bộ phận': u.department,
        'Sự kiện': activeEvent?.name || 'Tất cả sự kiện',
        'Tổng ca đã duyệt': uShifts.length,
      };
      dateColumns.forEach(d => {
        const shiftsOnDate = scopedCheckins.filter(c => c.userId === u.id && c.workDate === d);
        row[d] = shiftsOnDate.map(s => `${s.shiftName} (${s.status === 'approved' ? 'Duyệt' : 'Chờ'})`).join(' | ') || '—';
      });
      return row;
    });

    const csv = Papa.unparse(rows);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Tong_Hop_Ca_${activeEvent ? activeEvent.name.replace(/\s+/g, '_') : 'Tat_Ca'}_${format(new Date(), 'dd_MM_yyyy')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col">
      <div className="flex flex-col h-full max-h-screen bg-white shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gradient-to-r from-purple-700 via-indigo-700 to-violet-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl shadow-inner">
              📊
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-white font-black text-base tracking-tight">
                  Tổng Hợp Ca Làm Việc
                </h2>
                {activeEvent ? (
                  <span className="bg-amber-300 text-amber-950 font-black text-[11px] px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                    <span>🎉</span> {activeEvent.name}
                  </span>
                ) : (
                  <span className="bg-white/20 text-white font-bold text-[11px] px-2.5 py-0.5 rounded-full">
                    Toàn bộ sự kiện
                  </span>
                )}
              </div>
              <p className="text-purple-100 text-[11px] mt-0.5">
                Bảng ma trận ca làm chi tiết theo từng sự kiện · Ai làm ca nào, ngày nào, trạng thái điểm danh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition border border-white/20"
            >
              <span>📥</span> Xuất CSV
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition text-lg font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-2.5 border-b border-gray-100 bg-gray-50/80 shrink-0">
          {/* Event Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-purple-200 rounded-xl px-2.5 py-1 shadow-2xs">
            <span className="text-xs font-extrabold text-purple-900 flex items-center gap-1">
              <span>🎪</span> Sự kiện:
            </span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="text-xs font-bold text-gray-800 bg-transparent outline-none cursor-pointer pr-2"
            >
              {eventsList.length > 1 && <option value="all">🌐 Tất cả sự kiện</option>}
              {eventsList.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} {ev.status === 'active' ? '(Đang mở)' : '(Đã khóa)'}
                </option>
              ))}
            </select>
          </div>

          {/* Date Pickers */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-500">Từ:</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-purple-400 bg-white shadow-2xs" 
            />
            <span className="text-xs font-bold text-gray-500">Đến:</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-purple-400 bg-white shadow-2xs" 
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            {(['all', 'approved', 'pending'] as const).map(s => (
              <button 
                key={s} 
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition ${
                  statusFilter === s
                    ? s === 'all' ? 'bg-gray-900 text-white'
                      : s === 'approved' ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {s === 'all' ? '🔍 Tất Cả' : s === 'approved' ? '✅ Đã Duyệt' : '⏳ Chờ Duyệt'}
              </button>
            ))}
          </div>

          {/* Search */}
          <input 
            type="text" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="🔎 Tìm TNV, bộ phận..."
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-purple-400 bg-white shadow-2xs w-48 sm:w-56" 
          />

          {/* Shift Color Legends */}
          <div className="ml-auto flex items-center gap-3 flex-wrap">
            {Object.entries(SHIFT_COLORS).filter(([k]) => k !== 'default').map(([name, cls]) => (
              <div key={name} className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-full ${cls.dot}`}></span>
                <span className="text-[10px] text-gray-600 font-bold">{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sheet Body ── */}
        <div className="flex-1 overflow-auto">
          {dateColumns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm space-y-2">
              <span className="text-3xl">📅</span>
              <div>Vui lòng chọn khoảng ngày hợp lệ để hiển thị bảng tổng hợp ca.</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm space-y-2">
              <span className="text-3xl">👥</span>
              <div>Không tìm thấy nhân sự hoặc lịch làm việc nào thuộc sự kiện này.</div>
            </div>
          ) : (
            <table className="border-collapse text-xs" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
              <thead className="sticky top-0 z-20">
                <tr>
                  {/* Name header – frozen */}
                  <th style={{ minWidth: 200, width: 200, position: 'sticky', left: 0, zIndex: 30 }}
                    className="bg-purple-800 text-white px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider border-b border-r border-purple-600 shadow-sm whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>👥</span> Nhân Sự ({filteredUsers.length})
                    </div>
                  </th>
                  {/* Ca duyệt – frozen */}
                  <th style={{ minWidth: 72, width: 72, position: 'sticky', left: 200, zIndex: 29 }}
                    className="bg-purple-900 text-purple-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider border-b border-r border-purple-700 whitespace-nowrap">
                    ✅ Duyệt
                  </th>
                  {/* Chờ duyệt – frozen */}
                  <th style={{ minWidth: 72, width: 72, position: 'sticky', left: 272, zIndex: 29 }}
                    className="bg-purple-900 text-amber-300 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider border-b border-r border-purple-700 whitespace-nowrap">
                    ⏳ Chờ
                  </th>
                  {/* Date columns */}
                  {dateColumns.map(d => {
                    const { dayName, dayNum, isToday, isWeekend } = formatColDate(d);
                    return (
                      <th key={d} style={{ minWidth: 130, width: 130 }}
                        className={`px-2 py-2 text-center border-b border-r text-[11px] font-bold whitespace-nowrap transition ${
                          isToday ? 'bg-purple-600 text-white border-purple-500'
                            : isWeekend ? 'bg-rose-50 text-rose-700 border-rose-100'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                        <div className={`text-[9px] uppercase font-bold ${isToday ? 'text-purple-100' : isWeekend ? 'text-rose-400' : 'text-gray-400'}`}>
                          {dayName}
                        </div>
                        <div className="font-extrabold mt-0.5">{dayNum}</div>
                        {isToday && <div className="text-[8px] text-purple-100 mt-0.5 font-bold">Hôm nay</div>}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user, rowIdx) => {
                  const dateMap = checkinMap.get(user.id);
                  const stats  = userStats[user.id] ?? { approved: 0, pending: 0 };
                  const isHighlighted = highlightUser === user.id;
                  const rowBg = isHighlighted ? 'bg-purple-50' : rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40';

                  return (
                    <tr key={user.id}
                      className={`group ${rowBg} hover:bg-purple-50/60 transition-colors cursor-pointer`}
                      onClick={() => setHighlightUser(isHighlighted ? null : user.id)}>

                      {/* Frozen name */}
                      <td style={{ position: 'sticky', left: 0, zIndex: 10 }}
                        className={`px-3 py-2.5 border-b border-r border-gray-100 ${rowBg} group-hover:bg-purple-50/60`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 shadow-sm ${
                            isHighlighted ? 'bg-purple-600 text-white' : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
                          }`}>
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 text-[12px] truncate">{user.fullName}</div>
                            <div className="text-[10px] text-gray-400 truncate">{user.workRole || user.department}</div>
                          </div>
                        </div>
                      </td>

                      {/* Frozen: approved count */}
                      <td style={{ position: 'sticky', left: 200, zIndex: 9 }}
                        className={`px-2 py-2.5 text-center border-b border-r border-gray-100 ${rowBg} group-hover:bg-purple-50/60`}>
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-100 text-emerald-800 text-[11px] font-black rounded-lg">
                          {stats.approved}
                        </span>
                      </td>

                      {/* Frozen: pending count */}
                      <td style={{ position: 'sticky', left: 272, zIndex: 9 }}
                        className={`px-2 py-2.5 text-center border-b border-r border-gray-100 ${rowBg} group-hover:bg-purple-50/60`}>
                        {stats.pending > 0 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-100 text-amber-700 text-[11px] font-black rounded-lg">
                            {stats.pending}
                          </span>
                        ) : (
                          <span className="text-gray-200">—</span>
                        )}
                      </td>

                      {/* Date cells */}
                      {dateColumns.map(d => {
                        const shifts = dateMap?.get(d) ?? [];
                        const { isToday, isWeekend } = formatColDate(d);
                        const cellBg = isToday ? 'bg-purple-50/40' : isWeekend ? 'bg-rose-50/30' : '';

                        return (
                          <td key={d} style={{ verticalAlign: 'top', minWidth: 130, width: 130 }}
                            className={`px-1.5 py-1.5 border-b border-r border-gray-100 align-top ${cellBg}`}>
                            {shifts.length === 0 ? (
                              <div className="h-8 flex items-center justify-center">
                                <span className="text-gray-200 text-lg select-none">·</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {shifts.map((shift, si) => {
                                  const col = getShiftColor(shift.shiftName);
                                  return (
                                    <div key={shift.id ?? si}
                                      className={`rounded-md px-1.5 py-1 border ${col.bg} ${col.border}`}
                                      title={[
                                        shift.shiftName || 'Ca',
                                        shift.department || user.workRole || user.department,
                                        shift.status === 'approved' ? '✅ Đã duyệt' : '⏳ Chờ duyệt',
                                        shift.checkinTime ? `📍 In: ${format(shift.checkinTime, 'HH:mm')}` : null,
                                        shift.checkoutTime ? `🏁 Out: ${format(shift.checkoutTime, 'HH:mm')}` : null,
                                        shift.otHours ? `OT: ${shift.otHours}h` : null,
                                        shift.adminNote ? `Ghi chú: ${shift.adminNote}` : null,
                                      ].filter(Boolean).join(' | ')}>
                                      <div className="flex items-center gap-1">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${col.dot}`}></span>
                                        <span className={`text-[10px] font-extrabold truncate ${col.text}`}>
                                          {getShiftShortName(shift.shiftName)}
                                        </span>
                                        {shift.status === 'pending' && (
                                          <span className="ml-auto text-[8px] bg-amber-200 text-amber-800 px-1 rounded font-bold shrink-0">Chờ</span>
                                        )}
                                        {shift.status === 'approved' && (
                                          <span className="ml-auto text-[9px] text-emerald-500 shrink-0">✓</span>
                                        )}
                                      </div>
                                      <div className={`text-[10px] truncate ${col.text} opacity-75 leading-tight`}>
                                        {shift.department || user.workRole || user.department || '—'}
                                      </div>
                                      {shift.checkinTime && (
                                        <div className="text-[9px] text-gray-500 font-semibold flex items-center justify-between">
                                          <span>📍 {format(shift.checkinTime, 'HH:mm')}</span>
                                          {shift.checkoutTime && <span>🏁 {format(shift.checkoutTime, 'HH:mm')}</span>}
                                        </div>
                                      )}
                                      {shift.otHours ? (
                                        <div className="text-[9px] text-violet-600 font-bold">+{shift.otHours}h OT</div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50 shrink-0 flex flex-wrap items-center gap-4 text-[11px] text-gray-500">
          <span>🎪 Sự kiện: <b className="text-purple-900 font-bold">{activeEvent ? activeEvent.name : 'Tất cả'}</b></span>
          <span>📅 <b className="text-gray-700">{dateColumns.length}</b> ngày</span>
          <span>👥 <b className="text-gray-700">{filteredUsers.length}</b> nhân sự</span>
          <span>✅ <b className="text-emerald-600">{totalApproved}</b> ca đã duyệt</span>
          <span>⏳ <b className="text-amber-600">{totalPending}</b> ca chờ duyệt</span>
          <span className="ml-auto text-gray-400 italic">Click vào hàng để highlight • Hover vào ô để xem giờ quét In/Out</span>
        </div>

      </div>
    </div>
  );
}
