import { useEffect, useState } from "react";
import { buildDefaultEmailUserName, computeOtpRemainingSeconds } from "@repo/shared";
import { useForm } from "@tanstack/react-form";
import { Button, InputOTP, REGEXP_ONLY_DIGITS, Spinner } from "heroui-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import * as z from "zod";
import { Text } from "@/components/ui/text";
import { appConfig } from "@/configs/app-config";
import { useToast } from "@/hooks/use-toast";
import { authClient } from "@/lib/auth/auth.client";
import { getErrorMessage } from "@/utils/error";

type EmailOtpFormProps = {
  email: string;
  onBack: () => void;
  onVerified: () => void;
};

const emailOtpConfig = appConfig.auth.otp.email;
const emailOtpSlotIndexes = Array.from({ length: emailOtpConfig.otpLength }, (_, index) => index);
const emailOtpSplitIndex = Math.ceil(emailOtpConfig.otpLength / 2);
const primaryEmailOtpSlotIndexes = emailOtpSlotIndexes.slice(0, emailOtpSplitIndex);
const secondaryEmailOtpSlotIndexes = emailOtpSlotIndexes.slice(emailOtpSplitIndex);

export function EmailOtpForm({ email, onBack, onVerified }: EmailOtpFormProps) {
  const { t } = useTranslation();
  const { toastError, toastSuccess } = useToast();
  const [resendDeadline, setResendDeadline] = useState(
    () => Date.now() + emailOtpConfig.resendCooldownSeconds * 1000,
  );
  const [resendCountdown, setResendCountdown] = useState(() =>
    computeOtpRemainingSeconds(resendDeadline),
  );

  useEffect(() => {
    setResendCountdown(computeOtpRemainingSeconds(resendDeadline));
    if (resendDeadline <= Date.now()) return;

    const timer = setInterval(() => {
      const remaining = computeOtpRemainingSeconds(resendDeadline);
      setResendCountdown(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendDeadline]);

  const form = useForm({
    defaultValues: {
      code: "",
    },
    validators: {
      onChange: z.object({
        code: z
          .string()
          .length(emailOtpConfig.otpLength, t("auth.validation.invalidVerificationCode")),
      }),
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.emailOtp(
        {
          email,
          name: buildDefaultEmailUserName(email),
          otp: value.code,
        },
        {
          onSuccess: () => {
            toastSuccess(t("auth.signInSuccess"));
            onVerified();
          },
          onError: (error) => {
            toastError(error.error.message || error.error.statusText);
          },
        },
      );
    },
  });

  async function handleResend() {
    await authClient.emailOtp.sendVerificationOtp(
      {
        email,
        type: "sign-in",
      },
      {
        onSuccess: () => {
          setResendDeadline(Date.now() + emailOtpConfig.resendCooldownSeconds * 1000);
          toastSuccess(t("auth.emailCodeSent", { email }));
        },
        onError: (error) => {
          toastError(error.error.message || error.error.statusText);
        },
      },
    );
  }

  return (
    <View className="gap-4">
      <form.Field
        name="code"
        children={(field) => {
          const errorMessage = getErrorMessage(field.state.meta.errors);
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid && Boolean(errorMessage);

          return (
            <View>
              <InputOTP
                value={field.state.value}
                onChange={field.handleChange}
                maxLength={emailOtpConfig.otpLength}
                pattern={REGEXP_ONLY_DIGITS}
                inputMode="numeric"
                isInvalid={isInvalid}
                textInputProps={{
                  autoComplete: "one-time-code",
                  textContentType: "oneTimeCode",
                }}
              >
                <InputOTP.Group>
                  {primaryEmailOtpSlotIndexes.map((index) => (
                    <InputOTP.Slot key={index} index={index} />
                  ))}
                </InputOTP.Group>
                {secondaryEmailOtpSlotIndexes.length > 0 ? (
                  <>
                    <InputOTP.Separator />
                    <InputOTP.Group>
                      {secondaryEmailOtpSlotIndexes.map((index) => (
                        <InputOTP.Slot key={index} index={index} />
                      ))}
                    </InputOTP.Group>
                  </>
                ) : null}
              </InputOTP>
              <Text className="mt-2 text-sm text-muted">
                {t("auth.emailOtpSentDescription", { email })}
              </Text>
              <View className="mt-1 min-h-4">
                <Text className={`text-xs ${isInvalid ? "text-danger" : "text-transparent"}`}>
                  {isInvalid ? errorMessage : " "}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <form.Subscribe>
        {(state) => (
          <Button
            variant="primary"
            feedbackVariant="scale-ripple"
            onPress={() => form.handleSubmit()}
            isDisabled={!state.canSubmit || state.isSubmitting}
            className={`h-12 items-center justify-center rounded-md ${
              !state.canSubmit || state.isSubmitting ? "opacity-60" : ""
            }`}
          >
            {state.isSubmitting ? (
              <View className="flex-row items-center">
                <Spinner size="sm" className="mr-2 text-accent-foreground" />
                <Text className="text-base font-semibold text-accent-foreground">
                  {t("auth.verifyingCode")}
                </Text>
              </View>
            ) : (
              <Text className="text-base font-semibold text-accent-foreground">
                {t("auth.verifyCode")}
              </Text>
            )}
          </Button>
        )}
      </form.Subscribe>

      <View className="flex-row gap-3">
        <Button
          variant="outline"
          feedbackVariant="scale-ripple"
          onPress={onBack}
          className="h-12 flex-1 items-center justify-center rounded-md"
        >
          <Text className="text-base font-semibold text-foreground">{t("auth.changeEmail")}</Text>
        </Button>
        <Button
          variant="outline"
          feedbackVariant="scale-ripple"
          onPress={() => {
            handleResend();
          }}
          isDisabled={resendCountdown > 0}
          className={`h-12 flex-1 items-center justify-center rounded-md ${
            resendCountdown > 0 ? "opacity-60" : ""
          }`}
        >
          <Text className="text-base font-semibold text-foreground">
            {resendCountdown > 0
              ? t("auth.resendCodeIn", { seconds: resendCountdown })
              : t("auth.resendCode")}
          </Text>
        </Button>
      </View>
    </View>
  );
}
