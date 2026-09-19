import { useRouter } from "expo-router";
import { Button, Spinner } from "heroui-native";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, TextInput, View } from "react-native";
import { Text } from "@/components/ui/text";
import {
  clearReceiptDraft,
  loadReceiptDraft,
  markReceiptDraftVerified,
  saveReceiptDraft,
} from "@/features/receipts/draft-storage";
import { normalizeDecimalAmount, validateReceiptFieldsForVerification } from "@/features/receipts/parser/receipt-parser";
import type {
  ReceiptDraft,
  ReceiptFieldName,
  ReceiptFields,
} from "@/features/receipts/types";
import { deleteDraftImage } from "@/modules/receipt-vision";
import {
  syncVerifiedReceiptDraft,
  UnsupportedReceiptCurrencyError,
} from "@/features/receipts/receipt-sync";
import { useAuth } from "@/providers/auth-provider";

const FIELD_ORDER: Array<{
  field: ReceiptFieldName;
  labelKey: string;
  keyboardType?: "default" | "decimal-pad";
  autoCapitalize?: "none" | "words" | "characters";
}> = [
  { field: "merchant", labelKey: "receiptVerify.merchant", autoCapitalize: "words" },
  { field: "purchaseDate", labelKey: "receiptVerify.purchaseDate", autoCapitalize: "none" },
  { field: "currency", labelKey: "receiptVerify.currency", autoCapitalize: "characters" },
  { field: "total", labelKey: "receiptVerify.total", keyboardType: "decimal-pad" },
  { field: "subtotal", labelKey: "receiptVerify.subtotal", keyboardType: "decimal-pad" },
  { field: "tax", labelKey: "receiptVerify.tax", keyboardType: "decimal-pad" },
  { field: "tip", labelKey: "receiptVerify.tip", keyboardType: "decimal-pad" },
  { field: "paymentMethod", labelKey: "receiptVerify.paymentMethod", autoCapitalize: "words" },
  { field: "paymentLast4", labelKey: "receiptVerify.paymentLast4", keyboardType: "decimal-pad" },
];

