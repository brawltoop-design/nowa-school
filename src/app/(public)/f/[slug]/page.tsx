import { notFound, redirect } from "next/navigation";
import { getServerAuthSession } from "@/server/auth/session";
import { startFunnelVisit } from "@/server/funnels/actions";
import {
  findFunnelEntryStep,
  getRuntimeFunnelData,
} from "@/server/funnels/queries";

type FunnelEntryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(
  value: string | string[] | undefined,
  fallback = "",
) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function toUrlSearchParams(
  input: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) {
          params.append(key, item);
        }
      }
      continue;
    }

    if (value) {
      params.set(key, value);
    }
  }

  return params;
}

function getVisitUtmFromSearchParams(searchParams: URLSearchParams) {
  const keys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "ref",
  ] as const;
  const data: Record<string, string> = {};

  for (const key of keys) {
    const value = searchParams.get(key);

    if (value?.trim()) {
      data[key] = value.trim();
    }
  }

  return data;
}

export default async function FunnelEntryPage({
  params,
  searchParams,
}: FunnelEntryPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const preview = getParam(resolvedSearchParams.preview) === "1";
  const session = await getServerAuthSession();

  const runtime = await getRuntimeFunnelData({
    slug,
    preview,
    actor: session?.user
      ? {
          userId: session.user.id,
          role: session.user.role,
        }
      : null,
  });

  if (!runtime) {
    notFound();
  }

  const entryStep = findFunnelEntryStep(runtime.steps, runtime.funnel.entryStepId);

  if (!entryStep) {
    notFound();
  }

  const visit = await startFunnelVisit({
    funnelId: runtime.funnel.id,
    entryStepId: entryStep.id,
    userId: session?.user?.id ?? null,
    utm: getVisitUtmFromSearchParams(toUrlSearchParams(resolvedSearchParams)),
  });

  const nextSearchParams = new URLSearchParams({
    visit: visit.id,
  });

  if (preview) {
    nextSearchParams.set("preview", "1");
  }

  redirect(`/f/${slug}/${entryStep.key}?${nextSearchParams.toString()}`);
}
