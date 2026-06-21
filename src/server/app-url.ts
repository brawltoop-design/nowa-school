type EnvLike = Partial<Record<string, string | undefined>>;

function normalizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim() || undefined;
  }

  return trimmed;
}

function toAbsoluteUrl(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value.replace(/\/$/, "");
  }

  return `https://${value.replace(/\/$/, "")}`;
}

export function getAppUrl(env: EnvLike = process.env) {
  const explicitUrl =
    normalizeEnvValue(env.APP_URL) ?? normalizeEnvValue(env.NEXTAUTH_URL);

  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, "");
  }

  const vercelUrl =
    normalizeEnvValue(env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeEnvValue(env.VERCEL_URL);

  if (vercelUrl) {
    return toAbsoluteUrl(vercelUrl);
  }

  return "http://localhost:3001";
}

export function getCertificateVerificationUrl(
  certificateId: string,
  env: EnvLike = process.env,
) {
  return `${getAppUrl(env)}/cert/${encodeURIComponent(certificateId)}`;
}
