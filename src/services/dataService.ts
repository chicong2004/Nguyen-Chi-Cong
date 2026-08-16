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

export function saveEventsList(events: EventItem[]): void {
  localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(events));
  if (isSupabaseActive()) {
    const deps = getDepartmentsList();
    const rates = getDepartmentRates();
    const payloadStr = JSON.stringify({ deps, rates, events });
    supabase.from('users').upsert({
      id: SYSTEM_DEPTS_ID,
      role: 'admin',
      full_name: '__SYSTEM_DEPARTMENTS__',
      phone: '0000000000',
      department: payloadStr,
      salary_rate: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
    }).then(() => {}).catch(err => console.warn("Supabase events sync notice:", err));
  }
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

// Initial Mock Data
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

const SYSTEM_DEPTS_ID = '00000000-0000-4000-8000-000000000099';
const DEPARTMENT_RATES_KEY = 'app_department_rates_v1';

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

export function calculateMeals(shiftName: string): { lunch: number; dinner: number; total: number } {
  const name = shiftName || '';
  if (name.includes('Cả Ngày') || name.toLowerCase().includes('full')) {
    return { lunch: 1, dinner: 1, total: 2 };
  } else if (name.includes('Sáng')) {
    return { lunch: 1, dinner: 0, total: 1 };
  } else if (name.includes('Chiều') || name.includes('Tối')) {
    return { lunch: 0, dinner: 1, total: 1 };
  }
  return { lunch: 1, dinner: 0, total: 1 };
}

export function saveDepartmentRates(rates: Record<string, number>) {
  saveDepartmentsAndRates(getDepartmentsList(), rates);
}

export function saveDepartmentsList(deps: string[]) {
  saveDepartmentsAndRates(deps, getDepartmentRates());
}

export function saveDepartmentsAndRates(deps: string[], rates?: Record<string, number>) {
  const currentRates = rates || getDepartmentRates();
  localStorage.setItem(CUSTOM_DEPARTMENTS_KEY, JSON.stringify(deps));
  localStorage.setItem(DEPARTMENT_RATES_KEY, JSON.stringify(currentRates));

  if (isSupabaseActive()) {
    const events = getEventsList();
    const payloadStr = JSON.stringify({ deps, rates: currentRates, events });
    supabase.from('users').upsert({
      id: SYSTEM_DEPTS_ID,
      role: 'admin',
      full_name: '__SYSTEM_DEPARTMENTS__',
      phone: '0000000000',
      department: payloadStr,
      salary_rate: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
    }).then(() => {}).catch(err => console.warn("Supabase depts sync notice:", err));
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder')
  );
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

export function isSupabaseActive(): boolean {
  return isSupabaseConfigured();
}

// LocalStorage Helper functions
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
    const checkins: Checkin[] = JSON.parse(raw);
    return checkins;
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

function isValidUUID(uuidStr: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuidStr);
}

const GOOGLE_SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwHyPo28ktAc87yPCjtpGA6_DvPpypjom1LCohIr33Z-sDzgR5fzNVeIIBrB3gZn9E1/exec';

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

