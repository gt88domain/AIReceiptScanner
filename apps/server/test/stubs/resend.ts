export class Resend {
  static contactEmails: string[] = [];

  static reset() {
    Resend.contactEmails = [];
  }

  readonly contacts = {
    create: async ({ email }: { email: string }) => {
      Resend.contactEmails.push(email);
      return { data: { id: `contact-${Resend.contactEmails.length}`, object: "contact" as const }, error: null, headers: null };
    },
    get: async ({ email }: { email: string }) => {
      const exists = Resend.contactEmails.includes(email);
      return exists
        ? {
            data: {
              id: `contact-${Resend.contactEmails.indexOf(email) + 1}`,
              email,
              first_name: null,
              last_name: null,
              unsubscribed: false,
              created_at: "2026-07-16T00:00:00.000Z",
            },
            error: null,
            headers: null,
          }
        : { data: null, error: { name: "not_found", statusCode: 404, message: "not found" }, headers: null };
    },
    update: async ({ email }: { email: string }) => ({
      data: { id: `contact-${Resend.contactEmails.indexOf(email) + 1}`, object: "contact" as const },
      error: null,
      headers: null,
    }),
  };

  readonly emails = {
    send: async () => ({ error: null }),
  };
}
