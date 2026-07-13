import type { ImperativeRouter } from "expo-router";

export function dismissToSignIn(router: ImperativeRouter) {
  if (router.canDismiss()) {
    router.dismissTo("/sign-in");
    return;
  }

  router.replace("/sign-in");
}

export function dismissToHome(router: ImperativeRouter) {
  if (router.canDismiss()) {
    router.dismissTo("/(tabs)/(home)");
    return;
  }

  router.replace("/(tabs)/(home)");
}
