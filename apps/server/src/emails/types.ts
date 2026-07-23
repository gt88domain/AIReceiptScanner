import type { ReactElement } from "react";

export type EmailRecipient = string | string[];

export type EmailProviderKey = "resend";

export type SendEmailParams = {
  from?: string;
  to: EmailRecipient;
  subject: string;
  html?: string;
  text?: string;
  template?: ReactElement;
};

export type EmailProvider = {
  key: EmailProviderKey;
  send(params: SendEmailParams): Promise<void>;
};
