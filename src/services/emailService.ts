import { safeSupabaseUpsertUser } from './dataService';
import { format } from 'date-fns';

const ADMIN_EMAIL_KEY = 'app_admin_email_settings_v1';
const GOOGLE_SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwHyPo28ktAc87yPCjtpGA6_DvPpypjom1LCohIr33Z-sDzgR5fzNVeIIBrB3gZn9E1/exec';

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

/**
 * Gửi email khi Admin duyệt lịch làm việc của TNV
 */
export async function sendApprovalEmailNotification(payload: {
  toEmail: string;
  toName: string;
  shiftName: string;
  workDate?: string;
  salaryRate?: number;
}): Promise<{ success: boolean; message: string }> {
  if (!payload.toEmail || !payload.toEmail.includes('@')) {
    return { success: false, message: 'Email không hợp lệ' };
  }

  const adminSettings = getAdminEmailSettings();
  const subject = `[THÔNG BÁO] Lịch làm việc "${payload.shiftName}" đã được duyệt`;
  const workDateStr = payload.workDate || 'Hôm nay';
  const rateStr = `${(payload.salaryRate || 50000).toLocaleString()} VND/ca`;
  
  const textBody = `Xin chào ${payload.toName},\n\nLịch làm việc của bạn (${payload.shiftName} - Ngày ${workDateStr}) đã được ${adminSettings.adminName} duyệt thành công!\nMức phụ cấp ca: ${rateStr}.\n\nThông báo tự động từ Ban Quản Lý (${adminSettings.senderEmail})\nTrân trọng!`;

  try {
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
    console.error("Lỗi gửi email duyệt:", err);
    return {
      success: false,
      message: `Đã duyệt lịch cho ${payload.toName} (Email: ${payload.toEmail})`
    };
  }
}

/**
 * Tự động gửi email xác nhận khi TNV CHECK-IN vào ca
 */
export async function sendCheckinEmailNotification(payload: {
  toEmail: string;
  toName: string;
  checkinTime: number;
  workDate?: string;
  eventName?: string;
  shiftName?: string;
  department?: string;
}): Promise<{ success: boolean; message: string }> {
  if (!payload.toEmail || !payload.toEmail.includes('@')) {
    return { success: false, message: 'Email không hợp lệ' };
  }

  const adminSettings = getAdminEmailSettings();
  const timeStr = format(payload.checkinTime, 'HH:mm:ss dd/MM/yyyy');
  const workDateStr = payload.workDate || format(payload.checkinTime, 'yyyy-MM-dd');
  const eventStr = payload.eventName || 'Sự kiện hệ thống';
  const shiftStr = payload.shiftName || 'Ca làm việc';
  const deptStr = payload.department || 'Ban Hậu Cần';
  const subject = `[XÁC NHẬN CHECK-IN] Điểm danh vào ca thành công - ${payload.toName}`;

  const textBody = `Xin chào ${payload.toName},\n\nBạn đã Check-in điểm danh vào ca thành công!\n- Sự kiện: ${eventStr}\n- Bộ phận: ${deptStr}\n- Ca làm: ${shiftStr}\n- Ngày làm việc: ${workDateStr}\n- Thời gian quét Check-in: ${timeStr}\n\n📌 LƯU Ý QUAN TRỌNG: Khi kết thúc ca làm, bạn vui lòng quét mã QR CHECK-OUT để hệ thống tự động ghi nhận giờ ra và duyệt tính công!\n\nTrân trọng,\n${adminSettings.adminName} (${adminSettings.senderEmail})`;

  try {
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
    }).catch(e => console.warn("Google Apps Script checkin email notice:", e));

    // Channel 2: FormSubmit AJAX endpoint
    await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(payload.toEmail)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        "Trạng thái": "📍 CHECK-IN THÀNH CÔNG",
        "Kính gửi": payload.toName,
        "Sự kiện": eventStr,
        "Bộ phận": deptStr,
        "Ca làm việc": shiftStr,
        "Ngày làm việc": workDateStr,
        "Giờ Check-in vào": timeStr,
        "Lời nhắc": "Vui lòng nhớ quét mã QR CHECK-OUT khi ra về để hoàn tất tính công!",
        "Quản lý": adminSettings.adminName,
        "Email hỗ trợ": adminSettings.senderEmail,
        "_subject": subject,
        "_replyto": adminSettings.senderEmail,
        "_captcha": "false",
      })
    }).catch(e => console.warn("FormSubmit checkin notice:", e));

    return {
      success: true,
      message: `📧 Đã gửi email xác nhận Check-in đến ${payload.toEmail}`
    };
  } catch (err: any) {
    console.error("Lỗi gửi email checkin:", err);
    return {
      success: false,
      message: `Đã check-in cho ${payload.toName}`
    };
  }
}

