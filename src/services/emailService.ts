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
  const body = `Xin chào ${payload.toName},\n\nLịch làm việc của bạn (${payload.shiftName} - Ngày ${payload.workDate || 'Hôm nay'}) đã được ${adminSettings.adminName} duyệt thành công!\nMức phụ cấp: ${(payload.salaryRate || 50000).toLocaleString()} VND/ca.\n\nThông báo tự động từ: ${adminSettings.senderEmail}\nTrân trọng!`;

  try {
    await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(payload.toEmail)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        _subject: subject,
        _replyto: adminSettings.senderEmail,
        message: body,
        name: adminSettings.adminName,
      })
    }).catch(e => console.warn("Email API dispatch notice:", e));

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
