import { OpenPanel } from "@openpanel/react-native";
import type { TrackProperties } from "@openpanel/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const clientId = process.env.EXPO_PUBLIC_OPENPANEL_CLIENT_ID;
const clientSecret = process.env.EXPO_PUBLIC_OPENPANEL_CLIENT_SECRET;

const openPanel =
  clientId && clientSecret
    ? new OpenPanel({
        clientId,
        clientSecret,
        storage: AsyncStorage,
      })
    : undefined;

/**
 * Tracks an explicit OpenPanel event from the native app.
 *
 * @param name - OpenPanel event name to send.
 * @param properties - Optional event properties.
 * @returns The OpenPanel tracking promise when configured, otherwise undefined.
 */
export function trackOpenPanelEvent(name: string, properties?: TrackProperties) {
  return openPanel?.track(name, properties);
}

/**
 * Tracks an explicit OpenPanel screen view for native screens selected by the product.
 *
 * @param path - Native route or screen path to associate with the screen view.
 * @param properties - Optional screen view properties.
 * @returns Nothing. The event is skipped when OpenPanel is not configured.
 */
export function trackOpenPanelScreenView(path: string, properties?: TrackProperties) {
  openPanel?.screenView(path, properties);
}
