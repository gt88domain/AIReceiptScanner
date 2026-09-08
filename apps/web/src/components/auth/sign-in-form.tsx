import { Link } from "@tanstack/react-router";
import { Loader2Icon } from "lucide-react";
import { motion } from "motion/react";
import { FaApple, FaGithub, FaGoogle } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldSeparator } from "@/components/ui/field";
import { webConfig } from "@/configs/web-config";
import { useSocialSignIn } from "@/hooks/use-social-sign-in";
import { useTranslations } from "@/i18n";
import { cn } from "@/lib/utils";
import { EmailSignInForm } from "./email/email-sign-in-form";
import { TermsAgreement } from "./terms-agreement";

type SignInFormProps = React.ComponentProps<"div">;

const hasSocialSignInMethods =
  webConfig.auth.methods.appleEnabled ||
  webConfig.auth.methods.githubEnabled ||
  webConfig.auth.methods.googleEnabled;

export function SignInForm({ className, ...props }: SignInFormProps) {
  const t = useTranslations();
  const { signIn: socialSignIn, loading: socialLoading } = useSocialSignIn();
  const hasEmailSignIn = webConfig.auth.methods.emailPasswordEnabled;

  return (
    <div className={cn("flex w-full max-w-md flex-col gap-4", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="p-6">
          <FieldGroup>
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">{t("signIn.title")}</h1>
              {hasEmailSignIn ? (
                <p className="text-muted-foreground text-sm text-balance">
                  {t("signIn.description")}
                </p>
              ) : null}
            </div>
            {hasEmailSignIn ? (
              <motion.div
                className="mt-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <EmailSignInForm />
              </motion.div>
            ) : null}
            {hasSocialSignInMethods ? (
              <>
                {hasEmailSignIn ? (
                  <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                    {t("auth.orContinueWith")}
                  </FieldSeparator>
                ) : null}
                <Field
                  className={cn(
                    "grid gap-4",
                    webConfig.auth.methods.githubEnabled &&
                      webConfig.auth.methods.googleEnabled &&
                      "grid-cols-2",
                  )}
                >
                  {webConfig.auth.methods.githubEnabled ? (
                    <Button
                      variant="outline"
                      type="button"
                      disabled={socialLoading !== null}
                      onClick={() => socialSignIn("github")}
                    >
                      {socialLoading === "github" && (
                        <Loader2Icon className="size-4 animate-spin" />
                      )}
                      <FaGithub className="mr-2" />
                      {t("auth.loginWithGithub")}
                    </Button>
                  ) : null}
                  {webConfig.auth.methods.googleEnabled ? (
                    <Button
                      variant="outline"
                      type="button"
                      disabled={socialLoading !== null}
                      onClick={() => socialSignIn("google")}
                    >
                      {socialLoading === "google" && (
                        <Loader2Icon className="size-4 animate-spin" />
                      )}
                      <FaGoogle className="mr-2" />
                      {t("auth.loginWithGoogle")}
                    </Button>
                  ) : null}
                  {webConfig.auth.methods.appleEnabled ? (
                    <Button
                      variant="outline"
                      type="button"
                      disabled={socialLoading !== null}
                      onClick={() => socialSignIn("apple")}
                    >
                      {socialLoading === "apple" && <Loader2Icon className="size-4 animate-spin" />}
                      <FaApple className="mr-2" />
                      {t("auth.loginWithApple")}
                    </Button>
                  ) : null}
                </Field>
              </>
            ) : null}
            {hasEmailSignIn && webConfig.auth.publicSignupEnabled ? (
              <FieldDescription className="text-center">
                {t("signIn.noAccount")} <Link to="/auth/sign-up">{t("signIn.signUp")}</Link>
              </FieldDescription>
            ) : null}
          </FieldGroup>
        </CardContent>
      </Card>
      <TermsAgreement />
    </div>
  );
}
