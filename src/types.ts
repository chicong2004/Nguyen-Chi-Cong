export type Role = 'admin' | 'tnv';

export interface EventItem {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  location?: string;
  status: 'active' | 'archived'; // active = Mở cho TNV đăng ký
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  phone: string;
  facebookLink?: string;
  department: string;
  notes?: string;
  salaryRate: number; // VND / ca (Chỉ Admin mới có quyền sửa)
  createdAt: number;
  updatedAt: number;
}

export interface Checkin {
  id: string;
  userId: string;
  fullName: string;
  department: string;
  eventId?: string;
  eventName?: string;
  workDate?: string; // YYYY-MM-DD
  shiftName?: string; // e.g. "Ca Sáng (07:00 - 12:00)", "Ca Chiều (13:00 - 17:30)", "Ca Tối / OT (18:00 - 22:00)", "Ca Cả Ngày (07:00 - 17:30)"
  otHours?: number; // Số giờ OT làm thêm
  status: 'pending' | 'approved' | 'rejected';
  checkinTime?: number;
  checkoutTime?: number;
  type?: 'checkin' | 'checkout' | 'full';
  qrCodeToken?: string;
  adminNote?: string;
  emailNotifySent?: boolean;
  createdAt: number;
  updatedAt: number;
}
