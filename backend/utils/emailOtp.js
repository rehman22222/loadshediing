const crypto = require("crypto");

function createOtpCode() {
  return `${crypto.randomInt(0, 1000000)}`.padStart(6, "0");
}

function hashOtp(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

async function sendVerificationOtpEmail({ to, name, otp }) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = String(process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const smtpSecure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const resendApiKey = String(process.env.RESEND_API_KEY || "").trim();
  const fromEmail = process.env.SMTP_FROM_EMAIL || smtpUser || "no-reply@powertrack.local";
  const resendFromEmail = process.env.RESEND_FROM_EMAIL || fromEmail;
  const fromName = process.env.SMTP_FROM_NAME || "PowerTrack";

  const subject = "Your PowerTrack verification code";
  const text = `Your PowerTrack verification code is ${otp}. It expires in 10 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
      <h2 style="margin-bottom: 8px;">Verify your email</h2>
      <p>Hello ${name || "there"},</p>
      <p>Use the verification code below to finish creating your PowerTrack account:</p>
      <div style="margin: 24px 0; display: inline-block; font-size: 28px; letter-spacing: 8px; font-weight: 700; background: #f3f4f6; padding: 14px 18px; border-radius: 10px;">
        ${otp}
      </div>
      <p>This code expires in 10 minutes.</p>
      <p>If you did not request this account, you can ignore this email.</p>
    </div>
  `;

  if (resendApiKey) {
    const fetch = require("node-fetch");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "loadshedding-tracker/1.0",
      },
      body: JSON.stringify({
        from: `"${fromName}" <${resendFromEmail}>`,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Resend email failed (${response.status}): ${errorBody}`);
    }

    return {
      delivered: true,
      preview: false,
    };
  }

  if (!smtpHost || !smtpUser || !smtpPass) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email is not configured. Set RESEND_API_KEY or SMTP_HOST, SMTP_USER, and SMTP_PASS.");
    }

    console.log(`[DEV OTP] Verification code for ${to}: ${otp}`);
    return {
      delivered: false,
      preview: true,
      devOtpPreview: process.env.NODE_ENV === "production" ? undefined : otp,
    };
  }

  let nodemailer;
  try {
    // Lazy require keeps local development working even if the package is not installed yet.
    nodemailer = require("nodemailer");
  } catch (error) {
    console.log(`[DEV OTP] Verification code for ${to}: ${otp}`);
    return {
      delivered: false,
      preview: true,
      devOtpPreview: process.env.NODE_ENV === "production" ? undefined : otp,
      warning: "nodemailer is not installed, falling back to console OTP preview.",
    };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    requireTLS: !smtpSecure,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
    text,
  });

  return {
    delivered: true,
    preview: false,
  };
}

module.exports = {
  createOtpCode,
  hashOtp,
  sendVerificationOtpEmail,
};
