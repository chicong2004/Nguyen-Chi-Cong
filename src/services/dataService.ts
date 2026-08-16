import { supabase, supabaseUrl, supabaseAnonKey } from '../supabase';
import { User, Checkin } from '../types';

const LOCAL_USERS_KEY = 'app_users_data_v1';
const LOCAL_CHECKINS_KEY = 'app_checkins_data_v1';
const LOCAL_SESSION_KEY = 'app_session_user_v1';

// Initial Mock Data when running in LocalStorage mode or fallback
const INITIAL_MOCK_USERS: User[] = [
  {
    id: 'tnv-demo-1',
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
    id: 'tnv-demo-2',
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
    id: 'tnv-demo-3',
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
    id: 'ci-1',
    userId: 'tnv-demo-1',
    fullName: 'Nguyễn Văn An',
    department: 'Hậu cần',
    shiftName: 'Ca Sáng (08:00 - 12:00)',
    status: 'approved',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'ci-2',
    userId: 'tnv-demo-1',
    fullName: 'Nguyễn Văn An',
    department: 'Hậu cần',
    shiftName: 'Ca Chiều (13:00 - 17:00)',
    status: 'pending',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
  {
    id: 'ci-3',
    userId: 'tnv-demo-2',
    fullName: 'Trần Thị Bình',
    department: 'Truyền thông',
    shiftName: 'Ca Tối (18:00 - 21:00)',
    status: 'approved',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
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
    return JSON.parse(raw);
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
  if (isSupabaseConfigured()) {
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
      console.warn("Supabase auth signup failed, falling back to local registration:", err);
    }
  }

  // LocalStorage fallback mode
  const users = getLocalUsers();
  const existing = users.find(u => u.email.toLowerCase() === payload.email.toLowerCase());
  if (existing) {
    throw new Error('Email này đã được đăng ký trên hệ thống');
  }

  const newUser: User = {
    id: 'tnv-' + Date.now(),
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
  if (isSupabaseConfigured()) {
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
      console.warn("Supabase signin error, checking local users fallback:", err);
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
    id: 'admin-root',
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
  if (isSupabaseConfigured()) {
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
      console.warn("Supabase fetch users failed, using local:", err);
    }
  }
  return localUsers;
}

export async function fetchCheckins(userId?: string): Promise<Checkin[]> {
  const localCheckins = getLocalCheckins();
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('checkins').select('*').order('created_at', { ascending: false });
      if (userId) {
        query = query.eq('user_id', userId);
      }
      const { data } = await query;
      if (data && data.length > 0) {
        const cloudCheckins: Checkin[] = data.map(d => ({
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
        localCheckins.forEach(c => map.set(c.id, c));
        cloudCheckins.forEach(c => map.set(c.id, c));
        const combined = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
        return userId ? combined.filter(c => c.userId === userId) : combined;
      }
    } catch (err) {
      console.warn("Supabase fetch checkins failed, using local:", err);
    }
  }

  if (userId) {
    return localCheckins.filter(c => c.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
  }
  return localCheckins.sort((a, b) => b.createdAt - a.createdAt);
}

export async function submitCheckin(user: User, shiftName?: string): Promise<Checkin> {
  const newCheckin: Checkin = {
    id: 'ci-' + Date.now(),
    userId: user.id,
    fullName: user.fullName,
    department: user.department,
    shiftName: shiftName || 'Ca làm việc tiêu chuẩn',
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const checkins = getLocalCheckins();
  checkins.unshift(newCheckin);
  saveLocalCheckins(checkins);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('checkins').insert({
        user_id: user.id,
        full_name: user.fullName,
        department: user.department,
        status: 'pending',
        created_at: newCheckin.createdAt,
        updated_at: newCheckin.updatedAt,
      });
    } catch (err) {
      console.warn("Supabase checkin insert error:", err);
    }
  }
  return newCheckin;
}

// Admin updates ANY TNV field (Department, Salary rate, Name, Phone, Facebook, Notes)
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

  if (isSupabaseConfigured()) {
    try {
      const updatePayload: any = { updated_at: Date.now() };
      if (data.fullName !== undefined) updatePayload.full_name = data.fullName;
      if (data.phone !== undefined) updatePayload.phone = data.phone;
      if (data.facebookLink !== undefined) updatePayload.facebook_link = data.facebookLink;
      if (data.department !== undefined) updatePayload.department = data.department;
      if (data.salaryRate !== undefined) updatePayload.salary_rate = data.salaryRate;
      await supabase.from('users').update(updatePayload).eq('id', userId);
    } catch (e) {
      console.warn("Supabase update profile error:", e);
    }
  }

  return user || (data as User);
}

// QR Check-in processing (Accepts either Event QR or User QR)
export async function processQRCheckin(qrToken: string, activeUser?: User): Promise<{ success: boolean; message: string; checkin?: Checkin }> {
  try {
    let parsed: any = null;
    try {
      parsed = JSON.parse(qrToken);
    } catch {
      // Plain text user ID or token
      parsed = { type: 'user_qr', userId: qrToken };
    }

    const users = await fetchAllUsers();

    // Case 1: Event QR scanned by TNV (type: 'event_qr')
    if (parsed.type === 'event_qr' || parsed.shiftName) {
      if (!activeUser) {
        return { success: false, message: 'Vui lòng đăng nhập tài khoản TNV để quét QR điểm danh!' };
      }
      const shiftName = parsed.shiftName || 'Ca làm việc QR';
      const checkin = await submitCheckin(activeUser, shiftName);
      // Auto-approve QR check-ins!
      await approveCheckinItem(checkin.id);
      return { 
        success: true, 
        message: `Đã điểm danh & tự động duyệt ca "${shiftName}" thành công!`,
        checkin: { ...checkin, status: 'approved' }
      };
    }

    // Case 2: Admin scans TNV User QR (type: 'user_qr')
    if (parsed.type === 'user_qr' || parsed.userId) {
      const targetUserId = parsed.userId || qrToken;
      const targetUser = users.find(u => u.id === targetUserId);
      if (!targetUser) {
        return { success: false, message: `Không tìm thấy thông tin TNV từ mã QR này (ID: ${targetUserId})` };
      }
      const checkin = await submitCheckin(targetUser, 'Điểm danh qua QR bởi Admin');
      await approveCheckinItem(checkin.id);
      return {
        success: true,
        message: `Đã quét QR & tự động duyệt điểm danh cho TNV ${targetUser.fullName} (${targetUser.department})!`,
        checkin: { ...checkin, status: 'approved' }
      };
    }

    return { success: false, message: 'Mã QR không đúng định dạng của hệ thống.' };
  } catch (err: any) {
    console.error("Lỗi xử lý QR checkin:", err);
    return { success: false, message: err.message || 'Lỗi khi xử lý mã QR điểm danh.' };
  }
}

export async function approveCheckinItem(checkinId: string): Promise<void> {
  const checkins = getLocalCheckins();
  const target = checkins.find(c => c.id === checkinId);
  if (target) {
    target.status = 'approved';
    target.updatedAt = Date.now();
    saveLocalCheckins(checkins);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('checkins').update({ status: 'approved', updated_at: Date.now() }).eq('id', checkinId);
    } catch (e) {
      console.warn("Supabase approve error:", e);
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

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('checkins').update({ status: 'approved', updated_at: Date.now() }).in('id', checkinIds);
    } catch (e) {
      console.warn("Supabase bulk approve error:", e);
    }
  }
}

export async function updateUserSalary(userId: string, salaryRate: number): Promise<void> {
  return updateUserProfileByAdmin(userId, { salaryRate });
}

export async function removeUser(userId: string): Promise<void> {
  let users = getLocalUsers();
  users = users.filter(u => u.id !== userId);
  saveLocalUsers(users);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('users').delete().eq('id', userId);
    } catch (e) {
      console.warn("Supabase remove user error:", e);
    }
  }
}

export { getLocalSession, setLocalSession };