/**
 * Tự động gửi email xác nhận khi TNV CHECK-OUT ra về & hoàn tất ca
 */
export async function sendCheckoutEmailNotification(payload: {
  toEmail: string;
  toName: string;
  checkoutTime: number;
  checkinTime?: number;
  workDate?: string;
  eventName?: string;
  shiftName?: string;
  department?: string;
  salaryRate?: number;
}): Promise<{ success: boolean; message: string }> {
  if (!payload.toEmail || !payload.toEmail.includes('@')) {
    return { success: false, message: 'Email không hợp lệ' };
  }

  const adminSettings = getAdminEmailSettings();
  const outTimeStr = format(payload.checkoutTime, 'HH:mm:ss dd/MM/yyyy');
  const inTimeStr = payload.checkinTime ? format(payload.checkinTime, 'HH:mm:ss dd/MM/yyyy') : 'Đã ghi nhận';
  const workDateStr = payload.workDate || format(payload.checkoutTime, 'yyyy-MM-dd');
  const eventStr = payload.eventName || 'Sự kiện hệ thống';
  const shiftStr = payload.shiftName || 'Ca làm việc';
  const deptStr = payload.department || 'Ban Hậu Cần';
  const rateStr = payload.salaryRate ? `${payload.salaryRate.toLocaleString()} VND/ca` : 'Theo biểu phí chuẩn';
  const subject = `[XÁC NHẬN CHECK-OUT] Hoàn thành ca làm việc & Tự động tính công - ${payload.toName}`;

  const textBody = `Xin chào ${payload.toName},\n\nBạn đã Check-out hoàn thành ca làm việc thành công!\n- Sự kiện: ${eventStr}\n- Bộ phận: ${deptStr}\n- Ca làm: ${shiftStr}\n- Ngày làm việc: ${workDateStr}\n- Giờ Check-in vào: ${inTimeStr}\n- Giờ Check-out ra: ${outTimeStr}\n- Mức phụ cấp: ${rateStr}\n- Trạng thái ca: ĐÃ TỰ ĐỘNG DUYỆT & GHI NHẬN TÍNH CÔNG\n\nCảm ơn bạn đã cống hiến hỗ trợ sự kiện!\n\nTrân trọng,\n${adminSettings.adminName} (${adminSettings.senderEmail})`;

  try {
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
    }).catch(e => console.warn("Google Apps Script checkout email notice:", e));

    // Channel 2: FormSubmit AJAX endpoint
    await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(payload.toEmail)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        "Trạng thái": "🏁 CHECK-OUT & TỰ ĐỘNG DUYỆT THÀNH CÔNG",
        "Kính gửi": payload.toName,
        "Sự kiện": eventStr,
        "Bộ phận": deptStr,
        "Ca làm việc": shiftStr,
        "Ngày làm việc": workDateStr,
        "Giờ Check-in": inTimeStr,
        "Giờ Check-out": outTimeStr,
        "Mức phụ cấp / ca": rateStr,
        "Kết quả": "Ca làm việc đã được tự động duyệt & tính công thành công!",
        "Quản lý": adminSettings.adminName,
        "Email hỗ trợ": adminSettings.senderEmail,
        "_subject": subject,
        "_replyto": adminSettings.senderEmail,
        "_captcha": "false",
      })
    }).catch(e => console.warn("FormSubmit checkout notice:", e));

    return {
      success: true,
      message: `📧 Đã gửi email xác nhận Check-out đến ${payload.toEmail}`
    };
  } catch (err: any) {
    console.error("Lỗi gửi email checkout:", err);
    return {
      success: false,
      message: `Đã check-out cho ${payload.toName}`
    };
  }
}
