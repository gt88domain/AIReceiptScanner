import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/i18n";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function NewsletterForm() {
  const t = useTranslations("landingPage.footer.newsletter");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        body: JSON.stringify({ email }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string; subscribed?: boolean };

      if (!response.ok || !payload.subscribed) {
        setState("error");
        setMessage(response.status === 429 ? t("rateLimited") : t("error"));
        return;
      }

      setState("success");
      setMessage(t("success"));
      setEmail("");
    } catch {
      setState("error");
      setMessage(t("error"));
    }
  }

  return (
    <div className="pt-2">
      <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      <form className="mt-3 flex gap-2" onSubmit={handleSubmit}>
        <Input
          aria-label={t("emailLabel")}
          autoComplete="email"
          disabled={state === "submitting"}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("placeholder")}
          required
          type="email"
          value={email}
        />
        <Button disabled={state === "submitting"} type="submit">
          {state === "submitting" ? t("submitting") : t("submit")}
        </Button>
      </form>
      <p aria-live="polite" className="mt-2 text-xs text-muted-foreground">
        {message || t("privacy")}
      </p>
    </div>
  );
}
