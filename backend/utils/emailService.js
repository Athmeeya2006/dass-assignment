const nodemailer = require('nodemailer');

let transporter = null;
let emailMode = 'none'; // 'smtp', 'ethereal', 'none'

const getTransporter = async () => {
  if (transporter) return transporter;

  // If real SMTP credentials are provided (not placeholder values), use them
  const hasRealSmtp = process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_USER !== 'test@gmail.com' &&
    process.env.SMTP_PASS !== 'test_password' &&
    !process.env.SMTP_USER.includes('test@');

  if (hasRealSmtp) {
    try {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: { rejectUnauthorized: false },
      });
      // Verify connection
      await transporter.verify();
      emailMode = 'smtp';
      console.log('[Email] SMTP server connected:', process.env.SMTP_HOST);
      return transporter;
    } catch (err) {
      console.error('[Email] SMTP connection failed:', err.message);
      console.log('[Email] Falling back to Ethereal test account...');
      transporter = null;
    }
  }

  // Fallback: create an Ethereal test account (catches emails for preview, never delivers)
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    emailMode = 'ethereal';
    console.log('[Email] Using Ethereal test account:', testAccount.user);
    console.log('[Email] View sent emails at: https://ethereal.email/login');
    console.log('[Email] Credentials - User:', testAccount.user, '| Pass:', testAccount.pass);
  } catch (err) {
    console.error('[Email] Failed to create Ethereal account:', err.message);
    emailMode = 'none';
    return null;
  }

  return transporter;
};

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const t = await getTransporter();
    if (!t) {
      console.log(`[EMAIL - NO TRANSPORT] To: ${to} | Subject: ${subject}`);
      return true; // Don't block the flow
    }
    const mailOptions = {
      from: process.env.SMTP_USER && !process.env.SMTP_USER.includes('test@')
        ? process.env.SMTP_USER
        : 'felicity@event-management.com',
      to,
      subject,
      html: htmlContent,
    };
    const info = await t.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Email Sent via Ethereal] To: ${to} | Subject: ${subject}`);
      console.log(`  -> Preview: ${previewUrl}`);
    } else {
      console.log(`[Email Sent via SMTP] To: ${to} | Subject: ${subject} | MessageId: ${info.messageId}`);
    }
    return true;
  } catch (error) {
    console.error('[Email] Sending failed:', error.message);
    // Don't throw - let the process continue
    return false;
  }
};

const sendRegistrationConfirmation = async (email, eventName, ticketId, qrCode) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Registration Confirmation</h2>
      <p>Dear Participant,</p>
      <p>You have successfully registered for <strong>${eventName}</strong>.</p>
      <p><strong>Ticket ID:</strong> ${ticketId}</p>
      <div style="margin: 20px 0;">
        <p><strong>Your QR Code:</strong></p>
        <img src="${qrCode}" alt="QR Code" style="max-width: 200px; height: auto;" />
      </div>
      <p>Keep this ticket for check-in during the event.</p>
      <p>Best regards,<br>Felicity Event Management Team</p>
    </div>
  `;
  return sendEmail(email, `Registration Confirmed: ${eventName}`, htmlContent);
};

const sendMerchandiseApprovalEmail = async (email, eventName, ticketId, qrCode) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Merchandise Purchase Approved</h2>
      <p>Dear Participant,</p>
      <p>Your merchandise purchase for <strong>${eventName}</strong> has been approved.</p>
      <p><strong>Ticket ID:</strong> ${ticketId}</p>
      <div style="margin: 20px 0;">
        <p><strong>Your QR Code:</strong></p>
        <img src="${qrCode}" alt="QR Code" style="max-width: 200px; height: auto;" />
      </div>
      <p>Please present this QR code during merchandise collection.</p>
      <p>Best regards,<br>Felicity Event Management Team</p>
    </div>
  `;
  return sendEmail(email, `Merchandise Approved: ${eventName}`, htmlContent);
};

const sendMerchandiseApprovalNotification = async (email, eventName, approvalStatus) => {
  const status = approvalStatus === 'approved' ? 'Approved' : 'Rejected';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Merchandise Purchase ${status}</h2>
      <p>Dear Participant,</p>
      <p>Your merchandise purchase for <strong>${eventName}</strong> has been ${status.toLowerCase()}.</p>
      <p>Log into your dashboard to view details.</p>
      <p>Best regards,<br>Felicity Event Management Team</p>
    </div>
  `;
  return sendEmail(email, `Merchandise Purchase ${status}: ${eventName}`, htmlContent);
};

const sendOrganizerCredentialsEmail = async (email, loginEmail, password, organizerName) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Your Organizer Account Created</h2>
      <p>Dear ${organizerName},</p>
      <p>Your organizer account has been created by the admin.</p>
      <p><strong>Login Email:</strong> ${loginEmail}</p>
      <p><strong>Password:</strong> ${password}</p>
      <p style="color: red;"><strong>Please change your password after first login.</strong></p>
      <p>You can now login at: ${process.env.FRONTEND_URL}/login</p>
      <p>Best regards,<br>Felicity Admin</p>
    </div>
  `;
  return sendEmail(email, 'Your Organizer Account Credentials', htmlContent);
};

const sendPasswordResetNotificationEmail = async (email, organizerName, newPassword) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Your Password Has Been Reset</h2>
      <p>Dear ${organizerName},</p>
      <p>Your password has been reset by the admin.</p>
      <p><strong>New Password:</strong> ${newPassword}</p>
      <p style="color: red;"><strong>Please change this password immediately after login.</strong></p>
      <p>You can login at: ${process.env.FRONTEND_URL}/login</p>
      <p>Best regards,<br>Felicity Admin</p>
    </div>
  `;
  return sendEmail(email, 'Your Password Has Been Reset', htmlContent);
};

const getEmailMode = () => emailMode;

module.exports = {
  sendEmail,
  sendRegistrationConfirmation,
  sendMerchandiseApprovalEmail,
  sendMerchandiseApprovalNotification,
  sendOrganizerCredentialsEmail,
  sendPasswordResetNotificationEmail,
  getEmailMode,
};
