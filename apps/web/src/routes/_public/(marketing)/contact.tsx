import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2Icon, MailIcon } from "lucide-react";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { webConfig } from "@/configs/web-config";
import { getCurrentLocale, getMessages, useTranslations } from "@/i18n";
import { cn } from "@/lib/utils";
import { buildSeoHead } from "@/utils/seo";

export const Route = createFileRoute("/_public/(marketing)/contact")({
  head: () => {
    const locale = getCurrentLocale();
    const messages = getMessages(locale);
    return buildSeoHead({
      locale,
      title: `${messages.contact.title} | ${webConfig.AppName}`,
      description: messages.contact.description,
      canonicalPath: "/contact",
      siteName: webConfig.AppName,
    });
  },
  component: ContactPage,
});

function ContactPage() {
  const t = useTranslations("contact");
  const form = useForm({
    defaultValues: { email: "", message: "", name: "", website: "" },
    onSubmit: async ({ value }) => {
      const response = await fetch("/api/contact", {
        body: JSON.stringify(value),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string; sent?: boolean };
      if (!response.ok || !payload.sent) {
        toast.error(response.status === 429 ? t("rateLimited") : t("error"));
        return;
      }

      form.reset();
      toast.success(t("success"));
    },
    validators: {
      onSubmit: z.object({
        name: z.string().trim().min(2, t("validation.name")).max(100),
        email: z.email(t("validation.email")).max(320),
        message: z.string().trim().min(10, t("validation.message")).max(5_000),
        website: z.string().max(0),
      }),
    },
  });

  return (
    <main className="container mx-auto max-w-5xl px-4 pt-28 pb-16 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <section className="space-y-5 pt-4">
          <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t("title")}</h1>
          <p className="max-w-xl text-lg text-muted-foreground">{t("description")}</p>
          <a
            className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
            href={`mailto:${webConfig.supportEmail}`}
          >
            <MailIcon className="size-4" />
            {webConfig.supportEmail}
          </a>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>{t("formTitle")}</CardTitle>
            <CardDescription>{t("formDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                form.handleSubmit();
              }}
            >
              <FieldGroup>
                <form.Field
                  name="name"
                  children={(field) => {
                    const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={invalid}>
                        <FieldLabel htmlFor={field.name}>{t("name")}</FieldLabel>
                        <Input
                          id={field.name}
                          aria-invalid={invalid}
                          autoComplete="name"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                        />
                        {invalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    );
                  }}
                />
                <form.Field
                  name="email"
                  children={(field) => {
                    const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={invalid}>
                        <FieldLabel htmlFor={field.name}>{t("email")}</FieldLabel>
                        <Input
                          id={field.name}
                          aria-invalid={invalid}
                          autoComplete="email"
                          type="email"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                        />
                        {invalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    );
                  }}
                />
                <form.Field
                  name="message"
                  children={(field) => {
                    const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={invalid}>
                        <FieldLabel htmlFor={field.name}>{t("message")}</FieldLabel>
                        <textarea
                          id={field.name}
                          aria-invalid={invalid}
                          className={cn(
                            "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                            invalid && "border-destructive",
                          )}
                          placeholder={t("messagePlaceholder")}
                          rows={7}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                        />
                        {invalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    );
                  }}
                />
                <form.Field
                  name="website"
                  children={(field) => (
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
                />
                <form.Subscribe>
                  {(state) => (
                    <Button
                      className="w-full"
                      disabled={!state.canSubmit || state.isSubmitting}
                      type="submit"
                    >
                      {state.isSubmitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
                      {state.isSubmitting ? t("submitting") : t("submit")}
                    </Button>
                  )}
                </form.Subscribe>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
