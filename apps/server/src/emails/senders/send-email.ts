import type { ReactElement } from "react";
import { getEmailProvider } from "..";
import { withLocale } from "../locale";

export async function sendEmail({
  to,
  subject,
  template,
  from,
  text,
}: {
  to: string;
  subject: string;
  template: ReactElement;
  from?: string;
  text?: string;
}) {
  await getEmailProvider().send({
    to,
    subject,
    template,
    from,
    text,
  });
}

export { withLocale };
