import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Button, Spinner, useThemeColor } from "heroui-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView, KeyboardToolbar } from "react-native-keyboard-controller";
import { Pressable, TextInput, View } from "react-native";
import * as React from "react";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as z from "zod";
import { Text } from "@/components/ui/text";
import { appConfig } from "@/configs/app-config";
import { useAuth } from "@/providers/auth-provider";
import { useTabBarVisibility } from "@/hooks/use-tab-bar";
import { useToast } from "@/hooks/use-toast";
import { orpc } from "@/lib/orpc";
import { uploadNativeStorageFile } from "@/lib/storage/upload";
import { NativeImagePicker } from "@/lib/image-picker/image-picker";
import { getVisibleUserEmail } from "@repo/shared";
import { getErrorMessage } from "@/utils/error";

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, refetchSession } = useAuth();
  const { toastError, toastSuccess } = useToast();
  const { t } = useTranslation();
  const [accentColor, accentForegroundColor, fieldPlaceholderColor, mutedColor] = useThemeColor([
    "accent",
    "accent-foreground",
    "field-placeholder",
    "muted",
  ]);

  const [avatarUri, setAvatarUri] = React.useState(user?.image ?? null);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const visibleEmail = user ? getVisibleUserEmail(user) : null;
  const isStorageEnabled = appConfig.storageEnabled;

  useTabBarVisibility(true);

  const updateProfile = useMutation({
    ...orpc.users.update.mutationOptions(),
  });

  React.useEffect(() => {
    setAvatarUri(user?.image ?? null);
  }, [user?.image]);

  async function handleAvatarPress() {
    if (!user || !isStorageEnabled) {
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = await NativeImagePicker.pickImagesFromLibrary({
      selectionLimit: 1,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.status === "permission-denied") {
      toastError(t("profile.avatarPermissionDenied"));
      return;
    }

    if (result.status !== "success") {
      return;
    }

    const previousAvatarUri = avatarUri;
    const asset = result.assets[0];

    setIsUploadingAvatar(true);

    try {
      const file = NativeImagePicker.createUploadFileFromAsset(asset);
      const { url } = await uploadNativeStorageFile(file, "avatar");
      await updateProfile.mutateAsync({ image: url });
      await refetchSession();
      setAvatarUri(url);
      toastSuccess(t("profile.avatarUpdated"));
    } catch (error) {
      setAvatarUri(previousAvatarUri ?? null);
      toastError(error instanceof Error ? error.message : t("profile.avatarUploadError"));
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  const form = useForm({
    defaultValues: {
      name: user?.name || "",
    },
    validators: {
      onChange: z.object({
        name: z.string().min(1, t("profile.validation.nameRequired")),
      }),
    },
    onSubmit: async ({ value }) => {
      try {
        await updateProfile.mutateAsync({
          name: value.name,
        });
        await refetchSession();
        toastSuccess(t("profile.profileUpdated"));
      } catch (error) {
        toastError(error instanceof Error ? error.message : t("common.error"));
      }
    },
  });

  React.useEffect(() => {
    form.reset({ name: user?.name || "" });
  }, [form, user?.name]);

  return (
    <>
      <KeyboardAwareScrollView
        className="flex-1 bg-background"
        bottomOffset={appConfig.safeAreaBottom}
      >
        <Animated.View className="items-center py-8" entering={FadeInUp.delay(100)}>
          <View className="relative">
            <View className="h-20 w-20 overflow-hidden rounded-full border border-border bg-surface-secondary">
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={{ width: 80, height: 80 }}
                  contentFit="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <MaterialIcons name="person" size={40} color={mutedColor} />
                </View>
              )}
            </View>

            {isStorageEnabled ? (
              <Pressable
                className="absolute -bottom-1 -right-1 size-7 items-center justify-center rounded-full border-2 border-background bg-accent shadow-sm"
                disabled={isUploadingAvatar || updateProfile.isPending}
                onPress={handleAvatarPress}
              >
                {isUploadingAvatar ? (
                  <Spinner size="sm" className="text-accent-foreground" />
                ) : (
                  <MaterialIcons name="edit" size={12} color={accentForegroundColor} />
                )}
              </Pressable>
            ) : null}
          </View>
          {isStorageEnabled ? (
            <Text className="mt-4 text-sm text-muted">{t("profile.changeAvatar")}</Text>
          ) : null}
        </Animated.View>

        <Animated.View className="px-6 pb-6" entering={FadeInDown.delay(200)}>
          <form.Field
            name="name"
            children={(field) => {
              const errorMessage = getErrorMessage(field.state.meta.errors);
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid && Boolean(errorMessage);

              return (
                <View className="mb-6">
                  <Text className="mb-2 ml-1 text-sm font-medium text-foreground">
                    {t("profile.fullName")}
                  </Text>
                  <View className="h-12 justify-center rounded-lg border border-field-border bg-field px-4">
                    <TextInput
                      className="flex-1 text-field-foreground"
                      placeholder={t("profile.fullNamePlaceholder")}
                      placeholderTextColor={fieldPlaceholderColor}
                      autoCapitalize="words"
                      cursorColor={accentColor}
                      selectionColor={accentColor}
                      textContentType="name"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChangeText={field.handleChange}
                    />
                  </View>
                  {isInvalid ? (
                    <Text className="mt-1 text-xs text-danger">{errorMessage}</Text>
                  ) : null}
                </View>
              );
            }}
          />

          {user ? (
            <View className="mb-6">
              <Text className="mb-2 ml-1 text-sm font-medium text-foreground">
                {t("profile.email")}
              </Text>
              <View className="h-12 justify-center rounded-lg border border-border bg-surface-secondary px-4">
                <Text className="text-base text-muted">
                  {visibleEmail ?? t("profile.notLinked")}
                </Text>
              </View>
            </View>
          ) : null}
        </Animated.View>

        <View className="px-6 pb-6" style={{ paddingBottom: insets.bottom + 24 }}>
          <form.Subscribe>
            {(state) => (
              <Button
                variant="primary"
                feedbackVariant="scale-ripple"
                onPress={() => form.handleSubmit()}
                isDisabled={
                  !state.canSubmit ||
                  state.isSubmitting ||
                  updateProfile.isPending ||
                  isUploadingAvatar
                }
                className={`h-12 items-center justify-center rounded-md ${
                  !state.canSubmit ||
                  state.isSubmitting ||
                  updateProfile.isPending ||
                  isUploadingAvatar
                    ? "opacity-60"
                    : ""
                }`}
              >
                {state.isSubmitting || updateProfile.isPending || isUploadingAvatar ? (
                  <View className="flex-row items-center">
                    <Spinner size="sm" className="mr-2 text-accent-foreground" />
                    <Text className="text-base font-semibold text-accent-foreground">
                      {isUploadingAvatar ? t("profile.avatarUploading") : t("profile.saving")}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-base font-semibold text-accent-foreground">
                    {t("profile.saveChanges")}
                  </Text>
                )}
              </Button>
            )}
          </form.Subscribe>
        </View>
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </>
  );
}
