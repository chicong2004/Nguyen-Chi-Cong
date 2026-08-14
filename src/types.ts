export type Role = 'admin' | 'tnv';

export interface User {
  id: string;
  role: Role;
  fullName: string;
  phone: string;
  facebookLink?: string;
  department: string;
  salaryRate: number; // e.g. 50000 VND / shift
  createdAt: number;
  updatedAt: number;
}

export interface Checkin {
  id: string;
  userId: string;
  fullName: string;
  department: string;
  status: 'pending' | 'approved';
  createdAt: number;
  updatedAt: number;
}
