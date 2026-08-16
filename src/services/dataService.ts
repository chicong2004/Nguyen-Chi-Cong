import { supabase, supabaseUrl, supabaseAnonKey } from '../supabase';
import { User, Checkin } from '../types';

const LOCAL_USERS_KEY = 'app_users_data_v1';
const LOCAL_CHECKINS_KEY = 'app_checkins_data_v1';
const LOCAL_SESSION_KEY = 'app_session_user_v1';
const STORAGE_MODE_KEY = 'app_storage_mode_preference';

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

// Initial Mock Data with valid UUIDs
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
    notes: 'Rảnh các ngày thứ 7 & Chủ Nhật',
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
    notes: 'Chuyên chụp ảnh và viết bài',
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
    notes: 'Rảnh các buổi chiều',
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
    shiftName: 'Ca Sáng (08:00 - 12:00)',
    status: 'approved',
    checkinTime: Date.now() - 86400000 * 2,
    checkoutTime: Date.now() - 86400000 * 2 + 14400000,
    type: 'full',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    userId: MOCK_USER_1_ID,
    fullName: 'Nguyễn Văn An',
    department: 'Hậu cần',
    shiftName: 'Ca Chiều (13:00 - 17:00)',
    status: 'pending',
    checkinTime: Date.now() - 86400000,
    type: 'checkin',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    userId: MOCK_USER_2_ID,
    fullName: 'Trần Thị Bình',
    department: 'Truyền thông',
    shiftName: 'Ca Tối (18:00 - 21:00)',
    status: 'approved',
    checkinTime: Date.now() - 86400000,
    checkoutTime: Date.now() - 86400000 + 10800000,
    type: 'full',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  }
];

export function getStorageMode(): 'local' | 'cloud' {
  try {
    const saved = localStorage.getItem(STORAGE_MODE_KEY);
    if (saved === 'cloud' || saved === 'local') return saved;
  } catch {}
  return 'local';
}

export function setStorageMode(mode: 'local' | 'cloud') {
  localStorage.setItem(STORAGE_MODE_KEY, mode);
}

