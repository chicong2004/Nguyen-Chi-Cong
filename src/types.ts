export type Role = 'admin' | 'tnv';

export interface User {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  phone: string;
  facebookLink?: string;
  department: string;
  notes?: string;
  salaryRate: number; // VND / shift (Chỉ Admin mới có quyền sửa)
  createdAt: number;
  updatedAt: number;
}

export interface Checkin {
  id: string;
  userId: string;
  fullName: string;
  department: string;
  shiftName?: string; // e.g. "Ca Sáng (08:00 - 12:00)", "Ca Chiều (13:00 - 17:00)"
  status: 'pending' | 'approved';
  checkinTime?: number;
  checkoutTime?: number;
  type?: 'checkin' | 'checkout' | 'full';
  qrCodeToken?: string;
  createdAt: number;
  updatedAt: number;
}