// Service Methods - Universal Cross-Device Cloud Sync
export async function registerTNV(payload: {
  fullName: string;
  email: string;
  phone: string;
  facebookLink?: string;
  department: string;
  notes?: string;
  password?: string;
}): Promise<User> {
  const cleanEmail = payload.email.trim().toLowerCase();

  // Check local users for existing email
  const users = getLocalUsers();
  const existingLocal = users.find(u => u.email.trim().toLowerCase() === cleanEmail);
  if (existingLocal) {
    throw new Error('⚠️ Email này đã được đăng ký tài khoản TNV trước đó! Mỗi email chỉ được tạo 1 tài khoản.');
  }

  // Check Supabase Cloud for existing email
  if (isSupabaseActive()) {
    try {
      const { data } = await supabase.from('users').select('id, full_name').eq('email', cleanEmail);
      if (data && data.length > 0 && data[0].full_name !== '__SYSTEM_DEPARTMENTS__') {
        throw new Error('⚠️ Email này đã được đăng ký tài khoản TNV trên hệ thống! Vui lòng bấm "Đăng nhập" để đăng ký lịch ca làm & đổi bộ phận.');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Đã được đăng ký')) {
        throw err;
      }
    }
  }

  const newUser: User = {
    id: generateUUID(),
    role: 'tnv',
    fullName: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    facebookLink: payload.facebookLink || '',
    department: payload.department,
    notes: payload.notes || '',
    salaryRate: getDepartmentRate(payload.department),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  users.push(newUser);
  saveLocalUsers(users);
  setLocalSession(newUser);

  // Sync globally to cloud KV & Supabase
  await triggerCloudSync();

  if (isSupabaseActive()) {
    try {
      await supabase.from('users').upsert({
        id: newUser.id,
        role: newUser.role,
        full_name: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        facebook_link: newUser.facebookLink,
        department: newUser.department,
        salary_rate: newUser.salaryRate,
        created_at: newUser.createdAt,
        updated_at: newUser.updatedAt,
      });
    } catch (err: any) {
      console.warn("Cloud sync registration notice:", err);
    }
  }

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
  return adminUser;
}

export async function fetchAllUsers(): Promise<User[]> {
  // If Supabase is active, Supabase Cloud is the single source of truth!
  if (isSupabaseActive()) {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (!error && data) {
        // 1. Process system departments config row if present
        const sysRec = data.find(d => d.id === SYSTEM_DEPTS_ID || d.full_name === '__SYSTEM_DEPARTMENTS__');
        if (sysRec && sysRec.department) {
          try {
            const parsed = JSON.parse(sysRec.department);
            if (Array.isArray(parsed) && parsed.length > 0) {
              localStorage.setItem(CUSTOM_DEPARTMENTS_KEY, JSON.stringify(parsed));
            } else if (typeof parsed === 'object' && parsed !== null) {
              if (Array.isArray(parsed.deps)) {
                localStorage.setItem(CUSTOM_DEPARTMENTS_KEY, JSON.stringify(parsed.deps));
              }
              if (typeof parsed.rates === 'object' && parsed.rates !== null) {
                localStorage.setItem(DEPARTMENT_RATES_KEY, JSON.stringify(parsed.rates));
              }
              if (Array.isArray(parsed.events)) {
                localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(parsed.events));
              }
            }
          } catch {}
        }

        // 2. Filter out system config row from volunteer user list
        const userRecords = data.filter(d => d.id !== SYSTEM_DEPTS_ID && d.full_name !== '__SYSTEM_DEPARTMENTS__');

        if (userRecords.length > 0) {
          const cloudUsers: User[] = userRecords.map(d => ({
            id: d.id,
            role: d.role,
            fullName: d.full_name,
            email: d.email || `${d.full_name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
            phone: d.phone,
            facebookLink: d.facebook_link || '',
            department: d.department,
            salaryRate: Number(d.salary_rate) || 50000,
            createdAt: Number(d.created_at),
            updatedAt: Number(d.updated_at),
          }));
          saveLocalUsers(cloudUsers);
          return cloudUsers;
        } else {
          saveLocalUsers([]);
          return [];
        }
      }
    } catch (err) {
      console.warn("Supabase fetch users notice:", err);
    }
  }

  // Fallback to local storage if Supabase is not active
  return getLocalUsers();
}

export async function fetchCheckins(userId?: string): Promise<Checkin[]> {
  const users = await fetchAllUsers();
  const validUserIds = new Set(users.map(u => u.id));

  if (isSupabaseActive()) {
    try {
      let query = supabase.from('checkins').select('*').order('created_at', { ascending: false });
      if (userId && isValidUUID(userId)) {
        query = query.eq('user_id', userId);
      }
      const { data, error } = await query;
      if (!error && data) {
        if (data.length > 0) {
          const cloudCheckins: Checkin[] = data
            .filter(d => validUserIds.has(d.user_id))
            .map(d => ({
              id: d.id,
              userId: d.user_id,
              fullName: d.full_name,
              department: d.department,
              workDate: d.work_date || format(new Date(Number(d.created_at)), 'yyyy-MM-dd'),
              shiftName: d.shift_name || 'Ca làm việc',
              otHours: Number(d.ot_hours) || 0,
              status: d.status,
              type: 'checkin',
              adminNote: d.admin_note || d.notes || '',
              checkinTime: d.checkin_time ? Number(d.checkin_time) : undefined,
              checkoutTime: d.checkout_time ? Number(d.checkout_time) : undefined,
              createdAt: Number(d.created_at),
              updatedAt: Number(d.updated_at),
            }));

          saveLocalCheckins(cloudCheckins);
          if (userId) {
            return cloudCheckins.filter(c => c.userId === userId);
          }
          return cloudCheckins;
        } else {
          saveLocalCheckins([]);
          return [];
        }
      }
    } catch (err) {
      console.warn("Supabase fetch checkins notice:", err);
    }
  }

  const localCheckins = getLocalCheckins().filter(c => validUserIds.has(c.userId));
  if (userId) {
    return localCheckins.filter(c => c.userId === userId);
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
  const chosenDepartment = targetDepartment || user.department;
  const deptRate = getDepartmentRate(chosenDepartment);

  // Update user profile department and salary rate if targetDepartment is specified
  if (targetDepartment) {
    user.department = targetDepartment;
    user.salaryRate = deptRate;
    user.updatedAt = Date.now();
    try {
      await updateUserProfileByAdmin(user.id, { department: targetDepartment, salaryRate: deptRate });
    } catch {}
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

  const checkins = getLocalCheckins();
  checkins.unshift(newSchedule);
  saveLocalCheckins(checkins);

  await triggerCloudSync();

  if (isSupabaseActive() && isValidUUID(user.id)) {
    try {
      // First ensure user exists in Supabase users table with chosen department & rate
      await supabase.from('users').upsert({
        id: user.id,
        role: user.role,
        full_name: user.fullName,
        email: user.email,
        phone: user.phone,
        facebook_link: user.facebookLink || '',
        department: chosenDepartment,
        salary_rate: deptRate,
        created_at: user.createdAt,
        updated_at: Date.now(),
      });

      // Insert full checkin payload
      await supabase.from('checkins').insert({
        id: newSchedule.id,
        user_id: user.id,
        full_name: user.fullName,
        department: chosenDepartment,
        work_date: workDate,
        shift_name: shiftName,
        ot_hours: otHours,
        status: 'pending',
        notes: notes || '',
        admin_note: notes || '',
        created_at: newSchedule.createdAt,
        updated_at: newSchedule.updatedAt,
      });
    } catch (err) {
      console.warn("Supabase schedule insert notice:", err);
    }
  }
  return newSchedule;
}

// Process Event QR Scan (Auto Checkin / Checkout)
export async function processQRCheckin(qrToken: string, activeUser?: User): Promise<{ success: boolean; message: string; checkin?: Checkin }> {
  try {
    let parsed: any = null;
    try {
      parsed = JSON.parse(qrToken);
    } catch {
      parsed = { type: 'event_checkin', shiftName: 'Ca Sáng (07:00 - 12:00)' };
    }

    if (!activeUser) {
      return { success: false, message: 'Vui lòng đăng nhập tài khoản TNV để quét QR điểm danh!' };
    }

    const shiftName = parsed.shiftName || 'Ca làm việc';
    const actionType = parsed.type === 'event_checkout' ? 'checkout' : 'checkin';
    const workDate = parsed.date || format(new Date(), 'yyyy-MM-dd');

    const userCheckins = await fetchCheckins(activeUser.id);
    const existingPending = userCheckins.find(c => c.workDate === workDate || !c.checkoutTime);

    if (actionType === 'checkout') {
      if (existingPending) {
        existingPending.checkoutTime = Date.now();
        existingPending.type = 'full';
        existingPending.status = 'approved';
        existingPending.updatedAt = Date.now();

        // Update local storage
        const allCheckins = getLocalCheckins();
        const idx = allCheckins.findIndex(c => c.id === existingPending.id);
        if (idx !== -1) {
          allCheckins[idx] = existingPending;
          saveLocalCheckins(allCheckins);
        }

        // Update Supabase
        if (isSupabaseActive() && isValidUUID(existingPending.id)) {
          await supabase.from('checkins').update({
            status: 'approved',
            checkin_time: existingPending.checkinTime || null,
            checkout_time: existingPending.checkoutTime,
            updated_at: Date.now(),
          }).eq('id', existingPending.id);
        }

        await approveCheckinItem(existingPending.id);

        return {
          success: true,
          message: `📍 CHECK-OUT THÀNH CÔNG! Đã hoàn thành và tự động duyệt ca "${existingPending.shiftName}".`,
          checkin: existingPending,
        };
      } else {
        const checkin = await submitScheduleRegistration(activeUser, workDate, shiftName, 0);
        checkin.checkinTime = Date.now();
        checkin.checkoutTime = Date.now();
        checkin.type = 'full';
        checkin.status = 'approved';

        // Update local storage
        const allCheckins = getLocalCheckins();
        const idx = allCheckins.findIndex(c => c.id === checkin.id);
        if (idx !== -1) {
          allCheckins[idx] = checkin;
          saveLocalCheckins(allCheckins);
        }

        // Update Supabase
        if (isSupabaseActive() && isValidUUID(checkin.id)) {
          await supabase.from('checkins').update({
            status: 'approved',
            checkin_time: checkin.checkinTime,
            checkout_time: checkin.checkoutTime,
            updated_at: Date.now(),
          }).eq('id', checkin.id);
        }

        await approveCheckinItem(checkin.id);
        return {
          success: true,
          message: `📍 CHECK-OUT THÀNH CÔNG cho ca "${shiftName}".`,
          checkin,
        };
      }
    } else {
      const checkin = await submitScheduleRegistration(activeUser, workDate, shiftName, 0);
      checkin.checkinTime = Date.now();
      checkin.status = 'approved';

      // Update local storage
      const allCheckins = getLocalCheckins();
      const idx = allCheckins.findIndex(c => c.id === checkin.id);
      if (idx !== -1) {
        allCheckins[idx] = checkin;
        saveLocalCheckins(allCheckins);
      }

      // Update Supabase
      if (isSupabaseActive() && isValidUUID(checkin.id)) {
        await supabase.from('checkins').update({
          status: 'approved',
          checkin_time: checkin.checkinTime,
          updated_at: Date.now(),
        }).eq('id', checkin.id);
      }

      await approveCheckinItem(checkin.id);
      return {
        success: true,
        message: `✅ CHECK-IN THÀNH CÔNG! Đã điểm danh tự động cho ca "${shiftName}".`,
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
      const updatePayload: any = { status: 'approved', updated_at: Date.now() };
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
