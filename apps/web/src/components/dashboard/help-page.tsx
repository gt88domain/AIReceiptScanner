import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon, MailIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Turnstile, turnstileEnabled } from "@/components/security/turnstile";
import { webConfig } from "@/configs/web-config";
import { useOrpc } from "@/hooks/use-orpc";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/lib/auth/auth-server";

export function HelpPage({ user }: { user: CurrentUser }) {
  const orpc = useOrpc();
  const availability = useQuery(orpc.users.getContactAvailability.queryOptions());
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetNonce, setTurnstileResetNonce] = useState(0);
  const canSend = availability.data?.available === true && Boolean(user.email);
  const form = useForm({
    defaultValues: { message: "", subject: "", website: "" },
    onSubmit: async ({ value }) => {
      if (turnstileEnabled && !turnstileToken) {
        toast.error("Complete the verification before sending your message.");
        return;
      }
      const response = await fetch("/api/contact", {
        body: JSON.stringify({
          name: user.name ?? "Account user",
          email: user.email,
          message: `Subject: ${value.subject}\n\n${value.message}`,
          website: value.website,
          turnstileToken,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { sent?: boolean } | null;
      if (!response.ok || !payload?.sent) {
        setTurnstileToken("");
        setTurnstileResetNonce((nonce) => nonce + 1);
        toast.error(
          response.status === 404 || response.status === 503
            ? "Contact is unavailable here. Please use the email link below."
            : "Your message could not be sent.",
        );
        return;
      }
      form.reset();
      setTurnstileToken("");
      setTurnstileResetNonce((nonce) => nonce + 1);
      toast.success("Your message has been sent.");
    },
    validators: {
      onSubmit: z.object({
        subject: z.string().trim().min(2, "Enter a subject.").max(160),
        message: z.string().trim().min(10, "Enter at least 10 characters.").max(5_000),
        website: z.string().max(0),
      }),
    },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Help</h1>
        <p className="mt-2 text-muted-foreground">
          Send a short message to the account administrator.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Contact support</CardTitle>
          <CardDescription>We will reply to your account email when possible.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <a
            className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
            href={`mailto:${webConfig.supportEmail}`}
          >
            <MailIcon className="size-4" />
            {webConfig.supportEmail}
          </a>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (canSend) form.handleSubmit();
            }}
          >
            <fieldset disabled={!canSend}>
              <FieldGroup className={!canSend ? "opacity-50" : undefined}>
                <form.Field name="subject">
                  {(field) => <TextField field={field} label="Subject" />}
                </form.Field>
                <form.Field name="message">
                  {(field) => <TextAreaField field={field} label="Message" />}
                </form.Field>
                <form.Field name="website">
                  {(field) => (
                    <input
                      aria-hidden="true"
                      autoComplete="off"
                      className="hidden"
                      name="website"
                      tabIndex={-1}
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  )}
                </form.Field>
                <Turnstile
                  action="contact"
                  onError={() => setTurnstileToken("")}
                  onToken={setTurnstileToken}
                  resetNonce={turnstileResetNonce}
                />
                <form.Subscribe>
                  {(state) => (
                    <Button
                      disabled={
                        !canSend ||
                        !state.canSubmit ||
                        state.isSubmitting ||
                        (turnstileEnabled && !turnstileToken)
                      }
                      type="submit"
                    >
                      {state.isSubmitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
                      {state.isSubmitting ? "Sending…" : "Send message"}
                    </Button>
                  )}
                </form.Subscribe>
              </FieldGroup>
            </fieldset>
          </form>
          {!canSend ? (
            <p className="text-muted-foreground text-sm">
              {availability.isPending
                ? "Checking contact availability. Use the email link above if you need help now."
                : "Use the email link above to contact support."}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function TextField({ field, label }: { field: any; label: string }) {
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        aria-invalid={invalid}
        id={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
      />
      {invalid ? <FieldError errors={field.state.meta.errors} /> : null}
    </Field>
  );
}

function TextAreaField({ field, label }: { field: any; label: string }) {
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <textarea
        aria-invalid={invalid}
        className={cn(
          "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-28 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          invalid && "border-destructive",
        )}
        id={field.name}
        rows={7}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
      />
      {invalid ? <FieldError errors={field.state.meta.errors} /> : null}
    </Field>
  );
}
