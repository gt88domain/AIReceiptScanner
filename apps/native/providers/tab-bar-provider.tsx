import { useFocusEffect } from "expo-router";
import * as React from "react";

type TabBarContextValue = {
	isTabBarHidden: boolean;
	setTabBarHidden: React.Dispatch<React.SetStateAction<boolean>>;
	hideTabBar: () => void;
	showTabBar: () => void;
};

const TabBarContext = React.createContext<TabBarContextValue | null>(null);

export function TabBarProvider({ children }: { children: React.ReactNode }) {
	const [isTabBarHidden, setTabBarHidden] = React.useState(false);

	const hideTabBar = React.useCallback(() => {
		setTabBarHidden(true);
	}, []);

	const showTabBar = React.useCallback(() => {
		setTabBarHidden(false);
	}, []);

	const value = React.useMemo<TabBarContextValue>(
		() => ({
			isTabBarHidden,
			setTabBarHidden,
			hideTabBar,
			showTabBar,
		}),
		[hideTabBar, isTabBarHidden, showTabBar],
	);

	return <TabBarContext.Provider value={value}>{children}</TabBarContext.Provider>;
}

export function useTabBar() {
	const context = React.useContext(TabBarContext);
	if (!context) {
		throw new Error("useTabBar must be used within a TabBarProvider");
	}
	return context;
}

export function useTabBarVisibility(hidden: boolean) {
	const { setTabBarHidden } = useTabBar();

	useFocusEffect(
		React.useCallback(() => {
			setTabBarHidden(hidden);

			return () => {
				setTabBarHidden(false);
			};
		}, [hidden, setTabBarHidden]),
	);
}
