import { env } from "cloudflare:workers";
import { createRemoteJWKSet, decodeJwt, decodeProtectedHeader, jwtVerify } from "jose";

type AppleIdTokenPayload = {
  email?: string;
  email_verified?: boolean | "true" | "false";
  name?: string;
  nonce?: string;
  picture?: string;
  sub: string;
};

type AppleIdentityTokenUser = {
  email?: string;
  name?: {
    firstName?: string;
    lastName?: string;
  };
};

const appleRemoteJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
const APPLE_ID_TOKEN_ALGORITHM = "RS256";

function buildAppleUserName(
  user: AppleIdentityTokenUser | undefined,
  profile: AppleIdTokenPayload,
) {
  const firstName = user?.name?.firstName?.trim();
  const lastName = user?.name?.lastName?.trim();

  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(" ");
  }

  return profile.name || "";
}

function getAppleEmailVerified(emailVerified: AppleIdTokenPayload["email_verified"]) {
  return typeof emailVerified === "boolean" ? emailVerified : emailVerified === "true";
}

export async function verifyAppleIdentityToken(token: string, nonce?: string) {
  const { alg } = decodeProtectedHeader(token);
  if (alg !== APPLE_ID_TOKEN_ALGORITHM) {
    return false;
  }

  try {
    const verificationOptions = {
      algorithms: [APPLE_ID_TOKEN_ALGORITHM],
      audience: env.APPLE_APP_BUNDLE_IDENTIFIER,
      issuer: "https://appleid.apple.com",
      maxTokenAge: "1h",
    };

    const verificationResult = await jwtVerify(token, appleRemoteJwks, verificationOptions);

    if (nonce && verificationResult.payload.nonce !== nonce) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("[apple idToken] verify failed", error);
    return false;
  }
}

export async function getAppleUserInfoFromIdentityToken(token: {
  idToken?: string;
  user?: AppleIdentityTokenUser;
}) {
  if (!token.idToken) {
    return null;
  }

  const profile = decodeJwt<AppleIdTokenPayload>(token.idToken);
  if (!profile?.sub) {
    return null;
  }

  // Identity claims must come from the verified idToken. Apple's unsigned
  // callback user object is used only to recover the first-login display name.
  const email = profile.email;
  if (!email) {
    return null;
  }

  return {
    data: profile,
    user: {
      email,
      emailVerified: getAppleEmailVerified(profile.email_verified),
      id: profile.sub,
      image: profile.picture,
      name: buildAppleUserName(token.user, profile),
    },
  };
}

export function getAppleProviderConfig() {
  return {
    appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER || "",
    clientId: env.APPLE_APP_BUNDLE_IDENTIFIER || "",
    getUserInfo: getAppleUserInfoFromIdentityToken,
    verifyIdToken: verifyAppleIdentityToken,
  };
}