export function isSupabaseActive(): boolean {
  return (
    getStorageMode() === 'cloud' &&
    Boolean(
      supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes('placeholder') &&
      !supabaseAnonKey.includes('placeholder')
    )
  );
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
    // Filter out checkins of deleted users!
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

// Service Methods
export async function registerTNV(payload: {
  fullName: string;
  email: string;
  phone: string;
  facebookLink?: string;
  department: string;
  notes?: string;
  password?: string;
}): Promise<User> {
  if (isSupabaseActive()) {
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password || '123456',
      });
      if (signUpError) throw signUpError;

      if (authData.user) {
        const newUser: User = {
          id: authData.user.id,
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

        await supabase.from('users').insert({
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

        setLocalSession(newUser);
        return newUser;
      }
    } catch (err: any) {
      console.warn("Supabase auth signup notice - switching to local storage mode:", err);
      setStorageMode('local');
    }
  }

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
  return newUser;
}

export async function loginTNV(email: string, password?: string): Promise<User> {
  if (isSupabaseActive()) {
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password: password || '',
      });
      if (!error && authData.user) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', authData.user.id).single();
        if (profile) {
          const user: User = {
            id: profile.id,
            role: profile.role,
            fullName: profile.full_name,
            email: email,
            phone: profile.phone,
            facebookLink: profile.facebook_link,
            department: profile.department,
            salaryRate: profile.salary_rate || 50000,
            createdAt: profile.created_at,
            updatedAt: profile.updated_at,
          };
          setLocalSession(user);
          return user;
        }
      }
    } catch (err) {
      console.warn("Supabase signin notice - fallback to local login:", err);
      setStorageMode('local');
    }
  }

  const users = getLocalUsers();
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
    throw new Error('Mật khẩu Admin không đúng (Mật khẩu mặc định: admin123)');
  }

  const adminUser: User = {
    id: '00000000-0000-4000-8000-000000000000',
    role: 'admin',
    fullName: 'Quản trị viên Hệ thống',
    email: 'admin@admin.com',
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
  const localUsers = getLocalUsers();
  if (isSupabaseActive()) {
    try {
      const { data } = await supabase.from('users').select('*');
      if (data && data.length > 0) {
        const cloudUsers: User[] = data.map(d => ({
          id: d.id,
          role: d.role,
          fullName: d.full_name,
          email: d.email || 'tnv@gmail.com',
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
        return Array.from(map.values());
      }
    } catch (err) {
      console.warn("Supabase fetch users notice:", err);
    }
  }
  return localUsers;
}

export async function fetchCheckins(userId?: string): Promise<Checkin[]> {
  const localCheckins = getLocalCheckins();
  const users = await fetchAllUsers();
  const validUserIds = new Set(users.map(u => u.id));

  let cleanCheckins = localCheckins.filter(c => validUserIds.has(c.userId));

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

export async function submitCheckin(user: User, shiftName?: string): Promise<Checkin> {
  const newCheckin: Checkin = {
    id: generateUUID(),
    userId: user.id,
    fullName: user.fullName,
    department: user.department,
    shiftName: shiftName || 'Ca làm việc tiêu chuẩn',
    status: 'pending',
    checkinTime: Date.now(),
    type: 'checkin',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const checkins = getLocalCheckins();
  checkins.unshift(newCheckin);
  saveLocalCheckins(checkins);

  if (isSupabaseActive() && isValidUUID(user.id)) {
    try {
      await supabase.from('checkins').insert({
        id: newCheckin.id,
        user_id: user.id,
        full_name: user.fullName,
        department: user.department,
        status: 'pending',
        created_at: newCheckin.createdAt,
        updated_at: newCheckin.updatedAt,
      });
    } catch (err) {
      console.warn("Supabase checkin insert notice:", err);
    }
  }
  return newCheckin;
}

// Process TNV QR Scan (Daily Checkin / Checkout)
export async function processQRCheckin(qrToken: string, activeUser?: User): Promise<{ success: boolean; message: string; checkin?: Checkin }> {
  try {
    let parsed: any = null;
    try {
      parsed = JSON.parse(qrToken);
    } catch {
      parsed = { type: 'event_checkin', shiftName: 'Ca làm việc QR' };
    }

    if (!activeUser) {
      return { success: false, message: 'Vui lòng đăng nhập tài khoản TNV để quét QR điểm danh!' };
    }

    const shiftName = parsed.shiftName || 'Ca làm việc QR';
    const actionType = parsed.type === 'event_checkout' ? 'checkout' : 'checkin';

    const userCheckins = await fetchCheckins(activeUser.id);
    const existingPending = userCheckins.find(c => c.status === 'pending' || !c.checkoutTime);

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
        const checkin = await submitCheckin(activeUser, shiftName);
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
      // Check-in action
      const checkin = await submitCheckin(activeUser, shiftName);
      return {
        success: true,
        message: `✅ CHECK-IN VÀO CA THÀNH CÔNG! Ca "${shiftName}" (Đã gửi điểm danh).`,
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

  // Also update full_name in checkins for this user
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

export async function approveCheckinItem(checkinId: string): Promise<void> {
  const checkins = getLocalCheckins();
  const target = checkins.find(c => c.id === checkinId);
  if (target) {
    target.status = 'approved';
    target.updatedAt = Date.now();
    saveLocalCheckins(checkins);
  }

  if (isSupabaseActive() && isValidUUID(checkinId)) {
    try {
      await supabase.from('checkins').update({ status: 'approved', updated_at: Date.now() }).eq('id', checkinId);
    } catch (e) {
      console.warn("Supabase approve notice:", e);
    }
  }
}

export async function bulkApproveCheckinsList(checkinIds: string[]): Promise<void> {
  const checkins = getLocalCheckins();
  checkins.forEach(c => {
    if (checkinIds.includes(c.id)) {
      c.status = 'approved';
      c.updatedAt = Date.now();
    }
  });
  saveLocalCheckins(checkins);

  if (isSupabaseActive()) {
    try {
      const validIds = checkinIds.filter(isValidUUID);
      if (validIds.length > 0) {
        await supabase.from('checkins').update({ status: 'approved', updated_at: Date.now() }).in('id', validIds);
      }
    } catch (e) {
      console.warn("Supabase bulk approve notice:", e);
    }
  }
}

export async function updateUserSalary(userId: string, salaryRate: number): Promise<void> {
  return updateUserProfileByAdmin(userId, { salaryRate });
}

export async function removeUser(userId: string): Promise<void> {
  // 1. Delete user from local storage
  let users = getLocalUsers();
  users = users.filter(u => u.id !== userId);
  saveLocalUsers(users);

  // 2. Delete ALL checkins associated with this user!
  let checkins = getLocalCheckins();
  checkins = checkins.filter(c => c.userId !== userId);
  saveLocalCheckins(checkins);

  // 3. Delete from Supabase if active
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
