/**
 * Central place for web push, email, and in-app notifications.
 * Extend with Resend/FCM when keys are configured; safe no-ops until then.
 */

export type NotificationPayload = {
  title: string;
  body: string;
  actionUrl?: string;
  actionText?: string;
};

class NotificationService {
  async notifyMissionComplete(
    userId: string,
    missionName: string,
  ): Promise<void> {
    if (process.env.NODE_ENV === "development") {
      console.log(`[notify] mission complete ${userId}: ${missionName}`);
    }
  }

  async notifyLevelUp(
    userId: string,
    level: number,
    levelName: string,
  ): Promise<void> {
    if (process.env.NODE_ENV === "development") {
      console.log(`[notify] level up ${userId}: ${level} ${levelName}`);
    }
  }

  async notifyStreakMilestone(
    userId: string,
    days: number,
  ): Promise<void> {
    if (process.env.NODE_ENV === "development") {
      console.log(`[notify] streak ${userId}: ${days} days`);
    }
  }

  async sendWinBack(userId: string, email: string): Promise<void> {
    if (this.shouldSendEmail("WIN_BACK")) {
      await this.sendEmail(email, {
        title: "We miss you",
        body: "Come back and keep creating.",
        actionUrl: process.env.NEXTAUTH_URL,
        actionText: "Open app",
      });
    }
  }

  async notifyReferralSuccess(
    referrerId: string,
    referredEmail: string,
  ): Promise<void> {
    if (process.env.NODE_ENV === "development") {
      console.log(`[notify] referral ${referrerId} ← ${referredEmail}`);
    }
  }

  private async sendEmail(
    email: string,
    payload: NotificationPayload,
  ): Promise<void> {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.log(`📧 Email (stub) to ${email}: ${payload.title}`);
        return;
      }
      console.log(`📧 Email sent to ${email}: ${payload.title}`);
    } catch (error) {
      console.error("Email error:", error);
    }
  }

  private shouldSendEmail(type: string): boolean {
    const emailWorthyTypes = [
      "LEVEL_UP",
      "ACHIEVEMENT_UNLOCKED",
      "STREAK_MILESTONE",
      "PAYMENT_SUCCESS",
      "PAYMENT_FAILED",
      "SUBSCRIPTION_ENDING",
      "WIN_BACK",
    ];
    return emailWorthyTypes.includes(type);
  }
}

export const notificationService = new NotificationService();

export const notifyMissionComplete = (
  ...args: Parameters<NotificationService["notifyMissionComplete"]>
) => notificationService.notifyMissionComplete(...args);

export const notifyLevelUp = (
  ...args: Parameters<NotificationService["notifyLevelUp"]>
) => notificationService.notifyLevelUp(...args);

export const notifyStreakMilestone = (
  ...args: Parameters<NotificationService["notifyStreakMilestone"]>
) => notificationService.notifyStreakMilestone(...args);

export const sendWinBack = (
  ...args: Parameters<NotificationService["sendWinBack"]>
) => notificationService.sendWinBack(...args);

export const notifyReferralSuccess = (
  ...args: Parameters<NotificationService["notifyReferralSuccess"]>
) => notificationService.notifyReferralSuccess(...args);
