import { MaterialIcons } from "@expo/vector-icons";
import { localeDisplayNames } from "@repo/i18n";
import { ListGroup, Separator, useThemeColor } from "heroui-native";
import { useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { appConfig } from "@/configs/app-config";
import { changeLanguage, getCurrentLocale, supportedLocales, type Locale } from "@/i18n";
import { useTabBarVisibility } from "@/providers/tab-bar-provider";

interface LanguageItemProps {
  name: string;
  isSelected: boolean;
  isChanging: boolean;
  onPress: () => void;
}

function LanguageItem({ name, isSelected, isChanging, onPress }: LanguageItemProps) {
  const [accentColor] = useThemeColor(["accent"]);

  return (
    <ListGroup.Item onPress={onPress} disabled={isChanging}>
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle
          className={isSelected ? "font-medium text-foreground" : "font-normal text-muted"}
        >
          {name}
        </ListGroup.ItemTitle>
      </ListGroup.ItemContent>
      <ListGroup.ItemSuffix>
        {isChanging ? (
          <ActivityIndicator size="small" color={accentColor} />
        ) : isSelected ? (
          <MaterialIcons name="check" size={18} color={accentColor} />
        ) : (
          <View />
        )}
      </ListGroup.ItemSuffix>
    </ListGroup.Item>
  );
}

export default function LanguageScreen() {
  const currentLocale = getCurrentLocale();
  const [changingLanguage, setChangingLanguage] = useState<string | null>(null);

  useTabBarVisibility(true);

  const languageOptions = supportedLocales.map((locale) => ({
    code: locale,
    name: localeDisplayNames[locale],
  }));

  const handleLanguageChange = async (code: string) => {
    if (currentLocale === code) {
      return;
    }
    setChangingLanguage(code);
    try {
      await changeLanguage(code as Locale);
    } finally {
      setChangingLanguage(null);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: appConfig.safeAreaBottom }}
    >
      <View className="px-6 pt-8">
        <ListGroup>
          {languageOptions.map((language, index) => (
            <View key={language.code}>
              <LanguageItem
                name={language.name}
                isSelected={currentLocale === language.code}
                isChanging={changingLanguage === language.code}
                onPress={() => handleLanguageChange(language.code)}
              />
              {index < languageOptions.length - 1 ? (
                <Separator className="mx-4 bg-separator/30" />
              ) : null}
            </View>
          ))}
        </ListGroup>
      </View>
    </ScrollView>
  );
}
