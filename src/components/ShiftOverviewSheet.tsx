import React, { useMemo, useState } from 'react';
import { User, Checkin } from '../types';
import { format, addDays, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ShiftOverviewSheetProps {
  users: User[];
  checkins: Checkin[];
  onClose: () => void;
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

export default function ShiftOverviewSheet({ users, checkins, onClose }: ShiftOverviewSheetProps) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState<string>(() => {
    const dates = checkins.map(c => c.workDate).filter(Boolean) as string[];
    if (dates.length === 0) return format(addDays(new Date(), -3), 'yyyy-MM-dd');
    return [...dates].sort()[0];
  });

  const [endDate, setEndDate] = useState<string>(() => {
    const dates = checkins.map(c => c.workDate).filter(Boolean) as string[];
    if (dates.length === 0) return format(addDays(new Date(), 4), 'yyyy-MM-dd');
    return [...dates].sort().reverse()[0];
  });

  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightUser, setHighlightUser] = useState<string | null>(null);

  const dateColumns = useMemo<string[]>(() => {
    if (!startDate || !endDate) return [];
    const cols: string[] = [];
    let cur = parseISO(startDate);
    const end = parseISO(endDate);
    while (cur <= end) {
      cols.push(format(cur, 'yyyy-MM-dd'));
      cur = addDays(cur, 1);
    }
    return cols.slice(0, 31);
  }, [startDate, endDate]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return users.filter(u =>
      !term ||
      u.fullName.toLowerCase().includes(term) ||
      (u.workRole || '').toLowerCase().includes(term) ||
      u.department.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const checkinMap = useMemo(() => {
    const map = new Map<string, Map<string, Checkin[]>>();
    checkins.forEach(c => {
      if (!c.workDate) return;
      if (statusFilter !== 'all' && c.status !== statusFilter) return;
      if (!map.has(c.userId)) map.set(c.userId, new Map());
      const dateMap = map.get(c.userId)!;
      if (!dateMap.has(c.workDate)) dateMap.set(c.workDate, []);
      dateMap.get(c.workDate)!.push(c);
    });
    return map;
  }, [checkins, statusFilter]);

  const userStats = useMemo(() => {
    const stats: Record<string, { approved: number; pending: number }> = {};
    filteredUsers.forEach(u => {
      const allUserCheckins = checkins.filter(c => c.userId === u.id);
      stats[u.id] = {
        approved: allUserCheckins.filter(c => c.status === 'approved').length,
        pending:  allUserCheckins.filter(c => c.status === 'pending').length,
      };
    });
    return stats;
  }, [filteredUsers, checkins]);

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

  const totalApproved = checkins.filter(c => c.status === 'approved').length;
  const totalPending  = checkins.filter(c => c.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col">
      <div className="flex flex-col h-full max-h-screen bg-white shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-lg">📊</div>
            <div>
              <h2 className="text-white font-extrabold text-base tracking-tight">Tổng Hợp Ca Làm Việc</h2>
              <p className="text-indigo-200 text-[11px]">Ai làm ngày nào · ca nào · công việc gì — xem nhanh kiểu Google Sheet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-2.5 border-b border-gray-100 bg-gray-50/70 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-500">Từ:</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm" />
            <span className="text-xs font-bold text-gray-500">Đến:</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm" />
          </div>

          <div className="flex items-center gap-1">
            {(['all', 'approved', 'pending'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition ${
                  statusFilter === s
                    ? s === 'all' ? 'bg-gray-900 text-white'
                      : s === 'approved' ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}>
                {s === 'all' ? '🔍 Tất Cả' : s === 'approved' ? '✅ Đã Duyệt' : '⏳ Chờ Duyệt'}
              </button>
            ))}
          </div>

          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="🔎 Tìm nhân sự, bộ phận..."
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm w-52" />

          <div className="ml-auto flex items-center gap-3 flex-wrap">
            {Object.entries(SHIFT_COLORS).filter(([k]) => k !== 'default').map(([name, cls]) => (
              <div key={name} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${cls.dot}`}></span>
                <span className="text-[10px] text-gray-500 font-medium">{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sheet Body ── */}
        <div className="flex-1 overflow-auto">
          {dateColumns.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              Vui lòng chọn khoảng ngày hợp lệ để hiển thị bảng tổng hợp.
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              Không tìm thấy nhân sự nào.
            </div>
          ) : (
            <table className="border-collapse text-xs" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
              <thead className="sticky top-0 z-20">
                <tr>
                  {/* Name header – frozen */}
                  <th style={{ minWidth: 200, width: 200, position: 'sticky', left: 0, zIndex: 30 }}
                    className="bg-indigo-700 text-white px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider border-b border-r border-indigo-500 shadow-sm whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>👥</span> Nhân Sự ({filteredUsers.length})
                    </div>
                  </th>
                  {/* Ca duyệt – frozen */}
                  <th style={{ minWidth: 72, width: 72, position: 'sticky', left: 200, zIndex: 29 }}
                    className="bg-indigo-800 text-indigo-200 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider border-b border-r border-indigo-600 whitespace-nowrap">
                    ✅ Duyệt
                  </th>
                  {/* Chờ duyệt – frozen */}
                  <th style={{ minWidth: 72, width: 72, position: 'sticky', left: 272, zIndex: 29 }}
                    className="bg-indigo-800 text-amber-300 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider border-b border-r border-indigo-600 whitespace-nowrap">
                    ⏳ Chờ
                  </th>
                  {/* Date columns */}
                  {dateColumns.map(d => {
                    const { dayName, dayNum, isToday, isWeekend } = formatColDate(d);
                    return (
                      <th key={d} style={{ minWidth: 130, width: 130 }}
                        className={`px-2 py-2 text-center border-b border-r text-[11px] font-bold whitespace-nowrap transition ${
                          isToday ? 'bg-indigo-500 text-white border-indigo-400'
                            : isWeekend ? 'bg-rose-50 text-rose-700 border-rose-100'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                        <div className={`text-[9px] uppercase font-bold ${isToday ? 'text-indigo-100' : isWeekend ? 'text-rose-400' : 'text-gray-400'}`}>
                          {dayName}
                        </div>
                        <div className="font-extrabold mt-0.5">{dayNum}</div>
                        {isToday && <div className="text-[8px] text-indigo-100 mt-0.5">Hôm nay</div>}
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
                  const rowBg = isHighlighted ? 'bg-indigo-50' : rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40';

                  return (
                    <tr key={user.id}
                      className={`group ${rowBg} hover:bg-indigo-50/60 transition-colors cursor-pointer`}
                      onClick={() => setHighlightUser(isHighlighted ? null : user.id)}>

                      {/* Frozen name */}
                      <td style={{ position: 'sticky', left: 0, zIndex: 10 }}
                        className={`px-3 py-2.5 border-b border-r border-gray-100 ${rowBg} group-hover:bg-indigo-50/60`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 shadow-sm ${
                            isHighlighted ? 'bg-indigo-600 text-white' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
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
                        className={`px-2 py-2.5 text-center border-b border-r border-gray-100 ${rowBg} group-hover:bg-indigo-50/60`}>
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-100 text-emerald-800 text-[11px] font-black rounded-lg">
                          {stats.approved}
                        </span>
                      </td>

                      {/* Frozen: pending count */}
                      <td style={{ position: 'sticky', left: 272, zIndex: 9 }}
                        className={`px-2 py-2.5 text-center border-b border-r border-gray-100 ${rowBg} group-hover:bg-indigo-50/60`}>
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
                        const cellBg = isToday ? 'bg-indigo-50/50' : isWeekend ? 'bg-rose-50/30' : '';

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
        <div className="px-5 py-2 border-t border-gray-100 bg-gray-50 shrink-0 flex flex-wrap items-center gap-4 text-[11px] text-gray-500">
          <span>📅 <b className="text-gray-700">{dateColumns.length}</b> ngày</span>
          <span>👥 <b className="text-gray-700">{filteredUsers.length}</b> nhân sự</span>
          <span>✅ <b className="text-emerald-600">{totalApproved}</b> ca đã duyệt</span>
          <span>⏳ <b className="text-amber-600">{totalPending}</b> ca chờ duyệt</span>
          <span className="ml-auto text-gray-400 italic">Click vào hàng để highlight • Hover vào ô để xem chi tiết đầy đủ</span>
        </div>

      </div>
    </div>
  );
}
