import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../env";
import { httpError } from "../utils/httpError";

let transporter: Transporter | undefined;

export async function sendAdminOtpEmail(email: string, otp: string) {
  const subject = "Your Watson's admin code";
  const text = [
    `Your Watson's admin sign-in code is ${otp}.`,
    "",
    `This code expires in ${env.admin.otpExpiresSeconds} seconds.`,
    "If you did not request this, you can ignore this email."
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;background:#0b0c0b;color:#f4efe6;padding:24px">
      <p style="letter-spacing:.24em;text-transform:uppercase;color:#c89b42;font-size:12px">Watson's Admin</p>
      <h1 style="font-size:28px;margin:0 0 16px">Your code is ${otp}</h1>
      <p>This code expires in ${env.admin.otpExpiresSeconds} seconds.</p>
      <p style="color:#9fb7ad">If you did not request this, you can ignore this email.</p>
    </div>
  `;

  if (!hasSmtpConfig()) {
    if (env.nodeEnv === "production") {
      throw httpError(500, "Admin email delivery is not configured.");
    }

    console.info(`Watson's admin OTP for ${email}: ${otp}`);
    return;
  }

  transporter ??= nodemailer.createTransport({
    host: env.admin.smtp.host,
    port: env.admin.smtp.port,
    secure: env.admin.smtp.secure,
    auth:
      env.admin.smtp.user && env.admin.smtp.pass
        ? {
            user: env.admin.smtp.user,
            pass: env.admin.smtp.pass
          }
        : undefined
  });

  await transporter.sendMail({
    to: email,
    from: env.admin.otpFrom,
    subject,
    text,
    html
  });
}

function hasSmtpConfig() {
  return Boolean(env.admin.smtp.host);
}
