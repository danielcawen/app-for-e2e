import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const auth = process.env.EMAIL_USER
      ? { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      : undefined;

    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '1025'),
      secure: false,
      auth,
    });
  }

  /**
   * Sends a magic link email to the user
   * @param email The recipient's email address
   * @param magicLink The generated magic link URL
   */
  async sendMagicLinkEmail(email: string, magicLink: string): Promise<void> {
    const mailOptions = {
      from: '"E2E Practice App" <no-reply@e2d-practice.com>',
      to: email,
      subject: 'Your Magic Login Link',
      html: `
        <h1>Magic Login</h1>
        <p>Click the link below to log in to your account without a password. This link will expire in 24 hours.</p>
        <a href="${magicLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Log In</a>
        <p>If you did not request this, you can safely ignore this email.</p>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * Sends a verification email to the user
   * @param email The recipient's email address
   * @param verificationLink The verification link URL
   */
  async sendVerificationEmail(email: string, verificationLink: string): Promise<void> {
    const mailOptions = {
      from: '"E2E Practice App" <no-reply@e2d-practice.com>',
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <h1>Verify Your Email</h1>
        <p>Please click the link below to verify your email address and complete your registration.</p>
        <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>If you did not create an account, please ignore this email.</p>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}

export default new EmailService();
