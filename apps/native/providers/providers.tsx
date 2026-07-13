/**
 * Composes the native app's root providers.
 *
 * Payments are intentionally not wired here. The native app uses a direct
 * SDK wrapper instead of a global payments provider.
 */
import { HeroUINativeProvider } from "heroui-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { config } from "@/configs/heroui-native-config";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { queryClient } from "@/lib/orpc";
import { AuthProvider } from "@/providers/auth-provider";
import { DialogProvider } from "@/providers/dialog-provider";
import { ThemeProvider } from "@/providers/theme-provider";

/**
 * Builds the global provider tree used by the native root layout.
 */
export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<ThemeProvider>
				<QueryClientProvider client={queryClient}>
					<KeyboardProvider>
						<AuthProvider>
							<HeroUINativeProvider config={config}>
								<DialogProvider>{children}</DialogProvider>
							</HeroUINativeProvider>
						</AuthProvider>
					</KeyboardProvider>
				</QueryClientProvider>
			</ThemeProvider>
		</GestureHandlerRootView>
	);
}
