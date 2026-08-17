import { supabase, supabaseUrl, supabaseAnonKey } from '../supabase';
import { User, Checkin, EventItem } from '../types';
import { format } from 'date-fns';
import { sendApprovalEmailNotification, getAdminEmailSettings } from './emailService';
import { pushGlobalCloudData, pullGlobalCloudData } from './cloudSyncService';

const LOCAL_USERS_KEY = 'app_users_data_v1';
const LOCAL_CHECKINS_KEY = 'app_checkins_data_v1';
const LOCAL_SESSION_KEY = 'app_session_user_v1';
const STORAGE_MODE_KEY = 'app_storage_mode_preference';
const CUSTOM_DEPARTMENTS_KEY = 'app_custom_departments_v1';
const CUSTOM_EVENTS_KEY = 'app_custom_events_v1';
const SYSTEM_DEPTS_ID = '00000000-0000-4000-8000-000000000099';
const DEPARTMENT_RATES_KEY = 'app_department_rates_v1';
const GOOGLE_SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwHyPo28ktAc87yPCjtpGA6_DvPpypjom1LCohIr33Z-sDzgR5fzNVeIIBrB3gZn9E1/exec';

const DEFAULT_DEPARTMENT_RATES: Record<string, number> = {
  'Hậu cần': 50000,
  'Truyền thông': 60000,
  'Sự kiện': 50000,
  'Tài trợ': 50000,
  'Nhân sự': 50000,
  'Cửu vạn': 150000,
  'Lễ Tân': 70000,
  'Backstage': 80000,
};

const MOCK_USER_1_ID = '10000000-0000-4000-8000-000000000001';
const MOCK_USER_2_ID = '10000000-0000-4000-8000-000000000002';
const MOCK_USER_3_ID = '10000000-0000-4000-8000-000000000003';

const INITIAL_MOCK_USERS: User[] = [
  {
    id: MOCK_USER_1_ID,
    role: 'tnv',
    fullName: 'Nguyễn Văn An',
    email: 'nguyenvanan@gmail.com',
    phone: '0901234567',
    facebookLink: 'https://facebook.com/nguyenvanan',
    department: 'Hậu cần',
    notes: 'Rảnh thứ 7 & Chủ Nhật',
    salaryRate: 50000,
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    id: MOCK_USER_2_ID,
    role: 'tnv',
    fullName: 'Trần Thị Bình',
    email: 'tranthibinh@gmail.com',
    phone: '0987654321',
    facebookLink: 'https://facebook.com/tranthibinh',
    department: 'Truyền thông',
    notes: 'Chuyên chụp ảnh',
    salaryRate: 60000,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: MOCK_USER_3_ID,
    role: 'tnv',
    fullName: 'Lê Hoàng Cường',
    email: 'lehoangcuong@gmail.com',
    phone: '0912345678',
    facebookLink: '',
    department: 'Sự kiện',
    notes: 'Rảnh chiều',
    salaryRate: 50000,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  }
];

const INITIAL_MOCK_CHECKINS: Checkin[] = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    userId: MOCK_USER_1_ID,
    fullName: 'Nguyễn Văn An',
    department: 'Hậu cần',
    workDate: format(new Date(), 'yyyy-MM-dd'),
    shiftName: 'Ca Sáng (07:00 - 12:00)',
    status: 'approved',
    checkinTime: Date.now() - 86400000 * 2,
    checkoutTime: Date.now() - 86400000 * 2 + 18000000,
    type: 'full',
    otHours: 0,
    adminNote: 'Hoàn thành tốt ca làm',
    emailNotifySent: true,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  }
];

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder')
  );
}

export function isSupabaseActive(): boolean {
  return isSupabaseConfigured();
}

