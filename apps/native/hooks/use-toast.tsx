import Ionicons from "@expo/vector-icons/Ionicons";
import { useThemeColor, useToast as useHerouiToast } from "heroui-native";

export function useToast() {
	const { toast } = useHerouiToast();
	const [dangerColor, successColor] = useThemeColor(["danger", "success"]);

	function toastSuccess(message: string) {
		toast.show({
			icon: <Ionicons name="checkmark-circle" size={24} color={successColor} />,
			variant: "success",
			label: message,
			onActionPress: ({ hide }) => hide(),
		});
	}

	function toastError(message: string) {
		toast.show({
			icon: <Ionicons name="alert-circle" size={24} color={dangerColor} />,
			variant: "danger",
			label: message,
			onActionPress: ({ hide }) => hide(),
		});
	}

	return { toastSuccess, toastError };
}
