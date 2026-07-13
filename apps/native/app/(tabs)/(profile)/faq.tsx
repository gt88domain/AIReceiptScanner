import { Accordion } from "heroui-native";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { appConfig } from "@/configs/app-config";
import { useTabBarVisibility } from "@/providers/tab-bar-provider";

export default function FAQScreen() {
  const { t } = useTranslation();
  useTabBarVisibility(true);

  const faqItems = [
    {
      value: "1",
      question: t("faq.questions.upgradePremium"),
      answer: t("faq.questions.upgradePremiumAnswer"),
    },
    {
      value: "2",
      question: t("faq.questions.restorePurchase"),
      answer: t("faq.questions.restorePurchaseAnswer"),
    },
    {
      value: "3",
      question: t("faq.questions.editProfile"),
      answer: t("faq.questions.editProfileAnswer"),
    },
    {
      value: "4",
      question: t("faq.questions.switchLanguageTheme"),
      answer: t("faq.questions.switchLanguageThemeAnswer"),
    },
    {
      value: "5",
      question: t("faq.questions.contactSupport"),
      answer: t("faq.questions.contactSupportAnswer", { email: appConfig.supportEmail }),
    },
  ];

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: appConfig.safeAreaBottom }}
    >
      <View className="px-6 pt-8">
        <Accordion selectionMode="multiple">
          {faqItems.map((item) => (
            <Accordion.Item key={item.value} value={item.value}>
              <Accordion.Trigger>
                <Text className="flex-1 text-base font-medium text-foreground">
                  {item.question}
                </Text>
                <Accordion.Indicator />
              </Accordion.Trigger>
              <Accordion.Content>
                <Text className="text-sm leading-6 text-muted">{item.answer}</Text>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion>
      </View>
    </ScrollView>
  );
}