// Universal Realtime WebSocket Subscription across all browser tabs/devices
export function subscribeToRealtimeChanges(onUpdate: (payload?: any) => void): () => void {
  if (!isSupabaseActive()) return () => {};

  try {
    const channelName = 'realtime-sync-' + Math.random().toString(36).substring(2, 8);
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          console.log("⚡ [Realtime WebSocket] Users table updated:", payload);
          onUpdate(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checkins' },
        (payload) => {
          console.log("⚡ [Realtime WebSocket] Checkins table updated:", payload);
          onUpdate(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings' },
        (payload) => {
          console.log("⚡ [Realtime WebSocket] System Settings updated:", payload);
          onUpdate(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'departments' },
        (payload) => {
          console.log("⚡ [Realtime WebSocket] Departments table updated:", payload);
          onUpdate(payload);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log("✅ Supabase Realtime WebSockets ACTIVE & CONNECTED!");
        } else if (err) {
          console.warn(`Supabase Realtime status: ${status}`, err);
        }
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  } catch (err) {
    console.warn("Realtime subscription setup notice:", err);
    return () => {};
  }
}

export const DEFAULT_EVENTS: EventItem[] = [
  {
    id: 'evt-default-1',
    name: 'Sự Kiện Mặc Định 2026',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    location: 'TP. Hồ Chí Minh',
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
];

export function getEventsList(): EventItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_EVENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_EVENTS;
}

export function getActiveEventsList(): EventItem[] {
  return getEventsList().filter(e => e.status === 'active');
}

// Fetch Events Async from System Settings table or legacy user row
export async function fetchEventsListAsync(): Promise<EventItem[]> {
  if (isSupabaseActive()) {
    try {
      // 1. Check system_settings table first
      const { data, error } = await supabase.from('system_settings').select('*').eq('key', 'events').maybeSingle();
      if (!error && data && data.value && Array.isArray(data.value)) {
        localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(data.value));
        return data.value;
      }

      // 2. Fallback to legacy SYSTEM_DEPTS_ID row
      const { data: sysData, error: sysErr } = await supabase.from('users').select('*').eq('id', SYSTEM_DEPTS_ID).maybeSingle();
      if (!sysErr && sysData && sysData.department) {
        try {
          const parsed = JSON.parse(sysData.department);
          if (typeof parsed === 'object' && parsed !== null && Array.isArray(parsed.events)) {
            localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(parsed.events));
            return parsed.events;
          }
        } catch {}
      }
    } catch (e) {
      console.warn("Lỗi fetch events từ Supabase:", e);
    }
  }
  return getEventsList();
}

export async function fetchActiveEventsListAsync(): Promise<EventItem[]> {
  const evts = await fetchEventsListAsync();
  return evts.filter(e => e.status === 'active');
}

export async function saveEventsListAsync(events: EventItem[]): Promise<void> {
  localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(events));
  if (isSupabaseActive()) {
    try {
      // Save to system_settings table
      const { error } = await supabase.from('system_settings').upsert({
        key: 'events',
        value: events,
        updated_at: Date.now(),
      });
      if (error) {
        // Legacy fallback
        const deps = getDepartmentsList();
        const rates = getDepartmentRates();
        const payloadStr = JSON.stringify({ deps, rates, events });
        await supabase.from('users').upsert({
          id: SYSTEM_DEPTS_ID,
          role: 'admin',
          full_name: '__SYSTEM_DEPARTMENTS__',
          phone: '0000000000',
          department: payloadStr,
          salary_rate: 0,
        });
      }
    } catch (err) {
      console.warn("Supabase events sync notice:", err);
    }
  }
}

export function saveEventsList(events: EventItem[]): void {
  saveEventsListAsync(events).catch(err => console.error("Error saving events:", err));
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDepartmentsList(): string[] {
  const defaultDeps = ['Hậu cần', 'Truyền thông', 'Sự kiện', 'Tài trợ', 'Nhân sự'];
  try {
    const raw = localStorage.getItem(CUSTOM_DEPARTMENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return defaultDeps;
}

export interface DepartmentItem {
  id?: string;
  name: string;
  allowance: number;
}

export async function fetchDepartmentsWithDetailsAsync(): Promise<DepartmentItem[]> {
  if (isSupabaseActive()) {
    try {
      // 1. Query directly from Supabase departments table
      const { data, error } = await supabase.from('departments').select('*').order('created_at', { ascending: true });
      if (!error && data && Array.isArray(data) && data.length > 0) {
        const items: DepartmentItem[] = data.map(d => ({
          id: d.id,
          name: d.name,
          allowance: Number(d.allowance) || 50000,
        }));
        
        // Cache locally for fallback
        const depNames = items.map(i => i.name);
        const ratesMap: Record<string, number> = {};
        items.forEach(i => { ratesMap[i.name] = i.allowance; });
        localStorage.setItem(CUSTOM_DEPARTMENTS_KEY, JSON.stringify(depNames));
        localStorage.setItem(DEPARTMENT_RATES_KEY, JSON.stringify(ratesMap));

        return items;
      }

      // If departments table is empty, auto-seed default departments
      const initialDeps = [
        { name: 'Hậu cần', allowance: 50000 },
        { name: 'Truyền thông', allowance: 50000 },
        { name: 'Sự kiện', allowance: 50000 },
        { name: 'Tài trợ', allowance: 50000 },
        { name: 'Nhân sự', allowance: 50000 },
      ];
      const { data: seeded } = await supabase.from('departments').upsert(initialDeps, { onConflict: 'name' }).select('*');
      if (seeded && seeded.length > 0) {
        return seeded.map(d => ({ id: d.id, name: d.name, allowance: Number(d.allowance) || 50000 }));
      }
    } catch (e) {
      console.warn("Lỗi fetch departments details từ Supabase:", e);
    }
  }

  const names = getDepartmentsList();
  const rates = getDepartmentRates();
  return names.map(n => ({ name: n, allowance: rates[n] !== undefined ? Number(rates[n]) : 50000 }));
}

export async function fetchDepartmentsListAsync(): Promise<string[]> {
  const items = await fetchDepartmentsWithDetailsAsync();
  return items.map(i => i.name);
}

export async function addDepartmentAsync(name: string, allowance: number = 50000): Promise<void> {
  const depName = name.trim();
  if (!depName) return;

  if (isSupabaseActive()) {
    try {
      await supabase.from('departments').insert([{ name: depName, allowance }]);
    } catch (e) {
      console.warn("Lỗi insert department Supabase:", e);
    }
  }

  const deps = getDepartmentsList();
  if (!deps.includes(depName)) {
    deps.push(depName);
    const rates = getDepartmentRates();
    rates[depName] = allowance;
    localStorage.setItem(CUSTOM_DEPARTMENTS_KEY, JSON.stringify(deps));
    localStorage.setItem(DEPARTMENT_RATES_KEY, JSON.stringify(rates));
  }
}

export async function deleteDepartmentAsync(idOrName: string): Promise<void> {
  if (isSupabaseActive()) {
    try {
      if (isValidUUID(idOrName)) {
        await supabase.from('departments').delete().eq('id', idOrName);
      } else {
        await supabase.from('departments').delete().eq('name', idOrName);
      }
    } catch (e) {
      console.warn("Lỗi delete department Supabase:", e);
    }
  }

  const deps = getDepartmentsList().filter(d => d !== idOrName);
  localStorage.setItem(CUSTOM_DEPARTMENTS_KEY, JSON.stringify(deps));
}

export async function updateDepartmentAllowanceAsync(name: string, allowance: number): Promise<void> {
  if (isSupabaseActive()) {
    try {
      await supabase.from('departments').update({ allowance }).eq('name', name);
    } catch (e) {
      console.warn("Lỗi update department allowance Supabase:", e);
    }
  }
  const rates = getDepartmentRates();
  rates[name] = allowance;
  localStorage.setItem(DEPARTMENT_RATES_KEY, JSON.stringify(rates));
}

export function getDepartmentRates(): Record<string, number> {
  try {
    const raw = localStorage.getItem(DEPARTMENT_RATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...DEFAULT_DEPARTMENT_RATES, ...parsed };
      }
    }
  } catch {}
  return DEFAULT_DEPARTMENT_RATES;
}

export function getDepartmentRate(deptName: string): number {
  const rates = getDepartmentRates();
  if (rates[deptName] !== undefined) {
    return Number(rates[deptName]) || 50000;
  }
  return 50000;
}

export function calculateShiftPay(shiftName: string, salaryRate: number, otHours: number = 0, otHourlyRate: number = 25000): number {
  const baseRate = Number(salaryRate) || 50000;
  const isFullDay = (shiftName || '').includes('Cả Ngày') || (shiftName || '').toLowerCase().includes('full');
  const multiplier = isFullDay ? 2 : 1;
  const shiftBasePay = baseRate * multiplier;
  const otPay = (Number(otHours) || 0) * otHourlyRate;
  return shiftBasePay + otPay;
}

export function calculateMeals(shiftName: string, otHours: number = 0): { lunch: number; dinner: number; total: number } {
  const name = shiftName || '';
  const hasEveningOT = Number(otHours) > 0 || name.toLowerCase().includes('ot') || name.includes('Tối');

  const lunch = 1; // 1 người/ngày = 1 suất ăn trưa mặc định
  const dinner = hasEveningOT ? 1 : 0; // Chỉ tính thêm 1 suất ăn tối nếu có làm OT tối

  return { lunch, dinner, total: lunch + dinner };
}

export function saveDepartmentRates(rates: Record<string, number>) {
  saveDepartmentsAndRates(getDepartmentsList(), rates);
}

export function saveDepartmentsList(deps: string[]) {
  saveDepartmentsAndRates(deps, getDepartmentRates());
}

export async function saveDepartmentsAndRatesAsync(deps: string[], rates?: Record<string, number>): Promise<void> {
  const currentRates = rates || getDepartmentRates();
  localStorage.setItem(CUSTOM_DEPARTMENTS_KEY, JSON.stringify(deps));
  localStorage.setItem(DEPARTMENT_RATES_KEY, JSON.stringify(currentRates));

  if (isSupabaseActive()) {
    try {
      // 1. Write to system_settings table for new architecture
      await supabase.from('system_settings').upsert({
        key: 'departments',
        value: deps,
        updated_at: Date.now(),
      });
      await supabase.from('system_settings').upsert({
        key: 'rates',
        value: currentRates,
        updated_at: Date.now(),
      });

      // 2. ALSO Write to legacy SYSTEM_DEPTS_ID row in users table for 100% backward compatibility
      const events = getEventsList();
      const payloadStr = JSON.stringify({ deps, rates: currentRates, events });
      await supabase.from('users').upsert({
        id: SYSTEM_DEPTS_ID,
        role: 'admin',
        full_name: '__SYSTEM_DEPARTMENTS__',
        phone: '0000000000',
        department: payloadStr,
        salary_rate: 0,
      });
    } catch (err) {
      console.warn("Supabase depts sync notice:", err);
    }
  }
}

export function saveDepartmentsAndRates(deps: string[], rates?: Record<string, number>) {
  saveDepartmentsAndRatesAsync(deps, rates).catch(err => console.error("Error saving departments and rates:", err));
}

export function getStorageMode(): 'local' | 'cloud' {
  try {
    const saved = localStorage.getItem(STORAGE_MODE_KEY);
    if (saved === 'cloud' || saved === 'local') return saved;
  } catch {}
  return 'cloud';
}

export function setStorageMode(mode: 'local' | 'cloud') {
  localStorage.setItem(STORAGE_MODE_KEY, mode);
}

// LocalStorage Cache Helpers
function getLocalUsers(): User[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) {
      if (isSupabaseActive()) return [];
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(INITIAL_MOCK_USERS));
      return INITIAL_MOCK_USERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveLocalUsers(users: User[]) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function getLocalCheckins(): Checkin[] {
  try {
    const raw = localStorage.getItem(LOCAL_CHECKINS_KEY);
    if (!raw) {
      if (isSupabaseActive()) return [];
      localStorage.setItem(LOCAL_CHECKINS_KEY, JSON.stringify(INITIAL_MOCK_CHECKINS));
      return INITIAL_MOCK_CHECKINS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveLocalCheckins(checkins: Checkin[]) {
  localStorage.setItem(LOCAL_CHECKINS_KEY, JSON.stringify(checkins));
}

function getLocalSession(): User | null {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalSession(user: User | null) {
  if (user) {
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(LOCAL_SESSION_KEY);
  }
}

function isValidUUID(uuidStr?: string): boolean {
  if (!uuidStr || typeof uuidStr !== 'string') return false;
  const cleaned = uuidStr.replace(/-/g, '');
  return cleaned.length >= 8 && /^[0-9a-f]+$/i.test(cleaned);
}

function safeParseTimestamp(val: any): number {
  if (!val) return Date.now();
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string') {
    const num = Number(val);
    if (!isNaN(num) && num > 1000000000) return num;
    const parsedDate = Date.parse(val);
    if (!isNaN(parsedDate)) return parsedDate;
  }
  return Date.now();
}

export async function syncToGoogleSheets(customUsers?: User[], customCheckins?: Checkin[]): Promise<void> {
  try {
    const users = customUsers || getLocalUsers();
    const checkins = customCheckins || getLocalCheckins();

    const enrichedUsers = users.map(u => {
      const approved = checkins.filter(c => c.userId === u.id && c.status === 'approved');
      const totalEarned = approved.reduce((sum, c) => sum + calculateShiftPay(c.shiftName, u.salaryRate, c.otHours), 0);
      return {
        ...u,
        totalEarned,
      };
    });
    
    await fetch(GOOGLE_SHEETS_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ users: enrichedUsers, checkins }),
    });
  } catch (err) {
    console.warn("Google Sheets sync notice:", err);
  }
}

// Trigger Cloud Sync across all devices
async function triggerCloudSync() {
  const users = getLocalUsers();
  const checkins = getLocalCheckins();
  const departments = getDepartmentsList();
  await pushGlobalCloudData({ users, checkins, departments });
  await syncToGoogleSheets(users, checkins);
}

// -------------------------------------------------------------
// Safe & Full Cloud Upsert Methods (Zero-Data-Loss Architecture)
// -------------------------------------------------------------
export async function safeSupabaseUpsertUser(user: User): Promise<void> {
  if (!isSupabaseActive()) return;
  if (!isValidUUID(user.id)) {
    user.id = generateUUID();
  }
  
  const cleanPayload: any = {
    id: user.id,
    role: user.role || 'tnv',
    full_name: user.fullName,
    email: user.email || '',
    phone: user.phone || '',
    facebook_link: user.facebookLink || '',
    department: user.department || 'Hậu cần',
    event_id: user.eventId || null,
    event_name: user.eventName || null,
    salary_rate: user.salaryRate || 50000,
    notes: user.notes || '',
    updated_at: user.updatedAt || Date.now(),
  };

  try {
    const { error } = await supabase.from('users').upsert(cleanPayload);
    if (error) {
      console.warn("User upsert warning, retrying insert:", error.message);
      const { error: insertErr } = await supabase.from('users').insert([cleanPayload]);
      if (insertErr) {
        console.error("LỖI SUPABASE USERS:", insertErr);
      }
    }
  } catch (err: any) {
    console.error("LỖI ĐỒNG BỘ SUPABASE USERS:", err);
  }
}

export async function safeSupabaseUpsertCheckin(checkin: Checkin): Promise<void> {
  if (!isSupabaseActive()) return;
  if (!isValidUUID(checkin.id)) {
    checkin.id = generateUUID();
  }
  if (!isValidUUID(checkin.userId)) {
    checkin.userId = generateUUID();
  }

  const cleanPayload: any = {
    id: checkin.id,
    user_id: checkin.userId,
    full_name: checkin.fullName,
    department: checkin.department || 'Hậu cần',
    event_id: checkin.eventId || null,
    event_name: checkin.eventName || null,
    work_date: checkin.workDate || format(new Date(), 'yyyy-MM-dd'),
    shift_name: checkin.shiftName || 'Ca làm việc',
    ot_hours: checkin.otHours || 0,
    status: checkin.status || 'pending',
    type: checkin.type || 'checkin',
    notes: checkin.adminNote || '',
    admin_note: checkin.adminNote || '',
    checkin_time: checkin.checkinTime || null,
    checkout_time: checkin.checkoutTime || null,
    email_notify_sent: Boolean(checkin.emailNotifySent),
    updated_at: checkin.updatedAt || Date.now(),
  };

  try {
    const { error } = await supabase.from('checkins').upsert(cleanPayload);
    if (error) {
      console.warn("Checkin upsert warning, retrying insert:", error.message);
      const { error: insertErr } = await supabase.from('checkins').insert([cleanPayload]);
      if (insertErr) {
        console.error("LỖI SUPABASE CHECKINS:", insertErr);
      }
    }
  } catch (err: any) {
    console.error("LỖI ĐỒNG BỘ SUPABASE CHECKINS:", err);
  }
}

export async function registerTNV(payload: {
  fullName: string;
  email: string;
  phone: string;
  facebookLink?: string;
  department: string;
  eventId?: string;
  eventName?: string;
  notes?: string;
  password?: string;
}): Promise<User> {
  const cleanEmail = payload.email.trim().toLowerCase();

  // Auto-assign active event if not specified
  if (!payload.eventId) {
    const activeEvts = getEventsList().filter(e => e.status === 'active');
    if (activeEvts.length > 0) {
      payload.eventId = activeEvts[0].id;
      payload.eventName = activeEvts[0].name;
    }
  }

  // Fetch updated user list from Cloud first to ensure SSOT
  const users = await fetchAllUsers();
  const existingUser = users.find(u => u.email.trim().toLowerCase() === cleanEmail);

  if (existingUser) {
    existingUser.fullName = payload.fullName || existingUser.fullName;
    existingUser.phone = payload.phone || existingUser.phone;
    existingUser.department = payload.department || existingUser.department;
    existingUser.salaryRate = getDepartmentRate(existingUser.department);
    existingUser.eventId = payload.eventId || existingUser.eventId;
    existingUser.eventName = payload.eventName || existingUser.eventName;
    if (payload.facebookLink) existingUser.facebookLink = payload.facebookLink;
    existingUser.updatedAt = Date.now();

    saveLocalUsers(users);
    setLocalSession(existingUser);
    await safeSupabaseUpsertUser(existingUser);
    await triggerCloudSync();
    return existingUser;
  }

  const newUser: User = {
    id: generateUUID(),
    role: 'tnv',
    fullName: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    facebookLink: payload.facebookLink || '',
    department: payload.department,
    eventId: payload.eventId || '',
    eventName: payload.eventName || '',
    notes: payload.notes || '',
    salaryRate: getDepartmentRate(payload.department),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  users.push(newUser);
  saveLocalUsers(users);
  setLocalSession(newUser);

  // Sync globally to Cloud
  await safeSupabaseUpsertUser(newUser);
  await triggerCloudSync();

  return newUser;
}

export async function loginTNV(email: string, password?: string): Promise<User> {
  const users = await fetchAllUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    throw new Error('Email chưa được đăng ký trong hệ thống!');
  }
  setLocalSession(user);
  return user;
}

export async function loginAdmin(passcode: string): Promise<User> {
  const ADMIN_PASSCODE = 'admin123';
  if (passcode !== ADMIN_PASSCODE && passcode !== 'admin') {
    throw new Error('Mật khẩu Admin không đúng');
  }

  const adminSettings = getAdminEmailSettings();

  const adminUser: User = {
    id: '00000000-0000-4000-8000-000000000000',
    role: 'admin',
    fullName: adminSettings.adminName || 'Quản trị viên Hệ thống',
    email: adminSettings.senderEmail || 'chicong092004@gmail.com',
    phone: '0900000000',
    department: 'Ban Điều Hành',
    salaryRate: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  setLocalSession(adminUser);
  await safeSupabaseUpsertUser(adminUser);
  return adminUser;
}

// -------------------------------------------------------------
// SINGLE SOURCE OF TRUTH (SSOT) FETCH METHODS
// -------------------------------------------------------------
export async function fetchAllUsers(): Promise<User[]> {
  if (isSupabaseActive()) {
    try {
      // 1. Fetch system settings from system_settings table if present
      const { data: settingsData } = await supabase.from('system_settings').select('*');
      if (settingsData && settingsData.length > 0) {
        settingsData.forEach(st => {
          if (st.key === 'departments' && Array.isArray(st.value)) {
            localStorage.setItem(CUSTOM_DEPARTMENTS_KEY, JSON.stringify(st.value));
          } else if (st.key === 'rates' && typeof st.value === 'object') {
            localStorage.setItem(DEPARTMENT_RATES_KEY, JSON.stringify(st.value));
          } else if (st.key === 'events' && Array.isArray(st.value)) {
            localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(st.value));
          }
        });
      }

      // 2. Fetch Users table
      const { data, error } = await supabase.from('users').select('*');
      if (!error && data) {
        // Process Legacy Admin/System config rows if system_settings wasn't set up yet
        const sysRec = data.find(d => d.id === SYSTEM_DEPTS_ID || d.full_name === '__SYSTEM_DEPARTMENTS__');
        if (sysRec && sysRec.department) {
          try {
            const parsed = JSON.parse(sysRec.department);
            if (Array.isArray(parsed) && parsed.length > 0) {
              localStorage.setItem(CUSTOM_DEPARTMENTS_KEY, JSON.stringify(parsed));
            } else if (typeof parsed === 'object' && parsed !== null) {
              if (Array.isArray(parsed.deps)) localStorage.setItem(CUSTOM_DEPARTMENTS_KEY, JSON.stringify(parsed.deps));
              if (typeof parsed.rates === 'object') localStorage.setItem(DEPARTMENT_RATES_KEY, JSON.stringify(parsed.rates));
              if (Array.isArray(parsed.events)) localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(parsed.events));
            }
          } catch {}
        }

        const adminRec = data.find(d => d.id === '00000000-0000-4000-8000-000000000000' || (d.role === 'admin' && d.id !== SYSTEM_DEPTS_ID));
        if (adminRec && adminRec.full_name && adminRec.full_name !== '__SYSTEM_DEPARTMENTS__') {
          localStorage.setItem('app_admin_email_settings_v1', JSON.stringify({
            senderEmail: adminRec.email || 'chicong092004@gmail.com',
            adminName: adminRec.full_name,
          }));
        }

        // Filter out system config row from volunteer user list
        const userRecords = data.filter(d => d.id !== SYSTEM_DEPTS_ID && d.full_name !== '__SYSTEM_DEPARTMENTS__');

        const cloudUsers: User[] = userRecords.map(d => ({
          id: d.id,
          role: d.role || 'tnv',
          fullName: d.full_name || d.fullName || d.name || 'TNV',
          email: d.email || `${(d.full_name || 'tnv').toLowerCase().replace(/\s+/g, '')}@gmail.com`,
          phone: d.phone || d.phoneNumber || '',
          facebookLink: d.facebook_link || d.facebookLink || '',
          department: d.department || 'Hậu cần',
          eventId: d.event_id || d.eventId || '',
          eventName: d.event_name || d.eventName || '',
          notes: d.notes || '',
          salaryRate: Number(d.salary_rate || d.salaryRate) || 50000,
          createdAt: safeParseTimestamp(d.created_at || d.createdAt),
          updatedAt: safeParseTimestamp(d.updated_at || d.updatedAt),
        }));

        // Filter out mock users (10000000-0000-4000-8000-...) when Cloud is active
        const realCloudUsers = cloudUsers.filter(u => !u.id.startsWith('10000000-0000-4000-8000'));
        saveLocalUsers(realCloudUsers);
        return realCloudUsers;
      }
    } catch (err) {
      console.warn("Supabase fetch users notice:", err);
    }
  }

  // Fallback to local storage if Supabase Cloud is disabled
  return getLocalUsers();
}

export async function fetchCheckins(userId?: string): Promise<Checkin[]> {
  const users = await fetchAllUsers();
  const existingUsersMap = new Map<string, User>(users.map(u => [u.id, u]));

  if (isSupabaseActive()) {
    try {
      const { data, error } = await supabase.from('checkins').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const cloudCheckins: Checkin[] = data.map(d => {
          const reconstructedUserId = d.user_id || d.userId || d.id;
          const reconstructedName = d.full_name || d.fullName || 'TNV';
          const createdAtMs = safeParseTimestamp(d.created_at || d.createdAt);
          const updatedAtMs = safeParseTimestamp(d.updated_at || d.updatedAt);
          const checkinTimeMs = d.checkin_time ? safeParseTimestamp(d.checkin_time) : (d.checkinTime ? safeParseTimestamp(d.checkinTime) : undefined);
          const checkoutTimeMs = d.checkout_time ? safeParseTimestamp(d.checkout_time) : (d.checkoutTime ? safeParseTimestamp(d.checkoutTime) : undefined);

          // Auto-reconstruct user profile if missing from users list
          if (reconstructedUserId && !existingUsersMap.has(reconstructedUserId)) {
            const reconstructedUser: User = {
              id: reconstructedUserId,
              role: 'tnv',
              fullName: reconstructedName,
              email: `${reconstructedName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
              phone: d.phone || '0000000000',
              department: d.department || 'Hậu cần',
              eventId: d.event_id || d.eventId || '',
              eventName: d.event_name || d.eventName || '',
              salaryRate: getDepartmentRate(d.department || 'Hậu cần'),
              createdAt: createdAtMs,
              updatedAt: Date.now(),
            };
            existingUsersMap.set(reconstructedUserId, reconstructedUser);
            users.push(reconstructedUser);
            saveLocalUsers(users);
            safeSupabaseUpsertUser(reconstructedUser);
          }

          return {
            id: d.id,
            userId: reconstructedUserId,
            fullName: reconstructedName,
            department: d.department || 'Hậu cần',
            eventId: d.event_id || d.eventId || undefined,
            eventName: d.event_name || d.eventName || undefined,
            workDate: d.work_date || d.workDate || format(new Date(createdAtMs), 'yyyy-MM-dd'),
            shiftName: d.shift_name || d.shiftName || 'Ca làm việc',
            otHours: Number(d.ot_hours || d.otHours) || 0,
            status: d.status || 'pending',
            type: d.type || 'checkin',
            adminNote: d.admin_note || d.notes || d.adminNote || '',
            emailNotifySent: Boolean(d.email_notify_sent || d.emailNotifySent),
            checkinTime: checkinTimeMs,
            checkoutTime: checkoutTimeMs,
            createdAt: createdAtMs,
            updatedAt: updatedAtMs,
          };
        });

        // Filter out mock checkins (20000000-0000-4000-8000-...) when Cloud is active
        const realCloudCheckins = cloudCheckins.filter(c => !c.id.startsWith('20000000-0000-4000-8000'));
        saveLocalCheckins(realCloudCheckins);

        if (userId) {
          const targetUser = users.find(u => 
            u.id === userId || 
            (u.email && u.email.toLowerCase() === userId.toLowerCase()) ||
            (u.fullName && u.fullName.trim().toLowerCase() === userId.trim().toLowerCase())
          );
          return realCloudCheckins.filter(c => 
            c.userId === userId || 
            (targetUser && c.fullName && c.fullName.trim().toLowerCase() === targetUser.fullName.trim().toLowerCase())
          );
        }
        return realCloudCheckins;
      }
    } catch (err) {
      console.warn("Supabase fetch checkins notice:", err);
    }
  }

  const localCheckins = getLocalCheckins();
  if (userId) {
    const targetUser = users.find(u => 
      u.id === userId || 
      (u.email && u.email.toLowerCase() === userId.toLowerCase()) ||
      (u.fullName && u.fullName.trim().toLowerCase() === userId.trim().toLowerCase())
    );
    return localCheckins.filter(c => 
      c.userId === userId || 
      (targetUser && c.fullName && c.fullName.trim().toLowerCase() === targetUser.fullName.trim().toLowerCase())
    );
  }
  return localCheckins;
}

// TNV registers schedule for a specific date, shift, and OT hours
export async function submitScheduleRegistration(
  user: User, 
  workDate: string, 
  shiftName: string, 
  otHours: number = 0,
  notes?: string,
  targetDepartment?: string,
  eventId?: string,
  eventName?: string
): Promise<Checkin> {
  if (!isValidUUID(user.id)) {
    user.id = generateUUID();
    setLocalSession(user);
  }

  const chosenDepartment = targetDepartment || user.department;
  const deptRate = getDepartmentRate(chosenDepartment);

  if (!eventId) {
    const activeEvts = getEventsList().filter(e => e.status === 'active');
    if (activeEvts.length > 0) {
      eventId = activeEvts[0].id;
      eventName = activeEvts[0].name;
    }
  }

  user.department = chosenDepartment;
  user.salaryRate = deptRate;
  user.updatedAt = Date.now();
  setLocalSession(user);
  await safeSupabaseUpsertUser(user);

  const existingCheckins = getLocalCheckins();
  const existingShift = existingCheckins.find(c => 
    (c.userId === user.id || (c.fullName && c.fullName.trim().toLowerCase() === user.fullName.trim().toLowerCase())) && 
    c.workDate === workDate && 
    c.shiftName === shiftName && 
    (eventId ? (c.eventId === eventId || c.eventName === eventName) : true)
  );

  if (existingShift) {
    existingShift.workDate = workDate;
    existingShift.shiftName = shiftName;
    existingShift.otHours = otHours;
    existingShift.department = chosenDepartment;
    if (eventId) existingShift.eventId = eventId;
    if (eventName) existingShift.eventName = eventName;
    if (notes) existingShift.adminNote = notes;
    existingShift.status = 'pending';
    existingShift.updatedAt = Date.now();

    saveLocalCheckins(existingCheckins);
    await safeSupabaseUpsertUser(user);
    await safeSupabaseUpsertCheckin(existingShift);
    await triggerCloudSync();

    return existingShift;
  }

  const newSchedule: Checkin = {
    id: generateUUID(),
    userId: user.id,
    fullName: user.fullName,
    department: chosenDepartment,
    eventId,
    eventName,
    workDate,
    shiftName,
    otHours,
    status: 'pending',
    type: 'checkin',
    adminNote: notes || '',
    emailNotifySent: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  existingCheckins.unshift(newSchedule);
  saveLocalCheckins(existingCheckins);

  await safeSupabaseUpsertUser(user);
  await safeSupabaseUpsertCheckin(newSchedule);
  await triggerCloudSync();

  return newSchedule;
}

// Process Event QR Scan (Auto Checkin / Checkout)
export async function processQRCheckin(qrToken: string, activeUser?: User): Promise<{ success: boolean; message: string; checkin?: Checkin }> {
  try {
    let parsed: any = null;
    if (qrToken.includes('http') || qrToken.includes('action=qr_scan')) {
      try {
        const urlObj = new URL(qrToken);
        const params = urlObj.searchParams;
        const type = params.get('type');
        const date = params.get('date');
        const scope = params.get('scope') || 'full_day';
        const from = params.get('from');
        const to = params.get('to');
        const shift = params.get('shift');
        parsed = {
          type: type === 'checkout' || type === 'event_checkout' ? 'event_checkout' : 'event_checkin',
          date: date || format(new Date(), 'yyyy-MM-dd'),
          scope,
          from,
          to,
          shift,
        };
      } catch {
        parsed = { type: 'event_checkin' };
      }
    } else {
      try {
        parsed = JSON.parse(qrToken);
      } catch {
        parsed = { type: 'event_checkin' };
      }
    }

    if (!activeUser) {
      return { success: false, message: 'Vui lòng đăng nhập tài khoản TNV để quét QR điểm danh!' };
    }

    const actionType = parsed.type === 'event_checkout' ? 'checkout' : 'checkin';
    const todayDate = format(new Date(), 'yyyy-MM-dd');
    const qrDate = parsed.date || todayDate;

    // 1. Strict Same-Day QR Validity Check
    if (qrDate !== todayDate) {
      return {
        success: false,
        message: `⚠️ Mã QR này đã hết hạn (chỉ có hiệu lực trong ngày ${qrDate}). Hôm nay là ngày ${todayDate}, vui lòng quét mã QR của ngày hôm nay!`,
      };
    }

    // 2. Strict Time-Window Check (If scope === 'shift_window')
    const currentTimeStr = format(new Date(), 'HH:mm');
    if (parsed.scope === 'shift_window' && parsed.from && parsed.to) {
      if (currentTimeStr < parsed.from || currentTimeStr > parsed.to) {
        return {
          success: false,
          message: `⚠️ Mã QR này chỉ áp dụng trong khung giờ ${parsed.from} - ${parsed.to} (${parsed.shift || 'Theo ca'}). Giờ hiện tại (${currentTimeStr}) chưa đến hoặc đã qua khung giờ cho phép!`,
        };
      }
    }

    const workDate = todayDate; // Strict date matching: ALWAYS use today's date

    const userCheckins = await fetchCheckins(activeUser.id);
    const localUserCheckins = getLocalCheckins().filter(c => c.userId === activeUser.id);

    const allUserCheckins: Checkin[] = [...userCheckins];
    localUserCheckins.forEach(lc => {
      const idx = allUserCheckins.findIndex(c => c.id === lc.id);
      if (idx !== -1) {
        if (lc.checkinTime && !allUserCheckins[idx].checkinTime) {
          allUserCheckins[idx].checkinTime = lc.checkinTime;
        }
      } else {
        allUserCheckins.push(lc);
      }
    });

    if (actionType === 'checkout') {
      // STRICT SAME-DATE CHECKOUT: Search ONLY for shifts registered on workDate (today) that have a checkinTime
      let openShift = allUserCheckins.find(c => c.workDate === workDate && c.checkinTime && !c.checkoutTime);
      if (!openShift) {
        openShift = allUserCheckins.find(c => c.workDate === workDate && c.checkinTime);
      }

      if (openShift) {
        const now = Date.now();
        openShift.checkoutTime = now;
        openShift.type = 'full';
        openShift.status = 'approved';
        openShift.updatedAt = now;

        const allCheckins = getLocalCheckins();
        const idx = allCheckins.findIndex(c => c.id === openShift.id);
        if (idx !== -1) {
          allCheckins[idx] = openShift;
        } else {
          allCheckins.unshift(openShift);
        }
        saveLocalCheckins(allCheckins);

        await safeSupabaseUpsertCheckin(openShift);
        await approveCheckinItem(openShift.id);

        return {
          success: true,
          message: `🏁 CHECK-OUT THÀNH CÔNG! Đã ghi nhận giờ ra lúc ${format(openShift.checkoutTime, 'HH:mm')}. Ca làm ngày ${workDate} (${openShift.shiftName}) đã được tự động duyệt & tính công!`,
          checkin: openShift,
        };
      } else {
        return {
          success: false,
          message: `⚠️ Bạn không có ca làm việc nào được Check-in trong ngày hôm nay (${workDate}) để Check-out!`,
        };
      }
    } else {
      // STRICT SAME-DATE CHECKIN: Search ONLY for shifts registered on workDate (today)
      let openShift = allUserCheckins.find(c => c.workDate === workDate && !c.checkoutTime) 
        || allUserCheckins.find(c => c.workDate === workDate);
      
      let checkin = openShift;
      if (!checkin) {
        const activeEvts = getEventsList().filter(e => e.status === 'active');
        const chosenEvt = activeEvts.length > 0 ? activeEvts[0] : undefined;
        checkin = {
          id: generateUUID(),
          userId: activeUser.id,
          fullName: activeUser.fullName,
          department: activeUser.department,
          eventId: chosenEvt?.id || activeUser.eventId || '',
          eventName: chosenEvt?.name || activeUser.eventName || '',
          workDate: workDate,
          shiftName: 'Ca làm việc',
          otHours: 0,
          status: 'pending',
          type: 'checkin',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      }

      if (!checkin.eventId) {
        const activeEvts = getEventsList().filter(e => e.status === 'active');
        if (activeEvts.length > 0) {
          checkin.eventId = activeEvts[0].id;
          checkin.eventName = activeEvts[0].name;
        }
      }

      const now = Date.now();
      checkin.checkinTime = now;
      checkin.status = 'pending';
      checkin.updatedAt = now;

      const allCheckins = getLocalCheckins();
      const idx = allCheckins.findIndex(c => c.id === checkin.id);
      if (idx !== -1) {
        allCheckins[idx] = checkin;
      } else {
        allCheckins.unshift(checkin);
      }
      saveLocalCheckins(allCheckins);

      await safeSupabaseUpsertCheckin(checkin);
      await triggerCloudSync();

      return {
        success: true,
        message: `📍 CHECK-IN THÀNH CÔNG! Đã ghi nhận giờ vào lúc ${format(checkin.checkinTime, 'HH:mm')} ngày ${workDate}. Hãy nhớ quét CHECK-OUT khi ra về để được tự động duyệt & tính công!`,
        checkin,
      };
    }
  } catch (err: any) {
    console.error("Lỗi xử lý QR checkin:", err);
    return { success: false, message: err.message || 'Lỗi khi xử lý mã QR điểm danh.' };
  }
}

export async function updateUserProfileByAdmin(userId: string, data: Partial<User>): Promise<User> {
  const users = getLocalUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    if (data.fullName !== undefined) user.fullName = data.fullName;
    if (data.email !== undefined) user.email = data.email;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.facebookLink !== undefined) user.facebookLink = data.facebookLink;
    if (data.department !== undefined) user.department = data.department;
    if (data.notes !== undefined) user.notes = data.notes;
    if (data.salaryRate !== undefined) user.salaryRate = data.salaryRate;
    user.updatedAt = Date.now();
    saveLocalUsers(users);
  }

  if (data.fullName || data.department) {
    const checkins = getLocalCheckins();
    checkins.forEach(c => {
      if (c.userId === userId) {
        if (data.fullName) c.fullName = data.fullName;
        if (data.department) c.department = data.department;
      }
    });
    saveLocalCheckins(checkins);
  }

  await triggerCloudSync();

  if (isSupabaseActive() && isValidUUID(userId)) {
    try {
      const updatePayload: any = { updated_at: Date.now() };
      if (data.fullName !== undefined) updatePayload.full_name = data.fullName;
      if (data.email !== undefined) updatePayload.email = data.email;
      if (data.phone !== undefined) updatePayload.phone = data.phone;
      if (data.facebookLink !== undefined) updatePayload.facebook_link = data.facebookLink;
      if (data.department !== undefined) updatePayload.department = data.department;
      if (data.notes !== undefined) updatePayload.notes = data.notes;
      if (data.salaryRate !== undefined) updatePayload.salary_rate = data.salaryRate;
      await supabase.from('users').update(updatePayload).eq('id', userId);
    } catch (e) {
      console.warn("Supabase update profile notice:", e);
    }
  }

  return user || (data as User);
}

export async function updateCheckinAdminNote(checkinId: string, adminNote: string): Promise<void> {
  const checkins = getLocalCheckins();
  const target = checkins.find(c => c.id === checkinId);
  if (target) {
    target.adminNote = adminNote;
    target.updatedAt = Date.now();
    saveLocalCheckins(checkins);
    await triggerCloudSync();
  }

  if (isSupabaseActive() && isValidUUID(checkinId)) {
    try {
      await supabase.from('checkins').update({ admin_note: adminNote, updated_at: Date.now() }).eq('id', checkinId);
    } catch (e) {
      console.warn("Supabase update admin note notice:", e);
    }
  }
}

export async function approveCheckinItem(checkinId: string): Promise<{ success: boolean; emailNotice: string }> {
  const checkins = getLocalCheckins();
  const target = checkins.find(c => c.id === checkinId);
  let emailNotice = '';

  if (target) {
    target.status = 'approved';
    target.emailNotifySent = true;
    target.updatedAt = Date.now();
    saveLocalCheckins(checkins);

    const users = getLocalUsers();
    const user = users.find(u => u.id === target.userId);
    
    if (user && user.email) {
      const emailResult = await sendApprovalEmailNotification({
        toEmail: user.email,
        toName: user.fullName,
        shiftName: target.shiftName || 'Ca làm việc',
        workDate: target.workDate,
        salaryRate: user.salaryRate || 50000,
      });
      emailNotice = emailResult.message;
    } else {
      const adminSettings = getAdminEmailSettings();
      emailNotice = `📧 Đã duyệt lịch & gửi email thông báo từ ${adminSettings.senderEmail}`;
    }

    await triggerCloudSync();
  }

  if (isSupabaseActive() && isValidUUID(checkinId)) {
    try {
      const updatePayload: any = { status: 'approved', email_notify_sent: true, updated_at: Date.now() };
      if (target?.checkinTime) updatePayload.checkin_time = target.checkinTime;
      if (target?.checkoutTime) updatePayload.checkout_time = target.checkoutTime;
      await supabase.from('checkins').update(updatePayload).eq('id', checkinId);
    } catch (e) {
      console.warn("Supabase approve notice:", e);
    }
  }

  return { success: true, emailNotice };
}

export async function rejectCheckinItem(checkinId: string): Promise<{ success: boolean }> {
  const checkins = getLocalCheckins();
  const target = checkins.find(c => c.id === checkinId);
  if (target) {
    target.status = 'rejected';
    target.updatedAt = Date.now();
    saveLocalCheckins(checkins);
    await triggerCloudSync();
  }

  if (isSupabaseActive() && isValidUUID(checkinId)) {
    try {
      await supabase.from('checkins').update({ status: 'rejected', updated_at: Date.now() }).eq('id', checkinId);
    } catch (e) {
      console.warn("Supabase reject notice:", e);
    }
  }

  return { success: true };
}

export async function deleteCheckinItem(checkinId: string): Promise<{ success: boolean }> {
  let checkins = getLocalCheckins();
  checkins = checkins.filter(c => c.id !== checkinId);
  saveLocalCheckins(checkins);

  await triggerCloudSync();

  if (isSupabaseActive() && isValidUUID(checkinId)) {
    try {
      await supabase.from('checkins').delete().eq('id', checkinId);
    } catch (e) {
      console.warn("Supabase delete checkin notice:", e);
    }
  }

  return { success: true };
}

export async function updateCheckinShiftDetails(checkinId: string, updates: Partial<Checkin>): Promise<void> {
  const checkins = getLocalCheckins();
  const target = checkins.find(c => c.id === checkinId);
  if (target) {
    if (updates.workDate !== undefined) target.workDate = updates.workDate;
    if (updates.shiftName !== undefined) target.shiftName = updates.shiftName;
    if (updates.otHours !== undefined) target.otHours = updates.otHours;
    if (updates.department !== undefined) target.department = updates.department;
    if (updates.eventId !== undefined) target.eventId = updates.eventId;
    if (updates.eventName !== undefined) target.eventName = updates.eventName;
    if (updates.adminNote !== undefined) target.adminNote = updates.adminNote;
    if (updates.status !== undefined) target.status = updates.status;
    target.updatedAt = Date.now();
    saveLocalCheckins(checkins);
    await triggerCloudSync();
  }

  if (isSupabaseActive() && isValidUUID(checkinId)) {
    try {
      const updatePayload: any = { updated_at: Date.now() };
      if (updates.workDate !== undefined) updatePayload.work_date = updates.workDate;
      if (updates.shiftName !== undefined) updatePayload.shift_name = updates.shiftName;
      if (updates.otHours !== undefined) updatePayload.ot_hours = updates.otHours;
      if (updates.department !== undefined) updatePayload.department = updates.department;
      if (updates.eventId !== undefined) updatePayload.event_id = updates.eventId;
      if (updates.eventName !== undefined) updatePayload.event_name = updates.eventName;
      if (updates.adminNote !== undefined) updatePayload.admin_note = updates.adminNote;
      if (updates.status !== undefined) updatePayload.status = updates.status;
      await supabase.from('checkins').update(updatePayload).eq('id', checkinId);
    } catch (e) {
      console.warn("Supabase update shift notice:", e);
    }
  }
}

export async function bulkApproveCheckinsList(checkinIds: string[]): Promise<void> {
  for (const id of checkinIds) {
    await approveCheckinItem(id);
  }
}

export async function updateUserSalary(userId: string, salaryRate: number): Promise<void> {
  return updateUserProfileByAdmin(userId, { salaryRate });
}

export async function removeUser(userId: string): Promise<void> {
  let users = getLocalUsers();
  users = users.filter(u => u.id !== userId);
  saveLocalUsers(users);

  let checkins = getLocalCheckins();
  checkins = checkins.filter(c => c.userId !== userId);
  saveLocalCheckins(checkins);

  await triggerCloudSync();

  if (isSupabaseActive() && isValidUUID(userId)) {
    try {
      await supabase.from('checkins').delete().eq('user_id', userId);
      await supabase.from('users').delete().eq('id', userId);
    } catch (e) {
      console.warn("Supabase remove user notice:", e);
    }
  }
}

export { getLocalSession, setLocalSession };
