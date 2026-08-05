import { logSafeError } from "../lib/safe-error";

const siteverifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const verificationTimeoutMs = 5_000;
const maxTokenLength = 2_048;

export type PublicFormAction = "contact" | "newsletter";

export type ChallengeEnvironment = {
  TURNSTILE_SECRET_KEY?: string;
  WEBSITE_URL?: string;
};

export type PublicFormChallengeResult =
  | { ok: true }
  | {
      ok: false;
      code: "CHALLENGE_REQUIRED" | "CHALLENGE_REJECTED" | "CHALLENGE_UNAVAILABLE";
      error: string;
      status: 400 | 503;
    };

export type PublicFormChallengeVerifier = (input: {
  action: PublicFormAction;
  env: ChallengeEnvironment;
  token?: string;
}) => Promise<PublicFormChallengeResult>;

type SiteverifyResponse = {
  success?: boolean;
  action?: string;
  hostname?: string;
};

function rejectedChallenge(): PublicFormChallengeResult {
  return {
    ok: false,
    code: "CHALLENGE_REJECTED",
    error: "Please complete the verification challenge and try again.",
    status: 400,
  };
}

function expectedHostname(websiteUrl: string | undefined) {
  try {
    return websiteUrl ? new URL(websiteUrl).hostname : undefined;
  } catch {
    return undefined;
  }
}

/** Verifies an optional Turnstile response without exposing its secret or provider diagnostics. */
export const verifyPublicFormChallenge: PublicFormChallengeVerifier = async ({
  action,
  env,
  token,
}) => {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return { ok: true };
  if (!token) {
    return {
      ok: false,
      code: "CHALLENGE_REQUIRED",
      error: "Please complete the verification challenge and try again.",
      status: 400,
    };
  }
  if (token.length > maxTokenLength) return rejectedChallenge();

  let result: SiteverifyResponse;
  try {
    const response = await fetch(siteverifyUrl, {
      body: new URLSearchParams({ response: token, secret }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
      signal: AbortSignal.timeout(verificationTimeoutMs),
    });
    if (!response.ok) throw new Error(`Turnstile returned ${response.status}`);
    result = (await response.json()) as SiteverifyResponse;
  } catch (error) {
    logSafeError("Turnstile verification unavailable", error, { action });
    return {
      ok: false,
      code: "CHALLENGE_UNAVAILABLE",
      error: "Verification is temporarily unavailable. Please try again.",
      status: 503,
    };
  }

  if (!result.success || result.action !== action) return rejectedChallenge();
  const hostname = expectedHostname(env.WEBSITE_URL);
  if (hostname && result.hostname !== hostname) return rejectedChallenge();
  return { ok: true };
};
