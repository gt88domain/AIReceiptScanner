import { getSetCookie } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";
import { getFirstSearchParam, getSearchParamArray } from "@repo/shared";
import { useTranslation } from "react-i18next";
import { getAuthConfig } from "@/configs/app-config";
import { useToast } from "@/hooks/use-toast";
import { authClient } from "@/lib/auth/auth.client";
import { useAuth } from "@/providers/auth-provider";
import { dismissToHome, dismissToSignIn } from "@/utils/route";

const authConfig = getAuthConfig();

function mergeAuthCookies(cookieParams: string[]): string | null {
	let nextCookie = SecureStore.getItem(authConfig.cookieStorageKey) ?? undefined;
	for (const cookieParam of cookieParams) {
		nextCookie = getSetCookie(cookieParam, nextCookie);
	}
	return nextCookie ?? null;
}

type RunAuthCallbackFlowOptions = {
	errorParam: string | undefined;
	flowParam: string | undefined;
	cookieParams: string[];
	missingCookieMessage: string;
	invalidCookieMessage: string;
	signInSuccessMessage: string;
	onError: (message: string) => void;
	onSuccess: (message: string) => void;
	onNavigateHome: () => void;
	onNavigateSignIn: () => void;
	onRefetchSession: () => Promise<void>;
	isUnmounted: () => boolean;
};

// Execute callback flow once for a unique callback payload.
async function runAuthCallbackFlow({
	errorParam,
	flowParam,
	cookieParams,
	missingCookieMessage,
	invalidCookieMessage,
	signInSuccessMessage,
	onError,
	onSuccess,
	onNavigateHome,
	onNavigateSignIn,
	onRefetchSession,
	isUnmounted,
}: RunAuthCallbackFlowOptions): Promise<void> {
	if (errorParam) {
		onError(errorParam);
		onNavigateSignIn();
		return;
	}

	if (cookieParams.length === 0) {
		onError(missingCookieMessage);
		onNavigateSignIn();
		return;
	}

	const nextCookie = mergeAuthCookies(cookieParams);
	if (!nextCookie) {
		onError(invalidCookieMessage);
		onNavigateSignIn();
		return;
	}

	SecureStore.setItem(authConfig.cookieStorageKey, nextCookie);

	const sessionResult = await authClient.getSession();
	if (isUnmounted()) {
		return;
	}

	if (sessionResult.data?.user) {
		if (flowParam === "verify-email") {
			onSuccess(signInSuccessMessage);
		}
		onNavigateHome();
		onRefetchSession();
		return;
	}

	onError(
		sessionResult.error?.message ||
			sessionResult.error?.statusText ||
			"Authentication session was not created.",
	);
	onNavigateSignIn();
}

export default function AuthCallbackScreen() {
	const router = useRouter();
	const { t } = useTranslation();
	const { toastError, toastSuccess } = useToast();
	const { refetchSession } = useAuth();
	const handledKeysRef = React.useRef(new Set<string>());
	const unmountedRef = React.useRef(false);
	const actionsRef = React.useRef({
		toastError,
		toastSuccess,
		refetchSession,
		navigateHome: () => dismissToHome(router),
		navigateSignIn: () => dismissToSignIn(router),
	});

	const params = useLocalSearchParams<{
		cookie?: string | string[];
		error?: string | string[];
		flow?: string | string[];
	}>();
	const cookieParams = React.useMemo(() => getSearchParamArray(params.cookie), [params.cookie]);
	const errorParam = React.useMemo(() => getFirstSearchParam(params.error), [params.error]);
	const flowParam = React.useMemo(() => getFirstSearchParam(params.flow), [params.flow]);
	const handleKey = React.useMemo(
		() =>
			JSON.stringify({
				error: errorParam ?? null,
				flow: flowParam ?? null,
				cookie: cookieParams,
			}),
		[cookieParams, errorParam, flowParam],
	);

	React.useEffect(() => {
		actionsRef.current = {
			toastError,
			toastSuccess,
			refetchSession,
			navigateHome: () => dismissToHome(router),
			navigateSignIn: () => dismissToSignIn(router),
		};
	}, [refetchSession, router, toastError, toastSuccess]);

	React.useEffect(() => {
		unmountedRef.current = false;
		return () => {
			unmountedRef.current = true;
		};
	}, []);

	React.useEffect(() => {
		if (handledKeysRef.current.has(handleKey)) {
			return;
		}

		handledKeysRef.current.add(handleKey);
		runAuthCallbackFlow({
			errorParam,
			flowParam,
			cookieParams,
			missingCookieMessage: t("auth.callbackCookieMissing"),
			invalidCookieMessage: t("auth.callbackCookieInvalid"),
			signInSuccessMessage: t("auth.signInSuccess"),
			onError: (message) => actionsRef.current.toastError(message),
			onSuccess: (message) => actionsRef.current.toastSuccess(message),
			onNavigateHome: () => actionsRef.current.navigateHome(),
			onNavigateSignIn: () => actionsRef.current.navigateSignIn(),
			onRefetchSession: () => actionsRef.current.refetchSession(),
			isUnmounted: () => unmountedRef.current,
		}).catch((error) => {
			const message = error instanceof Error ? error.message : "Unknown callback error";
			actionsRef.current.toastError(message);
			actionsRef.current.navigateSignIn();
		});
	}, [cookieParams, errorParam, flowParam, handleKey, t]);

	return (
		<View className="flex-1 items-center justify-center">
			<ActivityIndicator />
		</View>
	);
}
