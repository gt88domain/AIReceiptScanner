import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ListGroup, Separator, Skeleton, useThemeColor } from "heroui-native";
import { Coins, type LucideIcon } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Alert, Linking, ScrollView, Share, View } from "react-native";
import { Text } from "@/components/ui/text";
import { appConfig } from "@/configs/app-config";
import { useGlobalDialog } from "@/hooks/use-global-dialog";
import { useToast } from "@/hooks/use-toast";
import { authClient } from "@/lib/auth/auth.client";
import { useAuth } from "@/providers/auth-provider";
import { orpc } from "@/lib/orpc";
import { getVisibleUserContact } from "@repo/shared";
import {
  useThemePreference,
  type ThemeFamily,
  type ThemeModePreference,
} from "@/providers/theme-provider";

interface SettingsItemProps {
  description?: string;
  icon: keyof typeof MaterialIcons.glyphMap | LucideIcon;
  onPress?: () => void;
  title: string;
  variant?: "default" | "danger";
}

function SettingsItem({
  description,
  icon,
  onPress,
  title,
  variant = "default",
}: SettingsItemProps) {
  const [mutedColor, dangerColor] = useThemeColor(["muted", "danger"]);
  const iconColor = variant === "danger" ? dangerColor : mutedColor;
  const Icon = icon;

  return (
    <ListGroup.Item onPress={onPress}>
      <ListGroup.ItemPrefix>
        {typeof Icon === "string" ? (
          <MaterialIcons name={Icon} size={20} color={iconColor} />
        ) : (
          <Icon size={20} color={iconColor} />
        )}
      </ListGroup.ItemPrefix>
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle className={variant === "danger" ? "text-danger" : undefined}>
          {title}
        </ListGroup.ItemTitle>
        {description ? <ListGroup.ItemDescription>{description}</ListGroup.ItemDescription> : null}
      </ListGroup.ItemContent>
      <ListGroup.ItemSuffix />
    </ListGroup.Item>
  );
}

interface SettingsSectionProps {
  children: React.ReactNode;
  title: string;
}

function SettingsSection({ children, title }: SettingsSectionProps) {
  return (
    <View className="mb-8">
      <Text className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted">
        {title}
      </Text>
      <ListGroup>{children}</ListGroup>
    </View>
  );
}

function ProfileHeaderSkeleton() {
  return (
    <ListGroup.Item>
      <ListGroup.ItemPrefix>
        <Skeleton className="size-15 rounded-full" />
      </ListGroup.ItemPrefix>
      <ListGroup.ItemContent>
        <Skeleton className="mb-2 h-5 w-24 rounded-md" />
        <Skeleton className="h-4 w-40 rounded-md" />
      </ListGroup.ItemContent>
    </ListGroup.Item>
  );
}

function ProfileHeaderUser({
  user,
  visibleIdentity,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  visibleIdentity: string | null;
}) {
  const router = useRouter();
  const [mutedColor] = useThemeColor(["muted"]);

  return (
    <ListGroup.Item onPress={() => router.push("/(tabs)/(profile)/edit-profile")}>
      <ListGroup.ItemPrefix>
        <View className="size-15 items-center justify-center overflow-hidden rounded-full bg-surface-secondary">
          {user.image ? (
            <Image
              source={{ uri: user.image }}
              style={{ width: 60, height: 60 }}
              contentFit="cover"
            />
          ) : (
            <MaterialIcons name="person" size={30} color={mutedColor} />
          )}
        </View>
      </ListGroup.ItemPrefix>
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle className="text-lg">{user.name}</ListGroup.ItemTitle>
        {visibleIdentity ? (
          <ListGroup.ItemDescription>{visibleIdentity}</ListGroup.ItemDescription>
        ) : null}
      </ListGroup.ItemContent>
      <ListGroup.ItemSuffix />
    </ListGroup.Item>
  );
}

