import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";

type DialogActionVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "danger"
  | "danger-soft"
  | "ghost"
  | "outline";

export type GlobalDialogOptions = {
  icon?: ReactNode;
  title: string;
  description?: string;
  content?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: DialogActionVariant;
  hideCancel?: boolean;
  showCloseButton?: boolean;
  isSwipeable?: boolean;
  isCloseOnOverlayPress?: boolean;
  closeOnConfirm?: boolean;
  onConfirm?: () => void | boolean | Promise<void | boolean>;
  onCancel?: () => void;
};

type GlobalDialogContextValue = {
  openDialog: (options: GlobalDialogOptions) => void;
  closeDialog: () => void;
};

const GlobalDialogContext = createContext<GlobalDialogContextValue | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  const closeDialog = () => {
    // Native alerts are managed by the platform and cannot be closed imperatively.
  };

  const openDialog = (options: GlobalDialogOptions) => {
    const confirmLabel = options.confirmText ?? t("common.confirm");
    const cancelLabel = options.cancelText ?? t("common.cancel");
    const confirmStyle =
      options.confirmVariant === "danger" || options.confirmVariant === "danger-soft"
        ? "destructive"
        : "default";

    const buttons: {
      text: string;
      style?: "default" | "cancel" | "destructive";
      onPress?: () => void;
    }[] = [];

    if (!options.hideCancel) {
      buttons.push({
        text: cancelLabel,
        style: "cancel",
        onPress: options.onCancel,
      });
    }

    buttons.push({
      text: confirmLabel,
      style: confirmStyle,
      onPress: () => {
        void options.onConfirm?.();
      },
    });

    Alert.alert(options.title, options.description, buttons);
  };

  return (
    <GlobalDialogContext.Provider value={{ openDialog, closeDialog }}>
      {children}
    </GlobalDialogContext.Provider>
  );
}

export function useGlobalDialog() {
  const context = useContext(GlobalDialogContext);

  if (!context) {
    throw new Error("useGlobalDialog must be used within a DialogProvider");
  }

  return context;
}
