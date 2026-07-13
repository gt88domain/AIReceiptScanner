import { useForm } from "@tanstack/react-form";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Button, Spinner, useThemeColor } from "heroui-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView, KeyboardToolbar } from "react-native-keyboard-controller";
import { Pressable, TextInput, View } from "react-native";
import * as React from "react";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as z from "zod";
import { Text } from "@/components/ui/text";
import { appConfig, getAuthConfig } from "@/configs/app-config";
import { useToast } from "@/hooks/use-toast";
import { authClient } from "@/lib/auth/auth.client";
import { getErrorMessage } from "@/utils/error";

const authConfig = getAuthConfig();

export function SignUpForm() {
	const router = useRouter();
	const { toastError, toastSuccess } = useToast();
	const { top } = useSafeAreaInsets();
	const { t } = useTranslation();
	const [showPassword, setShowPassword] = React.useState(false);
	const [accentColor, fieldPlaceholderColor, mutedColor] = useThemeColor([
		"accent",
		"field-placeholder",
		"muted",
	]);

	const form = useForm({
		defaultValues: {
			name: "",
			email: "",
			password: "",
		},
		validators: {
			onChange: z.object({
				name: z.string().min(1, t("auth.validation.nameRequired")),
				email: z.email(t("auth.validation.invalidEmail")),
				password: z.string().min(8, t("auth.validation.passwordMinLength", { min: 8 })),
			}),
		},
		onSubmit: async ({ value }) => {
			await authClient.signUp.email(
				{
					email: value.email,
					password: value.password,
					name: value.name,
					callbackURL: authConfig.callbackURL,
				},
				{
					onRequest: () => {},
					onResponse: () => {},
					onSuccess: () => {
						toastSuccess(t("auth.checkEmail"));
					},
					onError: (error) => {
						console.log(error);
						toastError(error.error.message || error.error.statusText);
					},
				},
			);
		},
	});

	function onTermsPress() {
		console.log("Open terms and conditions");
	}

	return (
		<>
			<KeyboardAwareScrollView
				className="flex-1 bg-background"
				bottomOffset={appConfig.keyboardBottomOffset}
			>
				<View
					className="flex-1 justify-center px-6 py-24"
					style={{ paddingTop: top + appConfig.safeAreaTop }}
				>
					<View className="mx-auto w-full max-w-sm">
						<Animated.View className="mb-8" entering={FadeInUp.delay(100)}>
							<View className="mb-2">
								<Text className="mb-2 text-3xl font-bold tracking-tight text-foreground">
									{t("auth.signUpTitle")}
								</Text>
								<Text className="text-sm text-muted">{t("auth.signUpSubtitle")}</Text>
							</View>
						</Animated.View>

						<Animated.View className="mb-8" entering={FadeInDown.delay(200)}>
							<form.Field
								name="name"
								children={(field) => {
									const errorMessage = getErrorMessage(field.state.meta.errors);
									const isInvalid =
										field.state.meta.isTouched &&
										!field.state.meta.isValid &&
										Boolean(errorMessage);

									return (
										<View className="mb-4">
											<Text className="mb-2 text-base font-medium text-foreground">
												{t("auth.name")}
											</Text>
											<View className="h-12 justify-center rounded-lg border border-field-border bg-field px-4">
												<TextInput
													id={field.name}
													className="flex-1 text-base leading-tight text-field-foreground"
													placeholder={t("auth.namePlaceholder")}
													placeholderTextColor={fieldPlaceholderColor}
													autoCapitalize="words"
													autoComplete="name"
													cursorColor={accentColor}
													selectionColor={accentColor}
													textContentType="name"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChangeText={field.handleChange}
												/>
											</View>
											<View className="mt-1 min-h-4">
												<Text
													className={`text-xs ${isInvalid ? "text-danger" : "text-transparent"}`}
												>
													{isInvalid ? errorMessage : " "}
												</Text>
											</View>
										</View>
									);
								}}
							/>

							<form.Field
								name="email"
								children={(field) => {
									const errorMessage = getErrorMessage(field.state.meta.errors);
									const isInvalid =
										field.state.meta.isTouched &&
										!field.state.meta.isValid &&
										Boolean(errorMessage);

									return (
										<View className="mb-4">
											<Text className="mb-2 text-base font-medium text-foreground">
												{t("auth.email")}
											</Text>
											<View className="h-12 justify-center rounded-lg border border-field-border bg-field px-4">
												<TextInput
													id={field.name}
													className="flex-1 text-base leading-tight text-field-foreground"
													placeholder={t("auth.emailPlaceholder")}
													placeholderTextColor={fieldPlaceholderColor}
													keyboardType="email-address"
													autoCapitalize="none"
													autoComplete="email"
													cursorColor={accentColor}
													selectionColor={accentColor}
													textContentType="emailAddress"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChangeText={field.handleChange}
												/>
											</View>
											<View className="mt-1 min-h-4">
												<Text
													className={`text-xs ${isInvalid ? "text-danger" : "text-transparent"}`}
												>
													{isInvalid ? errorMessage : " "}
												</Text>
											</View>
										</View>
									);
								}}
							/>

							<form.Field
								name="password"
								children={(field) => {
									const errorMessage = getErrorMessage(field.state.meta.errors);
									const isInvalid =
										field.state.meta.isTouched &&
										!field.state.meta.isValid &&
										Boolean(errorMessage);

									return (
										<View className="mb-6">
											<Text className="mb-2 text-base font-medium text-foreground">
												{t("auth.password")}
											</Text>
											<View className="h-12 flex-row items-center rounded-lg border border-field-border bg-field px-4">
												<View className="flex-1">
													<TextInput
														id={field.name}
														className="flex-1 text-base leading-tight text-field-foreground"
														placeholder={t("auth.createPasswordPlaceholder")}
														placeholderTextColor={fieldPlaceholderColor}
														secureTextEntry={!showPassword}
														autoComplete="new-password"
														cursorColor={accentColor}
														selectionColor={accentColor}
														textContentType="newPassword"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChangeText={field.handleChange}
													/>
												</View>
												<Pressable
													onPress={() => setShowPassword(!showPassword)}
													className="ml-3"
												>
													<MaterialIcons
														name={showPassword ? "visibility-off" : "visibility"}
														size={18}
														color={mutedColor}
													/>
												</Pressable>
											</View>
											<View className="mt-1 min-h-4">
												<Text
													className={`text-xs ${isInvalid ? "text-danger" : "text-transparent"}`}
												>
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
												<Text className="text-xl font-semibold text-accent-foreground">
													{t("auth.signingUp")}
												</Text>
											</View>
										) : (
											<Text className="text-xl font-semibold text-accent-foreground">
												{t("auth.signUp")}
											</Text>
										)}
									</Button>
								)}
							</form.Subscribe>
						</Animated.View>

						<Animated.View entering={FadeInDown.delay(300)}>
							<View className="flex-row justify-center">
								<Text className="text-sm text-muted">{t("auth.alreadyHaveAccount")}</Text>
								<Pressable onPress={() => router.back()}>
									<Text className="ml-1 text-sm font-medium text-link">
										{t("auth.signIn")}
									</Text>
								</Pressable>
							</View>

							<Pressable onPress={onTermsPress} className="mt-4">
								<Text className="text-center text-xs text-muted">
									{t("auth.termsAgreement")}
								</Text>
							</Pressable>
						</Animated.View>
					</View>
				</View>
			</KeyboardAwareScrollView>
			<KeyboardToolbar />
		</>
	);
}
