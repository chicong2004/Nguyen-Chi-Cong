import { safeSupabaseUpsertUser } from './dataService';

const ADMIN_EMAIL_KEY = 'app_admin_email_settings_v1';

export interface AdminEmailSettings {
  senderEmail: string;
  adminName: string;
}

export function getAdminEmailSettings(): AdminEmailSettings {
  try {
    const raw = localStorage.getItem(ADMIN_EMAIL_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    senderEmail: 'chicong092004@gmail.com',
    adminName: 'Quản trị viên Hệ thống',
  };
}

export function saveAdminEmailSettings(settings: AdminEmailSettings) {
  localStorage.setItem(ADMIN_EMAIL_KEY, JSON.stringify(settings));
  safeSupabaseUpsertUser({
    id: '00000000-0000-4000-8000-000000000000',
    role: 'admin',
    fullName: settings.adminName || 'Quản trị viên Hệ thống',
    email: settings.senderEmail || 'chicong092004@gmail.com',
    phone: '0900000000',
    department: 'Ban Điều Hành',
    salaryRate: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }).catch(() => {});
}

export async function sendApprovalEmailNotification(payload: {
  toEmail: string;
  toName: string;
  shiftName: string;
  workDate?: string;
  salaryRate?: number;
}): Promise<{ success: boolean; message: string }> {
  const adminSettings = getAdminEmailSettings();
  const subject = `[THÔNG BÁO] Lịch làm việc "${payload.shiftName}" đã được duyệt`;
  const workDateStr = payload.workDate || 'Hôm nay';
  const rateStr = `${(payload.salaryRate || 50000).toLocaleString()} VND/ca`;
  
  const textBody = `Xin chào ${payload.toName},\n\nLịch làm việc của bạn (${payload.shiftName} - Ngày ${workDateStr}) đã được ${adminSettings.adminName} duyệt thành công!\nMức phụ cấp ca: ${rateStr}.\n\nThông báo tự động từ Ban Quản Lý (${adminSettings.senderEmail})\nTrân trọng!`;

  try {
    const GOOGLE_SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwHyPo28ktAc87yPCjtpGA6_DvPpypjom1LCohIr33Z-sDzgR5fzNVeIIBrB3gZn9E1/exec';

    // Channel 1: Google Apps Script WebApp
    fetch(GOOGLE_SHEETS_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'send_email',
        toEmail: payload.toEmail,
        toName: payload.toName,
        subject,
        message: textBody,
      })
    }).catch(e => console.warn("Google Apps Script email notice:", e));

    // Channel 2: FormSubmit AJAX endpoint formatted with key-values for rich HTML delivery
    await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(payload.toEmail)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        "Trạng thái": "🎉 DUYỆT THÀNH CÔNG",
        "Kính gửi": payload.toName,
        "Thông báo": `Lịch làm việc (${payload.shiftName}) của bạn đã được duyệt chính thức!`,
        "Ca làm việc": payload.shiftName,
        "Ngày làm việc": workDateStr,
        "Mức phụ cấp / ca": rateStr,
        "Người duyệt": adminSettings.adminName,
        "Email hỗ trợ": adminSettings.senderEmail,
        "_subject": subject,
        "_replyto": adminSettings.senderEmail,
        "_captcha": "false",
      })
    }).catch(e => console.warn("FormSubmit notice:", e));

    return {
      success: true,
      message: `📧 Đã tự động gửi email thông báo tới ${payload.toEmail} từ ${adminSettings.senderEmail}`
    };
  } catch (err: any) {
    console.error("Lỗi gửi email:", err);
    return {
      success: false,
      message: `Đã duyệt lịch cho ${payload.toName} (Email: ${payload.toEmail})`
    };
  }
}
