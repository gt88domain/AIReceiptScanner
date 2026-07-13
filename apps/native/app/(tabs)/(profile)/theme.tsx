import { MaterialIcons } from "@expo/vector-icons";
import { ListGroup, Separator, useThemeColor } from "heroui-native";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { appConfig } from "@/configs/app-config";
import { useTabBarVisibility } from "@/hooks/use-tab-bar";
import {
  type ThemeFamily,
  type ThemeModePreference,
  useThemePreference,
} from "@/providers/theme-provider";

interface ThemeOptionItemProps {
  description: string;
  isSelected: boolean;
  onPress: () => void;
  title: string;
}

interface ThemeSectionProps {
  children: React.ReactNode;
  title: string;
}

function ThemeOptionItem({
  description,
  isSelected,
  onPress,
  title,
}: ThemeOptionItemProps) {
  const [accentColor] = useThemeColor(["accent"]);

  return (
    <ListGroup.Item onPress={onPress}>
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle className="text-foreground">{title}</ListGroup.ItemTitle>
        <ListGroup.ItemDescription>{description}</ListGroup.ItemDescription>
      </ListGroup.ItemContent>
      <ListGroup.ItemSuffix>
        {isSelected ? (
          <MaterialIcons name="check" size={18} color={accentColor} />
        ) : (
          <View />
        )}
      </ListGroup.ItemSuffix>
    </ListGroup.Item>
  );
}

function ThemeSection({ children, title }: ThemeSectionProps) {
  return (
    <View className="mb-8">
      <Text className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted">
        {title}
      </Text>
      <ListGroup>{children}</ListGroup>
    </View>
  );
}

export default function ThemeScreen() {
  const { t } = useTranslation();
  const { setThemeFamily, setThemeModePreference, themeFamily, themeModePreference } =
    useThemePreference();

  useTabBarVisibility(true);

  const themeModeOptions: Array<{
    description: string;
    key: ThemeModePreference;
    title: string;
  }> = [
    {
      key: "system",
      title: t("settings.themeOptions.system"),
      description: t("settings.themeOptionDescriptions.system"),
    },
    {
      key: "light",
      title: t("settings.themeOptions.light"),
      description: t("settings.themeOptionDescriptions.light"),
    },
    {
      key: "dark",
      title: t("settings.themeOptions.dark"),
      description: t("settings.themeOptionDescriptions.dark"),
    },
  ];

  const themeFamilyOptions: Array<{
    description: string;
    key: ThemeFamily;
    title: string;
  }> = [
    {
      key: "alpha",
      title: t("settings.themeFamilyOptions.alpha"),
      description: t("settings.themeFamilyDescriptions.alpha"),
    },
    {
      key: "lavender",
      title: t("settings.themeFamilyOptions.lavender"),
      description: t("settings.themeFamilyDescriptions.lavender"),
    },
    {
      key: "mint",
      title: t("settings.themeFamilyOptions.mint"),
      description: t("settings.themeFamilyDescriptions.mint"),
    },
    {
      key: "sky",
      title: t("settings.themeFamilyOptions.sky"),
      description: t("settings.themeFamilyDescriptions.sky"),
    },
  ];

  async function handleThemeModeChange(nextThemeModePreference: ThemeModePreference) {
    if (nextThemeModePreference === themeModePreference) {
      return;
    }

    await setThemeModePreference(nextThemeModePreference);
  }

  async function handleThemeFamilyChange(nextThemeFamily: ThemeFamily) {
    if (nextThemeFamily === themeFamily) {
      return;
    }

    await setThemeFamily(nextThemeFamily);
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: appConfig.safeAreaBottom }}
    >
      <View className="px-6 pt-8">
        <ThemeSection title={t("settings.themeAppearance")}>
          {themeModeOptions.map((themeOption, index) => (
            <View key={themeOption.key}>
              <ThemeOptionItem
                title={themeOption.title}
                description={themeOption.description}
                isSelected={themeModePreference === themeOption.key}
                onPress={() => {
                  handleThemeModeChange(themeOption.key);
                }}
              />
              {index < themeModeOptions.length - 1 ? (
                <Separator className="mx-4 bg-separator/30" />
              ) : null}
            </View>
          ))}
        </ThemeSection>

        <ThemeSection title={t("settings.themeFamily")}>
          {themeFamilyOptions.map((themeOption, index) => (
            <View key={themeOption.key}>
              <ThemeOptionItem
                title={themeOption.title}
                description={themeOption.description}
                isSelected={themeFamily === themeOption.key}
                onPress={() => {
                  handleThemeFamilyChange(themeOption.key);
                }}
              />
              {index < themeFamilyOptions.length - 1 ? (
                <Separator className="mx-4 bg-separator/30" />
              ) : null}
            </View>
          ))}
        </ThemeSection>
      </View>
    </ScrollView>
  );
}
