import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Button, Spinner, useThemeColor } from "heroui-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { createReceiptDraft, loadReceiptDraft, saveReceiptDraft } from "@/features/receipts/draft-storage";
import { parseLocalReceipt } from "@/features/receipts/parser/receipt-parser";
import { NativeImagePicker } from "@/lib/image-picker/image-picker";
import {
  deleteDraftImage,
  isDocumentScannerSupported,
  isReceiptVisionAvailable,
  persistDraftImage,
  recognizeReceipt,
  scanDocument,
} from "@/modules/receipt-vision";

type ScanState = "idle" | "scanning" | "importing" | "recognizing" | "error";

function errorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: unknown }).code ?? "");
  }
  return "";
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

export default function ReceiptScanScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [accentColor, mutedColor] = useThemeColor(["accent", "muted"]);
  const [state, setState] = useState<ScanState>("idle");
  const [error, setError] = useState<string | null>(null);

  const visionAvailable = isReceiptVisionAvailable();
  const scannerSupported = visionAvailable && isDocumentScannerSupported();
  const busy = state === "scanning" || state === "importing" || state === "recognizing";

  async function redirectExistingDraft() {
    try {
      const existing = await loadReceiptDraft();
      if (!existing) return false;
      router.replace("/(tabs)/(home)/verify");
      return true;
    } catch {
      setState("error");
      setError(t("receiptScan.draftLoadError"));
      return true;
    }
  }

  async function recognizeAndCreateDraft(uri: string, source: "camera" | "library") {
    setState("recognizing");
    let persistedUri: string | null = null;

    try {
      const persisted = await persistDraftImage(uri);
      persistedUri = persisted.uri;
      const ocr = await recognizeReceipt(persisted.uri);
      const parse = parseLocalReceipt(ocr);
      await saveReceiptDraft(
        createReceiptDraft({
          source,
          imageUri: persisted.uri,
          ocr,
          parse,
        }),
      );
      router.replace("/(tabs)/(home)/verify");
    } catch (cause) {
      if (persistedUri) {
        try {
          await deleteDraftImage(persistedUri);
        } catch {
          // The user-facing error remains the failed scan/OCR operation.
          // Cleanup is retried through the draft lifecycle when a draft exists.
        }
      }
      throw cause;
    }
  }

  async function handleScan() {
    setError(null);
    if (await redirectExistingDraft()) return;
    setState("scanning");

    try {
      const capture = await scanDocument();
      await recognizeAndCreateDraft(capture.uri, "camera");
    } catch (cause) {
      if (errorCode(cause) === "ERR_RECEIPT_SCAN_CANCELLED") {
        setState("idle");
        return;
      }
      setState("error");
      setError(errorMessage(cause));
    }
  }

  async function handleImport() {
    setError(null);
    if (await redirectExistingDraft()) return;
    setState("importing");

    try {
      const picked = await NativeImagePicker.pickImagesFromLibrary({
        selectionLimit: 1,
        allowsEditing: false,
        quality: 1,
      });

      if (picked.status === "cancelled") {
        setState("idle");
        return;
      }

      if (picked.status === "permission-denied") {
        setState("error");
        setError(t("receiptScan.permissionDenied"));
        return;
      }

      await recognizeAndCreateDraft(picked.assets[0].uri, "library");
    } catch (cause) {
      setState("error");
      setError(errorMessage(cause));
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
    >
      <View className="pt-6">
        <Text className="text-base leading-6 text-muted">{t("receiptScan.description")}</Text>
      </View>

      {!visionAvailable ? (
        <View className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <View className="flex-row items-center gap-3">
            <MaterialIcons name="phonelink-off" size={22} color={mutedColor} />
            <Text className="flex-1 text-sm leading-5 text-muted">
              {t("receiptScan.unavailable")}
            </Text>
          </View>
        </View>
      ) : null}

      {visionAvailable && !scannerSupported ? (
        <View className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <Text className="text-sm leading-5 text-muted">{t("receiptScan.scannerUnsupported")}</Text>
        </View>
      ) : null}

      <View className="mt-6 gap-3">
        <Button
          className="h-12 items-center justify-center"
          isDisabled={!scannerSupported || busy}
          onPress={handleScan}
        >
          <Button.Label className="font-bold">{t("receiptScan.scanAction")}</Button.Label>
        </Button>

        <Button
          variant="secondary"
          className="h-12 items-center justify-center"
          isDisabled={!visionAvailable || busy}
          onPress={handleImport}
        >
          <Button.Label className="font-bold">{t("receiptScan.importAction")}</Button.Label>
        </Button>
      </View>

      <View className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <View className="flex-row items-center gap-3">
          {busy ? (
            <Spinner size="sm" />
          ) : (
            <MaterialIcons name="offline-bolt" size={22} color={accentColor} />
          )}
          <Text className="flex-1 font-semibold">
            {state === "scanning"
              ? t("receiptScan.scanning")
              : state === "importing"
                ? t("receiptScan.importing")
                : state === "recognizing"
                  ? t("receiptScan.recognizing")
                  : error
                    ? t("common.error")
                    : t("receiptScan.idle")}
          </Text>
        </View>
        {error ? <Text className="mt-3 text-sm text-danger">{error}</Text> : null}
      </View>
    </ScrollView>
  );
}
