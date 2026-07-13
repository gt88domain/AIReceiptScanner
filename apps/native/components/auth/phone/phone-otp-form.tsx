import { useEffect, useState } from "react";
import { computeOtpRemainingSeconds } from "@repo/shared";
import { useForm } from "@tanstack/react-form";
import { Button, Spinner, useThemeColor } from "heroui-native";
import { useTranslation } from "react-i18next";
import { TextInput, View } from "react-native";
import * as z from "zod";
import { Text } from "@/components/ui/text";
import { appConfig } from "@/configs/app-config";
import { useToast } from "@/hooks/use-toast";
import { authClient } from "@/lib/auth/auth.client";
import { getErrorMessage } from "@/utils/error";

type PhoneOtpFormProps = {
  phoneNumber: string;
  onBack: () => void;
  onVerified: () => void;
};

const smsOtpConfig = appConfig.auth.otp.sms;

export function PhoneOtpForm({ phoneNumber, onBack, onVerified }: PhoneOtpFormProps) {
  const { t } = useTranslation();
  const { toastError, toastSuccess } = useToast();
  const [resendDeadline, setResendDeadline] = useState(
    () => Date.now() + smsOtpConfig.resendCooldownSeconds * 1000,
  );
  const [resendCountdown, setResendCountdown] = useState(() =>
    computeOtpRemainingSeconds(resendDeadline),
  );
  const [accentColor, fieldPlaceholderColor] = useThemeColor(["accent", "field-placeholder"]);

  // Single interval keyed by the deadline — avoids the 60-new-intervals-in-60s churn of the
  // original `[resendCountdown]` dependency. Restarts only when handleResend bumps the deadline.
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
          .length(smsOtpConfig.otpLength, t("auth.validation.invalidVerificationCode")),
      }),
    },
    onSubmit: async ({ value }) => {
      await authClient.phoneNumber.verify(
        {
          phoneNumber,
          code: value.code,
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
    await authClient.phoneNumber.sendOtp(
      {
        phoneNumber,
      },
      {
        onSuccess: () => {
          setResendDeadline(Date.now() + smsOtpConfig.resendCooldownSeconds * 1000);
          toastSuccess(t("auth.phoneCodeSent", { phoneNumber }));
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
              <Text className="mb-2 text-base font-medium text-foreground">
                {t("auth.verificationCode")}
              </Text>
              <View className="h-12 justify-center rounded-lg border border-field-border bg-field px-4">
                <TextInput
                  className="flex-1 text-base leading-tight text-field-foreground"
                  id={field.name}
                  placeholder={t("auth.verificationCodePlaceholder")}
                  placeholderTextColor={fieldPlaceholderColor}
                  keyboardType="number-pad"
                  autoComplete="sms-otp"
                  cursorColor={accentColor}
                  selectionColor={accentColor}
                  textContentType="oneTimeCode"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChangeText={field.handleChange}
                />
              </View>
              <Text className="mt-2 text-sm text-muted">
                {t("auth.phoneOtpSentDescription", { phoneNumber })}
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
          <Text className="text-base font-semibold text-foreground">
            {t("auth.changePhoneNumber")}
          </Text>
        </Button>
        <Button
          variant="outline"
          feedbackVariant="scale-ripple"
          onPress={() => {
            void handleResend();
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
