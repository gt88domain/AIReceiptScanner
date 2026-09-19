import { MaterialIcons } from "@expo/vector-icons";
import { Button, Spinner, useThemeColor } from "heroui-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { NativeImagePicker } from "@/lib/image-picker/image-picker";
import {
  isDocumentScannerSupported,
  isReceiptVisionAvailable,
  recognizeReceipt,
  scanDocument,
  type LocalReceiptOcrResult,
} from "@/modules/receipt-vision";

type ScanState = "idle" | "scanning" | "importing" | "recognizing" | "complete" | "error";

function errorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: unknown }).code ?? "");
  }
  return "";
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}

export default function ReceiptScanScreen() {
  const { t } = useTranslation();
  const [accentColor, mutedColor] = useThemeColor(["accent", "muted"]);
  const [state, setState] = useState<ScanState>("idle");
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [result, setResult] = useState<LocalReceiptOcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visionAvailable = isReceiptVisionAvailable();
  const scannerSupported = visionAvailable && isDocumentScannerSupported();
  const busy = state === "scanning" || state === "importing" || state === "recognizing";

  async function recognize(uri: string, source: string) {
    setState("recognizing");
    setSourceLabel(source);
    const nextResult = await recognizeReceipt(uri);
    setResult(nextResult);
    setState("complete");
  }

  async function handleScan() {
    setError(null);
    setResult(null);
    setSourceLabel(null);
    setState("scanning");

    try {
      const capture = await scanDocument();
      await recognize(capture.uri, t("receiptScan.sourceCamera"));
    } catch (cause) {
      if (errorCode(cause) === "ERR_RECEIPT_SCAN_CANCELLED") {
        setState("idle");
        setError(null);
        return;
      }

      setState("error");
      setError(errorMessage(cause));
    }
  }

  async function handleImport() {
    setError(null);
    setResult(null);
    setSourceLabel(null);
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

      await recognize(picked.assets[0].uri, t("receiptScan.sourceLibrary"));
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
          {busy ? <Spinner size="sm" /> : <MaterialIcons name="offline-bolt" size={22} color={accentColor} />}
          <View className="flex-1">
            <Text className="font-semibold">
              {state === "scanning"
                ? t("receiptScan.scanning")
                : state === "importing"
                  ? t("receiptScan.importing")
                  : state === "recognizing"
                    ? t("receiptScan.recognizing")
                    : state === "complete"
                      ? t("receiptScan.complete")
                      : error
                        ? t("common.error")
                        : t("receiptScan.idle")}
            </Text>
            {sourceLabel ? <Text className="mt-1 text-sm text-muted">{sourceLabel}</Text> : null}
          </View>
        </View>
        {error ? <Text className="mt-3 text-sm text-danger">{error}</Text> : null}
      </View>

      {result ? (
        <>
          <View className="mt-6 rounded-2xl border border-border bg-surface p-5">
            <Text className="text-base font-bold">{t("receiptScan.diagnostics")}</Text>
            <Text className="mt-3 text-sm text-muted">Engine: {result.engineVersion}</Text>
            <Text className="mt-1 text-sm text-muted">iOS: {result.osVersion}</Text>
            <Text className="mt-1 text-sm text-muted">Duration: {result.durationMs} ms</Text>
            <Text className="mt-1 text-sm text-muted">Lines: {result.lines.length}</Text>
            <Text className="mt-1 text-sm text-muted">
              Image: {result.width} × {result.height}
            </Text>
          </View>

          <View className="mt-4 rounded-2xl border border-border bg-surface p-5">
            <Text className="text-base font-bold">{t("receiptScan.rawText")}</Text>
            <Text className="mt-3 text-sm leading-6 text-foreground">
              {result.fullText || t("receiptScan.emptyText")}
            </Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
