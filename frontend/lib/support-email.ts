import nodemailer from 'nodemailer';

export type SupportMessageInput = {
  name: string;
  studentId: string;
  email: string;
  subject: string;
  message: string;
};

function getMailerConfig() {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_APP_PASSWORD;
  const adminEmail = process.env.EMAIL_ADMIN;

  if (!emailUser || !emailPassword || !adminEmail) {
    throw new Error('Email configuration is incomplete');
  }

  return {
    emailUser,
    emailPassword,
    adminEmail,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildAdminHtml(input: SupportMessageInput) {
  return `
    <div style="margin:0;background:#f6f8fb;padding:32px 16px;font-family:Arial,sans-serif;color:#1f2937;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #dbe3f0;border-radius:20px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0f2d63,#1d4ed8);padding:28px 32px;color:#ffffff;">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#f3c64d;font-weight:700;">Smart LMS Support</div>
          <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;">New Support Message</h1>
        </div>
        <div style="padding:32px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:10px 0;font-weight:700;color:#0f2d63;width:140px;">Name</td><td style="padding:10px 0;">${escapeHtml(input.name)}</td></tr>
            <tr><td style="padding:10px 0;font-weight:700;color:#0f2d63;">Student ID</td><td style="padding:10px 0;">${escapeHtml(input.studentId)}</td></tr>
            <tr><td style="padding:10px 0;font-weight:700;color:#0f2d63;">Email</td><td style="padding:10px 0;">${escapeHtml(input.email)}</td></tr>
            <tr><td style="padding:10px 0;font-weight:700;color:#0f2d63;">Subject</td><td style="padding:10px 0;">${escapeHtml(input.subject)}</td></tr>
          </table>
          <div style="margin-top:24px;padding:20px;border:1px solid #dbe3f0;border-radius:16px;background:#f8fbff;">
            <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#1d4ed8;font-weight:700;margin-bottom:10px;">Message</div>
            <p style="margin:0;white-space:pre-wrap;line-height:1.7;">${escapeHtml(input.message)}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildConfirmationHtml(input: SupportMessageInput) {
  return `
    <div style="margin:0;background:#f6f8fb;padding:32px 16px;font-family:Arial,sans-serif;color:#1f2937;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #dbe3f0;border-radius:20px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0f2d63,#1d4ed8);padding:28px 32px;color:#ffffff;">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#f3c64d;font-weight:700;">Smart LMS Support</div>
          <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;">We received your message</h1>
        </div>
        <div style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi ${escapeHtml(input.name)},</p>
          <p style="margin:0 0 16px;line-height:1.7;">
            Your support request has been sent successfully. Our team will review it and get back to you using the email address you provided.
          </p>
          <div style="margin:24px 0;padding:20px;border:1px solid #dbe3f0;border-radius:16px;background:#f8fbff;">
            <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#1d4ed8;font-weight:700;margin-bottom:10px;">Request Summary</div>
            <p style="margin:0 0 8px;"><strong>Subject:</strong> ${escapeHtml(input.subject)}</p>
            <p style="margin:0;"><strong>Student ID:</strong> ${escapeHtml(input.studentId)}</p>
          </div>
          <p style="margin:0;line-height:1.7;">
            If you need to follow up, reply to this email and keep the same subject line.
          </p>
        </div>
      </div>
    </div>
  `;
}

function buildAdminText(input: SupportMessageInput) {
  return [
    'New Smart LMS support message',
    `Name: ${input.name}`,
    `Student ID: ${input.studentId}`,
    `Email: ${input.email}`,
    `Subject: ${input.subject}`,
    '',
    input.message,
  ].join('\n');
}

function buildConfirmationText(input: SupportMessageInput) {
  return [
    `Hi ${input.name},`,
    '',
    'We received your Smart LMS support message.',
    `Subject: ${input.subject}`,
    `Student ID: ${input.studentId}`,
    '',
    'Our team will get back to you soon.',
  ].join('\n');
}

export async function sendSupportEmails(input: SupportMessageInput) {
  const { emailUser, emailPassword, adminEmail } = getMailerConfig();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });

  await transporter.sendMail({
    from: `"Smart LMS Support" <${emailUser}>`,
    to: adminEmail,
    replyTo: input.email,
    subject: `[Support] ${input.subject}`,
    text: buildAdminText(input),
    html: buildAdminHtml(input),
  });

  await transporter.sendMail({
    from: `"Smart LMS Support" <${emailUser}>`,
    to: input.email,
    replyTo: adminEmail,
    subject: `We received your request: ${input.subject}`,
    text: buildConfirmationText(input),
    html: buildConfirmationHtml(input),
  });
}
