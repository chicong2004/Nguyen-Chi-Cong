import { supabase, supabaseUrl, supabaseAnonKey } from '../supabase';
import { User, Checkin } from '../types';
import { format } from 'date-fns';
import { sendApprovalEmailNotification, getAdminEmailSettings } from './emailService';
import { pushGlobalCloudData, pullGlobalCloudData } from './cloudSyncService';

const LOCAL_USERS_KEY = 'app_users_data_v1';
const LOCAL_CHECKINS_KEY = 'app_checkins_data_v1';
const LOCAL_SESSION_KEY = 'app_session_user_v1';
const STORAGE_MODE_KEY = 'app_storage_mode_preference';
const CUSTOM_DEPARTMENTS_KEY = 'app_custom_departments_v1';

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

export function getDepartmentsList(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_DEPARTMENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return ['Hậu cần', 'Truyền thông', 'Sự kiện', 'Tài trợ', 'Nhân sự'];
}

export function saveDepartmentsList(deps: string[]) {
  localStorage.setItem(CUSTOM_DEPARTMENTS_KEY, JSON.stringify(deps));
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
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(INITIAL_MOCK_USERS));
      return INITIAL_MOCK_USERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_MOCK_USERS;
  }
}

function saveLocalUsers(users: User[]) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function getLocalCheckins(): Checkin[] {
  try {
    const raw = localStorage.getItem(LOCAL_CHECKINS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_CHECKINS_KEY, JSON.stringify(INITIAL_MOCK_CHECKINS));
      return INITIAL_MOCK_CHECKINS;
    }
    const checkins: Checkin[] = JSON.parse(raw);
    const users = getLocalUsers();
    const validUserIds = new Set(users.map(u => u.id));
    const cleanCheckins = checkins.filter(c => validUserIds.has(c.userId));
    if (cleanCheckins.length !== checkins.length) {
      saveLocalCheckins(cleanCheckins);
    }
    return cleanCheckins;
  } catch (e) {
    return INITIAL_MOCK_CHECKINS;
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

// Trigger Cloud Sync across all devices
async function triggerCloudSync() {
  const users = getLocalUsers();
  const checkins = getLocalCheckins();
  await pushGlobalCloudData({ users, checkins });
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
  const users = getLocalUsers();
  const existing = users.find(u => u.email.toLowerCase() === payload.email.toLowerCase());
  if (existing) {
    throw new Error('Email này đã được đăng ký trên hệ thống');
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
    salaryRate: 50000,
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
  let localUsers = getLocalUsers();

  // 1. Try pulling from Global Cloud Relay for instant cross-device sync!
  const cloudData = await pullGlobalCloudData();
  if (cloudData && Array.isArray(cloudData.users)) {
    const map = new Map<string, User>();
    localUsers.forEach(u => map.set(u.id, u));
    cloudData.users.forEach((u: any) => map.set(u.id, u));
    localUsers = Array.from(map.values());
    saveLocalUsers(localUsers);
  }

  // 2. Try Supabase
  if (isSupabaseActive()) {
    try {
      const { data } = await supabase.from('users').select('*');
      if (data && data.length > 0) {
        const cloudUsers: User[] = data.map(d => ({
          id: d.id,
          role: d.role,
          fullName: d.full_name,
          email: d.email || `${d.full_name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
          phone: d.phone,
          facebookLink: d.facebook_link,
          department: d.department,
          salaryRate: d.salary_rate || 50000,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
        
        const map = new Map<string, User>();
        localUsers.forEach(u => map.set(u.id, u));
        cloudUsers.forEach(u => map.set(u.id, u));
        localUsers = Array.from(map.values());
        saveLocalUsers(localUsers);
      }
    } catch (err) {
      console.warn("Supabase fetch users notice:", err);
    }
  }

  return localUsers;
}

export async function fetchCheckins(userId?: string): Promise<Checkin[]> {
  let localCheckins = getLocalCheckins();
  const users = await fetchAllUsers();
  const validUserIds = new Set(users.map(u => u.id));
  let cleanCheckins = localCheckins.filter(c => validUserIds.has(c.userId));

  // 1. Pull from Global Cloud Relay
  const cloudData = await pullGlobalCloudData();
  if (cloudData && Array.isArray(cloudData.checkins)) {
    const map = new Map<string, Checkin>();
    cleanCheckins.forEach(c => map.set(c.id, c));
    cloudData.checkins.filter((c: any) => validUserIds.has(c.userId)).forEach((c: any) => map.set(c.id, c));
    cleanCheckins = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
    saveLocalCheckins(cleanCheckins);
  }

  // 2. Pull from Supabase
  if (isSupabaseActive()) {
    try {
      if (!userId || isValidUUID(userId)) {
        let query = supabase.from('checkins').select('*').order('created_at', { ascending: false });
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { data } = await query;
        if (data && data.length > 0) {
          const cloudCheckins: Checkin[] = data
            .filter(d => validUserIds.has(d.user_id))
            .map(d => ({
              id: d.id,
              userId: d.user_id,
              fullName: d.full_name,
              department: d.department,
              shiftName: d.shift_name || 'Ca làm việc',
              status: d.status,
              createdAt: d.created_at,
              updatedAt: d.updated_at,
            }));

          const map = new Map<string, Checkin>();
          cleanCheckins.forEach(c => map.set(c.id, c));
          cloudCheckins.forEach(c => map.set(c.id, c));
          cleanCheckins = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
          saveLocalCheckins(cleanCheckins);
        }
      }
    } catch (err) {
      console.warn("Supabase fetch checkins notice:", err);
    }
  }

  if (userId) {
    return cleanCheckins.filter(c => c.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
  }
  return cleanCheckins.sort((a, b) => b.createdAt - a.createdAt);
}

// TNV registers schedule for a specific date, shift, and OT hours
export async function submitScheduleRegistration(
  user: User, 
  workDate: string, 
  shiftName: string, 
  otHours: number = 0,
  notes?: string
): Promise<Checkin> {
  const newSchedule: Checkin = {
    id: generateUUID(),
    userId: user.id,
    fullName: user.fullName,
    department: user.department,
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
      await supabase.from('checkins').insert({
        id: newSchedule.id,
        user_id: user.id,
        full_name: user.fullName,
        department: user.department,
        status: 'pending',
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
      await supabase.from('checkins').update({ status: 'approved', updated_at: Date.now() }).eq('id', checkinId);
    } catch (e) {
      console.warn("Supabase approve notice:", e);
    }
  }

  return { success: true, emailNotice };
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
