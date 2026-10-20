const nodemailer = require('nodemailer');

const emailInboxMemory = [];

let transporter = null;
let isDevMode = true;

async function setupTransporter() {
  const isEnabled = process.env.SMTP_ENABLED === 'true';

  if (isEnabled && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      await transporter.verify();
      isDevMode = false;
      console.log('[MAILER] Real SMTP Transporter initialized successfully with:', process.env.SMTP_USER);
      return;
    } catch (err) {
      console.warn('[MAILER] Warning: Failed to connect to configured SMTP server:', err.message);
      console.warn('[MAILER] Falling back to Development Mailer (OTPs and emails are logged and accessible in UI Dev Mailbox).');
    }
  }

  // Fallback: in-memory + console logger
  isDevMode = true;
  console.log('[MAILER] Running in Development Mailer mode. Emails are logged and previewable via Dev Mailbox.');
}

function getMailerStatus() {
  return {
    isConfigured: !isDevMode && !!transporter,
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || null,
    from: process.env.SMTP_FROM || '"Team Task" <jerisonge0@gmail.com>'
  };
}

async function sendMail({ to, subject, html, text }) {
  const mailRecord = {
    id: 'mail_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    to,
    from: process.env.SMTP_FROM || '"Team Task" <jerisonge0@gmail.com>',
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
    sentAt: new Date().toISOString()
  };

  emailInboxMemory.unshift(mailRecord);
  if (emailInboxMemory.length > 50) emailInboxMemory.pop();

  if (transporter && !isDevMode) {
    try {
      const info = await transporter.sendMail({
        from: mailRecord.from,
        to,
        subject,
        html,
        text: mailRecord.text
      });
      console.log(`[MAILER] Sent real email to ${to}: ${subject} (MessageId: ${info.messageId})`);
      return { success: true, realEmailDelivered: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[MAILER] Error sending email via SMTP to ${to}:`, err.message);
      return { success: false, realEmailDelivered: false, error: err.message };
    }
  } else {
    console.log(`\n================== [SMTP NOT CONFIGURED] ==================`);
    console.log(`Notice: SMTP credentials are not configured in .env.`);
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`DATE: ${mailRecord.sentAt}`);
    console.log(`PREVIEW: ${mailRecord.text.substring(0, 160)}...`);
    console.log(`Configure SMTP_USER & SMTP_PASS in .env to deliver real emails.`);
    console.log(`===========================================================\n`);
    return {
      success: true,
      realEmailDelivered: false,
      devMode: true,
      needsSmtpConfig: true,
      message: 'Email saved to database and dev inspector. Real SMTP dispatch requires SMTP_USER and SMTP_PASS in .env.'
    };
  }
}

// Predefined Email Templates
async function sendOtpEmail(toEmail, otpCode) {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Team Task Manager</h1>
        <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Email Verification Code</p>
      </div>
      <div style="padding: 32px 28px; color: #1e293b; line-height: 1.6;">
        <p style="font-size: 16px; margin-top: 0;">Hello,</p>
        <p style="font-size: 15px; color: #475569;">Thank you for registering on the Team Task Management platform. Please use the verification code below to confirm your email address and activate your account:</p>
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background: #f1f5f9; border: 2px dashed #6366f1; border-radius: 12px; padding: 16px 36px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4338ca; font-family: monospace;">${otpCode}</span>
          </div>
          <p style="font-size: 12px; color: #64748b; margin-top: 10px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        </div>
        <p style="font-size: 14px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-bottom: 0;">
          If you did not request this verification code, please ignore this email or contact support at <a href="mailto:jerisonge0@gmail.com" style="color: #6366f1; text-decoration: underline;">jerisonge0@gmail.com</a>.
        </p>
      </div>
    </div>
  `;
  return sendMail({
    to: toEmail,
    subject: `[${otpCode}] Your Team Task Manager Verification Code`,
    html
  });
}

async function sendWelcomeEmail(toEmail, userName) {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Welcome to the Team, ${userName}! 🎉</h1>
        <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Your account is verified and ready</p>
      </div>
      <div style="padding: 32px 28px; color: #1e293b; line-height: 1.6;">
        <p style="font-size: 15px; color: #334155;">Hello <strong>${userName}</strong>,</p>
        <p style="font-size: 15px; color: #475569;">Your account on the Team Task Management Website has been successfully verified and activated.</p>
        <div style="background: #f8fafc; border-left: 4px solid #10b981; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #0f172a;">What you can do now:</p>
          <ul style="margin: 8px 0 0; padding-left: 20px; font-size: 14px; color: #475569;">
            <li>View tasks assigned to you on your personal dashboard</li>
            <li>Update your task progress (Pending, In Progress, Completed)</li>
            <li>Upload completed work documents and proof of completion</li>
            <li>Directly message the Administrator for doubts or guidance</li>
          </ul>
        </div>
        <p style="font-size: 14px; color: #64748b;">Log in anytime to check your assigned workload and collaborate with the team.</p>
      </div>
    </div>
  `;
  return sendMail({
    to: toEmail,
    subject: `Welcome to Team Task Management, ${userName}!`,
    html
  });
}

async function sendAdminNewUserAlert(adminEmail, newUser) {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
      <div style="background: #1e293b; padding: 24px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 20px;">New Team Member Registered</h2>
      </div>
      <div style="padding: 24px; color: #334155;">
        <p style="margin-top: 0;">A new user has completed email verification and registered on the platform:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; font-weight: 600; color: #64748b; width: 30%;">Name:</td>
            <td style="padding: 8px; font-weight: 600; color: #0f172a;">${newUser.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: 600; color: #64748b;">Email:</td>
            <td style="padding: 8px; color: #0f172a;">${newUser.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: 600; color: #64748b;">Department:</td>
            <td style="padding: 8px; color: #0f172a;">${newUser.department || 'General'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: 600; color: #64748b;">Registered At:</td>
            <td style="padding: 8px; color: #0f172a;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
        <p style="margin-bottom: 0; font-size: 14px; color: #64748b;">You can assign tasks to this user from the Admin Dashboard.</p>
      </div>
    </div>
  `;
  return sendMail({
    to: adminEmail,
    subject: `[Admin Alert] New User Registered: ${newUser.name} (${newUser.email})`,
    html
  });
}

async function sendTaskAssignedEmail(userEmail, userName, task) {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 24px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 20px;">New Task Assigned to You</h2>
      </div>
      <div style="padding: 24px; color: #334155;">
        <p style="margin-top: 0;">Hello <strong>${userName}</strong>,</p>
        <p>The Admin has assigned a new task to you:</p>
        <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px; color: #1e293b; font-size: 17px;">${task.title}</h3>
          <p style="margin: 0 0 12px; color: #475569; font-size: 14px;">${task.description || 'No description provided.'}</p>
          <div style="font-size: 13px; color: #64748b;">
            <span><strong>Priority:</strong> <span style="text-transform: uppercase;">${task.priority}</span></span> &bull; 
            <span><strong>Deadline:</strong> ${task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}</span>
          </div>
        </div>
        <p style="margin-bottom: 0; font-size: 14px; color: #64748b;">Please log in to your dashboard to review details and begin work.</p>
      </div>
    </div>
  `;
  return sendMail({
    to: userEmail,
    subject: `[Task Assigned] ${task.title}`,
    html
  });
}

async function sendLoginNotificationEmail(userEmail, userName, ip, userAgent) {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 24px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 20px;">New Login Detected</h2>
        <p style="margin: 6px 0 0; opacity: 0.9; font-size: 13px;">Team Task Management Security</p>
      </div>
      <div style="padding: 24px 28px; color: #1e293b; line-height: 1.6;">
        <p style="font-size: 15px; margin-top: 0;">Hello <strong>${userName}</strong>,</p>
        <p style="font-size: 14px; color: #475569;">You have successfully logged in to your account. Here are the details of this session:</p>
        <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px; border-radius: 6px; margin: 18px 0; font-size: 13px;">
          <p style="margin: 0 0 6px;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p style="margin: 0 0 6px;"><strong>IP Address:</strong> ${ip || '127.0.0.1'}</p>
          <p style="margin: 0;"><strong>Device / Browser:</strong> ${userAgent || 'Web Browser'}</p>
        </div>
        <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
          If this was not you, please contact support at <a href="mailto:jerisonge0@gmail.com" style="color: #3b82f6; text-decoration: underline;">jerisonge0@gmail.com</a> immediately.
        </p>
      </div>
    </div>
  `;
  return sendMail({
    to: userEmail,
    subject: `[Security Notice] New Login to Your Account - TeamTask`,
    html
  });
}

function getRecentEmails() {
  return emailInboxMemory;
}

module.exports = {
  setupTransporter,
  sendMail,
  sendOtpEmail,
  sendWelcomeEmail,
  sendAdminNewUserAlert,
  sendTaskAssignedEmail,
  sendLoginNotificationEmail,
  getRecentEmails,
  getMailerStatus
};