export default function ReceiptVerifyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [draft, setDraft] = useState<ReceiptDraft | null>(null);
  const [fields, setFields] = useState<ReceiptFields | null>(null);
  const [editedFields, setEditedFields] = useState<ReceiptFieldName[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftRef = useRef<ReceiptDraft | null>(null);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    loadReceiptDraft()
      .then((stored) => {
        if (!active) return;
        setDraft(stored);
        draftRef.current = stored;
        setFields(stored?.fields ?? null);
        setEditedFields(stored?.editedFields ?? []);
      })
      .catch(() => {
        if (active) setError(t("receiptVerify.draftLoadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function persistEdit(
    nextFields: ReceiptFields,
    nextEditedFields: ReceiptFieldName[],
  ) {
    const current = draftRef.current;
    if (!current) return;

    const snapshot: ReceiptDraft = {
      ...current,
      fields: nextFields,
      editedFields: nextEditedFields,
      verificationStatus: "pending",
      verifiedAt: null,
      updatedAt: new Date().toISOString(),
    };
    draftRef.current = snapshot;
    setDraft(snapshot);

    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(() => saveReceiptDraft(snapshot))
      .catch(() => {
        setError(t("receiptVerify.draftSaveError"));
      });
  }

  function handleChange(field: ReceiptFieldName, value: string) {
    if (!fields) return;

    const normalizedInput =
      field === "currency"
        ? value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3)
        : field === "paymentLast4"
          ? value.replace(/\D/g, "").slice(0, 4)
          : value;

    const nextFields = { ...fields, [field]: normalizedInput };
    const nextEditedFields = editedFields.includes(field)
      ? editedFields
      : [...editedFields, field];

    setFields(nextFields);
    setEditedFields(nextEditedFields);
    setError(null);
    persistEdit(nextFields, nextEditedFields);
  }

  async function handleConfirm() {
    const current = draftRef.current;
    if (!current || !fields) return;

    const validationWarnings = validateReceiptFieldsForVerification(fields);
    if (validationWarnings.length > 0) {
      setError(validationWarnings[0].message);
      return;
    }

    const normalizedFields: ReceiptFields = {
      ...fields,
      merchant: fields.merchant.trim(),
      purchaseDate: fields.purchaseDate.trim(),
      currency: fields.currency.trim().toUpperCase(),
      subtotal: fields.subtotal ? (normalizeDecimalAmount(fields.subtotal) ?? fields.subtotal) : "",
      tax: fields.tax ? (normalizeDecimalAmount(fields.tax) ?? fields.tax) : "",
      tip: fields.tip ? (normalizeDecimalAmount(fields.tip) ?? fields.tip) : "",
      total: normalizeDecimalAmount(fields.total) ?? fields.total,
      paymentMethod: fields.paymentMethod.trim(),
      paymentLast4: fields.paymentLast4.trim(),
    };

    setSaving(true);
    setError(null);
    try {
      await saveQueueRef.current;
      const verified = await markReceiptDraftVerified(
        current,
        normalizedFields,
        editedFields,
      );
      draftRef.current = verified;
      setDraft(verified);
      setFields(normalizedFields);

      if (!user) {
        router.replace("/(auth)/sign-in");
        return;
      }

      try {
        await syncVerifiedReceiptDraft(verified);
        router.replace("/(tabs)/(home)");
      } catch (cause) {
        setError(
          cause instanceof UnsupportedReceiptCurrencyError
            ? t("receiptVerify.unsupportedCurrency")
            : t("receiptVerify.syncError"),
        );
      }
    } catch {
      setError(t("receiptVerify.draftSaveError"));
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    const current = draftRef.current;
    if (!current) return;

    Alert.alert(t("receiptVerify.discardTitle"), t("receiptVerify.discardDescription"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("receiptVerify.discardAction"),
        style: "destructive",
        onPress: () => {
          setSaving(true);
          setError(null);
          void (async () => {
            try {
              await deleteDraftImage(current.imageUri);
              await clearReceiptDraft();
              router.replace("/(tabs)/(home)");
            } catch {
              setError(t("receiptVerify.discardError"));
              setSaving(false);
            }
          })();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  if (!draft || !fields) {
    return (
      <View className="flex-1 justify-center bg-background px-6">
        <Text className="text-xl font-bold">{t("receiptVerify.noDraftTitle")}</Text>
        <Text className="mt-2 text-sm leading-5 text-muted">
          {t("receiptVerify.noDraftDescription")}
        </Text>
        {error ? <Text className="mt-4 text-sm text-danger">{error}</Text> : null}
        <Button className="mt-6" onPress={() => router.replace("/(tabs)/(home)/scan")}>
          <Button.Label>{t("receiptVerify.scanAction")}</Button.Label>
        </Button>
      </View>
    );
  }

  const warningsByField = new Map(
    draft.parse.warnings
      .filter((warning) => warning.field)
      .map((warning) => [warning.field as ReceiptFieldName, warning.message]),
  );

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
    >
      <View className="pt-6">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-2xl font-bold">{t("receiptVerify.title")}</Text>
          <Text className="text-xs font-semibold text-muted">{draft.parse.quality}</Text>
        </View>
        <Text className="mt-2 text-sm leading-5 text-muted">
          {t("receiptVerify.description")}
        </Text>
      </View>

      {draft.parse.warnings.length > 0 ? (
        <View className="mt-5 rounded-2xl border border-border bg-surface p-4">
          <Text className="font-semibold">{t("receiptVerify.reviewNeeded")}</Text>
          {draft.parse.warnings.map((warning) => (
            <Text key={`${warning.code}:${warning.field ?? "receipt"}`} className="mt-2 text-sm text-muted">
              • {warning.message}
            </Text>
          ))}
        </View>
      ) : null}

      <View className="mt-6 gap-5">
        {FIELD_ORDER.map(({ field, labelKey, keyboardType, autoCapitalize }) => {
          const warning = warningsByField.get(field);
          return (
            <View key={field}>
              <Text className="mb-2 text-sm font-semibold">{t(labelKey)}</Text>
              <View className="min-h-12 justify-center rounded-lg border border-field-border bg-field px-4">
                <TextInput
                  value={fields[field]}
                  onChangeText={(value) => handleChange(field, value)}
                  keyboardType={keyboardType}
                  autoCapitalize={autoCapitalize}
                  autoCorrect={field === "merchant" || field === "paymentMethod"}
                  className="min-h-12 text-base text-field-foreground"
                  accessibilityLabel={t(labelKey)}
                />
              </View>
              {warning ? <Text className="mt-1 text-xs text-danger">{warning}</Text> : null}
            </View>
          );
        })}
      </View>

      {error ? <Text className="mt-5 text-sm text-danger">{error}</Text> : null}

      <View className="mt-8 gap-3">
        <Button isDisabled={saving} onPress={handleConfirm}>
          <Button.Label className="font-bold">
            {saving ? t("common.loading") : t("receiptVerify.confirmDraft")}
          </Button.Label>
        </Button>
        <Button variant="secondary" isDisabled={saving} onPress={handleDiscard}>
          <Button.Label>{t("receiptVerify.discardAction")}</Button.Label>
        </Button>
      </View>

      <View className="mt-6 rounded-2xl border border-border bg-surface p-4">
        <Text className="text-sm font-semibold">{t("receiptVerify.rawText")}</Text>
        <Text className="mt-2 text-xs leading-5 text-muted">{draft.ocr.fullText}</Text>
      </View>
    </ScrollView>
  );
}
