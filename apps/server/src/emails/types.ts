import type { ReactElement } from "react";

export type EmailRecipient = string | string[];

export type EmailProviderKey = "resend";

export type SendEmailParams = {
  from?: string;
  to: EmailRecipient;
  replyTo?: EmailRecipient;
  subject: string;
  html?: string;
  text?: string;
  template?: ReactElement;
};

export type EmailProvider = {
  key: EmailProviderKey;
  send(params: SendEmailParams): Promise<void>;
};

/** Server-only email capability surface. It never exposes sender or recipient configuration. */
export type EmailService = EmailProvider & {
  subscribeNewsletter(email: string): Promise<void>;
};
