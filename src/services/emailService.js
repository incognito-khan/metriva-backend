const nodemailer = require("nodemailer");
const config = require("../config/env");

// Create reusable transporter object using SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: false, // MailHog uses plain SMTP
    auth:
      config.smtp.user && config.smtp.password
        ? {
            user: config.smtp.user,
            pass: config.smtp.password,
          }
        : undefined,
  });
};

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} resetUrl - Password reset URL
 * @param {string} userName - User's name for personalization
 */
const sendPasswordResetEmail = async (email, resetUrl, userName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: config.smtp.from,
      to: email,
      subject: "Password Reset Request - Metriva",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50;">Password Reset Request</h2>
            <p>Hello ${userName || "there"},</p>
            <p>We received a request to reset your password for your Metriva account. If you made this request, please click the link below to reset your password:</p>
            <p>
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3498db; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a>
            </p>
            <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
            <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
            <p>If you have any questions, please contact our support team.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #777;">This is an automated email from Metriva. Please do not reply directly to this message.</p>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error("Failed to send password reset email");
  }
};

/**
 * Send OTP verification email
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} userName - User's name for personalization
 * @param {number} expiresInMinutes - OTP expiration time in minutes
 */
const sendOTPEmail = async (email, otp, userName, expiresInMinutes) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: config.smtp.from,
      to: email,
      subject: "Email Verification - Metriva",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50;">Email Verification</h2>
            <p>Hello ${userName || "there"},</p>
            <p>Your Metriva verification code is:</p>
            <p style="font-size: 32px; font-weight: bold; color: #3498db; letter-spacing: 3px; text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">${otp}</p>
            <p><strong>Important:</strong> This code expires in ${expiresInMinutes} minutes for security reasons.</p>
            <p>Please enter this code in the verification field to complete your email verification.</p>
            <p>If you did not request this verification code, please ignore this email.</p>
            <p>If you have any questions, please contact our support team.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #777;">This is an automated email from Metriva. Please do not reply directly to this message.</p>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error("Failed to send OTP email");
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendOTPEmail,
};
