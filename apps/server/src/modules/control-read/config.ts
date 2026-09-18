const hostnamePattern =
  /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?)+$/;
const ipv4Pattern = /^\d{1,3}(?:\.\d{1,3}){3}$/;

export type ControlReadHttpConfig = Readonly<{
  audience: string;
  host: string;
  teamDomain: string;
}>;

export function normalizeControlReadHttpHost(value: string | undefined) {
  const host = value?.trim().toLowerCase() ?? "";
  return hostnamePattern.test(host) && !ipv4Pattern.test(host) && host !== "localhost"
    ? host
    : null;
}

export function normalizeControlAccessTeamDomain(value: string | undefined) {
  const raw = value?.trim() ?? "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" &&
      url.pathname === "/" &&
      normalizeControlReadHttpHost(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

export function resolveControlReadHttpConfig(env: {
  CONTROL_ACCESS_AUD?: string;
  CONTROL_ACCESS_TEAM_DOMAIN?: string;
  CONTROL_READ_HTTP_HOST?: string;
}): ControlReadHttpConfig | null {
  const host = normalizeControlReadHttpHost(env.CONTROL_READ_HTTP_HOST);
  if (!host) return null;
  const teamDomain = normalizeControlAccessTeamDomain(env.CONTROL_ACCESS_TEAM_DOMAIN);
  const audience = env.CONTROL_ACCESS_AUD?.trim() ?? "";
  return teamDomain && audience.length > 0 && audience.length <= 512
    ? { audience, host, teamDomain }
    : null;
}
