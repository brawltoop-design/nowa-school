import { redirect } from "next/navigation";

type MockCheckoutPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

const trackingKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ref",
] as const;

export default async function MockCheckoutPage({
  searchParams,
}: MockCheckoutPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const courseSlug = getParam(resolvedSearchParams.course);
  const params = new URLSearchParams();

  if (courseSlug) {
    params.set("course", courseSlug);
  }

  for (const key of trackingKeys) {
    const value = getParam(resolvedSearchParams[key]);

    if (value) {
      params.set(key, value);
    }
  }

  redirect(`/checkout${params.toString() ? `?${params.toString()}` : ""}`);
}