function ProfileHeaderSignIn({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();

  return (
    <ListGroup.Item onPress={onPress}>
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle className="text-lg">{t("auth.signIn")}</ListGroup.ItemTitle>
      </ListGroup.ItemContent>
      <ListGroup.ItemSuffix />
    </ListGroup.Item>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isPending } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const { openDialog } = useGlobalDialog();
  const { themeFamily, themeModePreference } = useThemePreference();
  const router = useRouter();
  const visibleIdentity = user ? getVisibleUserContact(user) : null;

  const themeModeLabels: Record<ThemeModePreference, string> = {
    system: t("settings.themeOptions.system"),
    light: t("settings.themeOptions.light"),
    dark: t("settings.themeOptions.dark"),
  };
  const themeFamilyLabels: Record<ThemeFamily, string> = {
    alpha: t("settings.themeFamilyOptions.alpha"),
    lavender: t("settings.themeFamilyOptions.lavender"),
    mint: t("settings.themeFamilyOptions.mint"),
    sky: t("settings.themeFamilyOptions.sky"),
  };

  function handleSignIn() {
    router.push("/(auth)/sign-in");
  }

  function handlePremium() {
    if (!isAuthenticated) {
      handleSignIn();
    } else {
      router.push("/(tabs)/(profile)/premium");
    }
  }

  /** Opens the account-bound credits screen or asks anonymous users to sign in first. */
  function handleCredits() {
    if (!isAuthenticated) {
      handleSignIn();
    } else {
      router.push("./credits");
    }
  }

  function handleSecurity() {
    if (!isAuthenticated) {
      handleSignIn();
    } else {
      router.push("/(tabs)/(profile)/security");
    }
  }

  function handleSignOut() {
    openDialog({
      title: t("auth.signOutConfirm"),
      description: t("auth.signOutConfirmDescription"),
      confirmText: t("auth.signOut"),
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          await authClient.signOut();
          toastSuccess(t("auth.signOutSuccess"));
        } catch {
          toastError(t("auth.signOutError"));
        }
      },
    });
  }

  function handleDeleteAccount() {
    openDialog({
      title: t("auth.deleteAccountConfirm"),
      description: t("auth.deleteAccountConfirmDescription"),
      confirmText: t("settings.deleteAccount"),
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          await orpc.users.deleteAccount.call({});
          await authClient.signOut();
          toastSuccess(t("auth.deleteAccountSuccess"));
        } catch {
          toastError(t("auth.deleteAccountError"));
        }
      },
    });
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: appConfig.safeAreaBottom }}
    >
      <View className="px-6 pt-8">
        <ListGroup className="mb-8">
          {isPending ? (
            <ProfileHeaderSkeleton />
          ) : user && isAuthenticated ? (
            <ProfileHeaderUser user={user} visibleIdentity={visibleIdentity} />
          ) : (
            <ProfileHeaderSignIn onPress={handleSignIn} />
          )}
        </ListGroup>

        <SettingsSection title={t("settings.account")}>
          <SettingsItem
            icon="stars"
            title={t("settings.unlockPremium")}
            description={t("settings.unlockPremiumDescription")}
            onPress={handlePremium}
          />
          <Separator className="mx-4 bg-separator/30" />
          {appConfig.creditsEnabled ? (
            <>
              <SettingsItem
                icon={Coins}
                title={t("credits.title")}
                description={t("credits.settingsDescription")}
                onPress={handleCredits}
              />
              <Separator className="mx-4 bg-separator/30" />
            </>
          ) : null}
          <SettingsItem icon="security" title={t("settings.security")} onPress={handleSecurity} />
        </SettingsSection>

        <SettingsSection title={t("settings.preferences")}>
          <Separator className="mx-4 bg-separator/30" />
          <SettingsItem
            icon="language"
            title={t("settings.language")}
            onPress={() => {
              router.push("/(tabs)/(profile)/language");
            }}
          />
          <Separator className="mx-4 bg-separator/30" />
          <SettingsItem
            icon="palette"
            title={t("settings.theme")}
            description={t("settings.themeSummary", {
              family: themeFamilyLabels[themeFamily],
              mode: themeModeLabels[themeModePreference],
            })}
            onPress={() => {
              router.push("./theme");
            }}
          />
        </SettingsSection>

        <SettingsSection title={t("settings.support")}>
          <SettingsItem
            icon="info-outline"
            title={t("settings.about")}
            onPress={() => {
              router.push("/(tabs)/(profile)/about");
            }}
          />
          <Separator className="mx-4 bg-separator/30" />
          <SettingsItem
            icon="help-outline"
            title={t("settings.faq")}
            onPress={() => {
              router.push("/(tabs)/(profile)/faq");
            }}
          />
          <Separator className="mx-4 bg-separator/30" />
          <SettingsItem
            icon="privacy-tip"
            title={t("settings.privacyAndTerms")}
            onPress={() => {
              router.push("/(tabs)/(profile)/privacy");
            }}
          />
        </SettingsSection>

        <SettingsSection title={t("settings.share")}>
          <SettingsItem
            icon="share"
            title={t("settings.shareApp")}
            onPress={() => {
              Share.share({
                message: t("settings.shareAppMessage", {
                  url: appConfig.appStoreUrl,
                }),
              });
            }}
          />
          <Separator className="mx-4 bg-separator/30" />
          <SettingsItem
            icon="star-outline"
            title={t("settings.rateUs")}
            onPress={() => {
              Linking.openURL(appConfig.appStoreUrl);
            }}
          />
        </SettingsSection>

        {isAuthenticated ? (
          <ListGroup>
            <SettingsItem
              icon="logout"
              title={t("auth.signOut")}
              onPress={handleSignOut}
              variant="danger"
            />
            <Separator className="mx-4 bg-separator/30" />
            <SettingsItem
              icon="delete-forever"
              title={t("settings.deleteAccount")}
              onPress={handleDeleteAccount}
              variant="danger"
            />
          </ListGroup>
        ) : null}

        {__DEV__ ? (
          <View className="mt-8">
            <Text className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted">
              DEV TOOLS
            </Text>
            <ListGroup>
              <SettingsItem
                icon="replay"
                title="Reset Onboarding"
                onPress={async () => {
                  await AsyncStorage.removeItem(appConfig.onboardingCompletedStorageKey);
                  Alert.alert("Done", "Restart the app to see the onboarding screen.");
                }}
              />
            </ListGroup>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
