export const getErrorMessage = (errors: unknown) => {
	if (Array.isArray(errors)) {
		return errors
			.map((error) => {
				if (error && typeof error === "object" && "message" in error) {
					return String((error as { message?: unknown }).message ?? "");
				}
				return String(error ?? "");
			})
			.filter(Boolean)
			.join(", ");
	}

	return String(errors ?? "");
};
