export class Resend {
  static contactsByEmail = new Map<string, { unsubscribed: boolean }>();
  static updates = 0;

  static reset() {
    Resend.contactsByEmail.clear();
    Resend.updates = 0;
  }

  static setContact(email: string, unsubscribed: boolean) {
    Resend.contactsByEmail.set(email, { unsubscribed });
  }

  static getContact(email: string) {
    return Resend.contactsByEmail.get(email);
  }

  readonly contacts = {
    create: async ({ email, unsubscribed }: { email: string; unsubscribed: boolean }) => {
      Resend.contactsByEmail.set(email, { unsubscribed });
      return {
        data: { id: `contact-${Resend.contactsByEmail.size}`, object: "contact" as const },
        error: null,
        headers: null,
      };
    },
    get: async ({ email }: { email: string }) => {
      const contact = Resend.contactsByEmail.get(email);
      return contact
        ? {
            data: {
              id: `contact-${[...Resend.contactsByEmail.keys()].indexOf(email) + 1}`,
              email,
              first_name: null,
              last_name: null,
              unsubscribed: contact.unsubscribed,
              created_at: "2026-07-16T00:00:00.000Z",
            },
            error: null,
            headers: null,
          }
        : {
            data: null,
            error: { name: "not_found", statusCode: 404, message: "not found" },
            headers: null,
          };
    },
    update: async ({ email, unsubscribed }: { email: string; unsubscribed: boolean }) => {
      Resend.updates += 1;
      Resend.contactsByEmail.set(email, { unsubscribed });
      return {
        data: {
          id: `contact-${[...Resend.contactsByEmail.keys()].indexOf(email) + 1}`,
          object: "contact" as const,
        },
        error: null,
        headers: null,
      };
    },
  };

  readonly emails = {
    send: async () => ({ error: null }),
  };
}
