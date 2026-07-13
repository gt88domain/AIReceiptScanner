import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInScreen() {
	const router = useRouter();
	const { t } = useTranslation();

	return (
		<>
			<Stack.Screen
				options={{
					headerShown: true,
					headerTransparent: true,
					headerTitle: "",
					headerShadowVisible: false,
				}}
			/>
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Button
					accessibilityLabel={t("common.close")}
					icon="xmark"
					separateBackground
					onPress={() => router.dismiss()}
				/>
			</Stack.Toolbar>
			<SignInForm />
		</>
	);
}
