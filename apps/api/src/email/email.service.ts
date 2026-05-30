import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { DatabaseService } from '../database/database.service';

const FROM_ADDRESS =
  process.env.EMAIL_FROM || 'Kutty Story <info121.tph@gmail.com>';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
  ) {
    this.resend = new Resend(
      this.config.get<string>('RESEND_API_KEY') || '',
    );
  }

  private async logEmail(
    to: string,
    templateId: string,
    subject: string,
    status: string,
    resendId?: string,
  ) {
    await this.db.emailLog.create({
      data: {
        to,
        templateId,
        subject,
        status,
        resendId,
        payload: { resendId },
      },
    });
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    templateId: string,
  ) {
    try {
      const result = await this.resend.emails.send({
        from: FROM_ADDRESS,
        to,
        subject,
        html,
      });

      await this.logEmail(to, templateId, subject, 'sent', result.data?.id);
      this.logger.log(`Email sent: ${templateId} to ${to}`);
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      await this.logEmail(to, templateId, subject, 'failed');
      this.logger.error(`Email failed: ${templateId} to ${to} - ${message}`);
      throw error;
    }
  }

  async sendWelcome(to: string, name: string) {
    const subject = 'Welcome to Kutty Story!';
    const html = `
      <h1>Welcome, ${name}!</h1>
      <p>Thank you for joining Kutty Story. We're excited to help you create personalised storybooks for your little ones.</p>
      <p>Get started by choosing a story and adding your child's profile.</p>
      <p>With love,<br/>Team Kutty Story</p>
    `;
    return this.sendEmail(to, subject, html, 'welcome');
  }

  async sendEmailVerification(to: string, verificationLink: string) {
    const subject = 'Verify your email - Kutty Story';
    const html = `
      <h1>Verify Your Email</h1>
      <p>Please click the link below to verify your email address:</p>
      <p><a href="${verificationLink}" style="background: #7C3AED; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Verify Email</a></p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p>Team Kutty Story</p>
    `;
    return this.sendEmail(to, subject, html, 'email-verification');
  }

  async sendOrderConfirmation(
    to: string,
    orderNumber: string,
    bookTitle: string,
  ) {
    const subject = `Order Confirmed - ${orderNumber}`;
    const html = `
      <h1>Order Confirmed!</h1>
      <p>Your order <strong>${orderNumber}</strong> for "${bookTitle}" has been confirmed.</p>
      <p>We'll start generating your personalised book soon. You'll receive a preview to approve before we print it.</p>
      <p>Track your order: <a href="https://kuttystory.com/orders/track/${orderNumber}">View Order</a></p>
      <p>Team Kutty Story</p>
    `;
    return this.sendEmail(to, subject, html, 'order-confirmation');
  }

  async sendPreviewReady(to: string, name: string, previewLink: string) {
    const subject = "Your child's story preview is ready!";
    const html = `
      <h1>Preview Ready, ${name}!</h1>
      <p>Great news! The preview of your personalised storybook is ready for you to see.</p>
      <p><a href="${previewLink}" style="background: #7C3AED; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">View Preview</a></p>
      <p>If you love it, approve it and we'll generate the full book!</p>
      <p>Team Kutty Story</p>
    `;
    return this.sendEmail(to, subject, html, 'preview-ready');
  }

  async sendBookReadyForApproval(
    to: string,
    name: string,
    approvalLink: string,
  ) {
    const subject = 'Your storybook is ready for approval!';
    const html = `
      <h1>Almost There, ${name}!</h1>
      <p>Your complete personalised storybook has been generated and is ready for your approval.</p>
      <p><a href="${approvalLink}" style="background: #7C3AED; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Review & Approve</a></p>
      <p>Once you approve, we'll send it to print right away!</p>
      <p>Team Kutty Story</p>
    `;
    return this.sendEmail(to, subject, html, 'book-ready-for-approval');
  }

  async sendApprovalConfirmation(to: string, orderNumber: string) {
    const subject = `Book Approved - ${orderNumber} is going to print!`;
    const html = `
      <h1>Book Approved!</h1>
      <p>You've approved your storybook for order <strong>${orderNumber}</strong>.</p>
      <p>It's now being sent to our printing partner. We'll notify you once it ships!</p>
      <p>Team Kutty Story</p>
    `;
    return this.sendEmail(to, subject, html, 'approval-confirmation');
  }

  async sendShipped(
    to: string,
    orderNumber: string,
    trackingNumber: string,
    courier: string,
  ) {
    const subject = `Your storybook has shipped! - ${orderNumber}`;
    const html = `
      <h1>Your Book is On Its Way!</h1>
      <p>Order <strong>${orderNumber}</strong> has been shipped.</p>
      <p><strong>Courier:</strong> ${courier}<br/>
      <strong>Tracking Number:</strong> ${trackingNumber}</p>
      <p>Track your order: <a href="https://kuttystory.com/orders/track/${orderNumber}">Track Order</a></p>
      <p>Team Kutty Story</p>
    `;
    return this.sendEmail(to, subject, html, 'shipped');
  }

  async sendDelivered(to: string, orderNumber: string) {
    const subject = `Your storybook has been delivered! - ${orderNumber}`;
    const html = `
      <h1>Delivered!</h1>
      <p>Order <strong>${orderNumber}</strong> has been delivered. We hope your little one loves it!</p>
      <p>If you enjoyed the experience, we'd love a review: <a href="https://kuttystory.com/review">Leave a Review</a></p>
      <p>Team Kutty Story</p>
    `;
    return this.sendEmail(to, subject, html, 'delivered');
  }

  async sendPasswordReset(to: string, resetLink: string) {
    const subject = 'Reset your password - Kutty Story';
    const html = `
      <h1>Password Reset</h1>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <p><a href="${resetLink}" style="background: #7C3AED; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Reset Password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      <p>Team Kutty Story</p>
    `;
    return this.sendEmail(to, subject, html, 'password-reset');
  }

  /** True when a Resend API key is configured, so emails can actually send. */
  get isConfigured(): boolean {
    return !!this.config.get<string>('RESEND_API_KEY');
  }

  /** Deliver the finished storybook PDF as an email attachment. */
  async sendBookPdf(
    to: string,
    name: string,
    orderNumber: string,
    pdf: Buffer,
    fileName: string,
  ) {
    const subject = `Your Kutty Story PDF is ready — ${orderNumber}`;
    const html = `
      <h1>Here is your storybook, ${name}!</h1>
      <p>Your personalised PDF for order <strong>${orderNumber}</strong> is attached to this email.</p>
      <p>Print it at home or read it on any device. We hope your little one loves it!</p>
      <p>With love,<br/>Team Kutty Story</p>
    `;
    try {
      const result = await this.resend.emails.send({
        from: FROM_ADDRESS,
        to,
        subject,
        html,
        attachments: [{ filename: fileName, content: pdf }],
      });
      await this.logEmail(to, 'book-pdf', subject, 'sent', result.data?.id);
      this.logger.log(`Book PDF emailed to ${to} for ${orderNumber}`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.logEmail(to, 'book-pdf', subject, 'failed');
      this.logger.error(`Book PDF email failed to ${to}: ${message}`);
      throw error;
    }
  }

  async sendOrderCancelled(to: string, orderNumber: string) {
    const subject = `Order Cancelled - ${orderNumber}`;
    const html = `
      <h1>Order Cancelled</h1>
      <p>Your order <strong>${orderNumber}</strong> has been cancelled.</p>
      <p>If a refund is applicable, it will be processed within 5-7 business days.</p>
      <p>If you have any questions, reach out to us at info121.tph@gmail.com.</p>
      <p>Team Kutty Story</p>
    `;
    return this.sendEmail(to, subject, html, 'order-cancelled');
  }
}
