export function resolveSignupPolicy({
  backofficePreview,
  emailPasswordEnabled,
  publicSignupEnabled,
}: {
  backofficePreview: boolean;
  emailPasswordEnabled: boolean | undefined;
  publicSignupEnabled: boolean | undefined;
}) {
  return {
    emailPasswordEnabled: emailPasswordEnabled ?? false,
    signupDisabled: backofficePreview || publicSignupEnabled === false,
  };
}
