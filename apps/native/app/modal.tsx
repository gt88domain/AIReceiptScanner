import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";

export default function ModalScreen() {
	const { t } = useTranslation();

	return (
		<View className="flex-1 items-center justify-center bg-background">
			<Text className="text-base text-foreground">{t("common.modal")}</Text>
		</View>
	);
}
