"use server";

import {
  PaymentMethodKind,
  TariffStatus,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { slugifyCourseTitle } from "@/lib/validators/course";
import {
  PUBLIC_FORM_HONEYPOT_FIELD,
  PUBLIC_FORM_STARTED_AT_FIELD,
} from "@/lib/public-form-security";
import { toMinorUnits } from "@/lib/payments";
import {
  issueOrderRefund,
  simulateMockInstallmentResolution,
  simulateMockPaymentResolution,
  startOrderCheckout,
} from "@/server/billing/service";
import { requireUserRole } from "@/server/auth/session";
import { getPrismaClient } from "@/server/db";
import { guardPublicFormSubmission } from "@/server/public-security";

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeNumber(value: FormDataEntryValue | null, fallback = 0) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return fallback;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePaymentMethod(value: string) {
  switch (value) {
    case "SBP":
      return PaymentMethodKind.SBP;
    case "INSTALLMENT":
      return PaymentMethodKind.INSTALLMENT;
    case "CARD":
    default:
      return PaymentMethodKind.CARD;
  }
}

function revalidateBillingPaths(courseId?: string | null) {
  revalidatePath("/author");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/courses");

  if (courseId) {
    revalidatePath(`/author/courses/${courseId}/studio/pricing`);
    revalidatePath(`/courses/${courseId}`);
  }
}

export async function startPublicCheckoutAction(formData: FormData) {
  const session = await requireUserRole(["STUDENT", "ADMIN"], "/login");

  if (session.user.role === UserRole.AUTHOR) {
    redirect("/forbidden");
  }

  const courseId = normalizeText(formData.get("courseId"));

  if (!courseId) {
    redirect("/courses");
  }

  if (normalizeText(formData.get("checkoutLegalConsent")) !== "on") {
    redirect(`/checkout?course=${encodeURIComponent(courseId)}`);
  }

  try {
    const headerList = await headers();
    await guardPublicFormSubmission({
      headers: headerList,
      scope: "public_checkout",
      extraKey: `${courseId}:${session.user.id}`,
      honeypotValue: normalizeOptionalText(
        formData.get(PUBLIC_FORM_HONEYPOT_FIELD),
      ),
      startedAt: normalizeOptionalText(
        formData.get(PUBLIC_FORM_STARTED_AT_FIELD),
      ),
    });
  } catch {
    redirect(`/checkout?course=${encodeURIComponent(courseId)}`);
  }

  const result = await startOrderCheckout({
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
    courseId,
    tariffId: normalizeOptionalText(formData.get("tariffId")),
    promoCode: normalizeOptionalText(formData.get("promoCode")),
    paymentMethod: normalizePaymentMethod(
      normalizeText(formData.get("paymentMethod")) || "CARD",
    ),
    checkoutSessionKey: normalizeOptionalText(formData.get("checkoutSessionKey")),
    billingFullName: normalizeOptionalText(formData.get("billingFullName")),
    billingEmail: normalizeOptionalText(formData.get("billingEmail")),
    metadata: ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"].reduce<Record<string, unknown>>(
      (acc, key) => {
        const value = normalizeOptionalText(formData.get(key));

        if (value) {
          acc[key] = value;
        }

        return acc;
      },
      {
        legalAcceptedAt: new Date().toISOString(),
        offerAccepted: true,
        refundPolicyAccepted: true,
      },
    ),
  });

  redirect(result.redirectUrl);
}

export async function resolveMockPaymentAction(formData: FormData) {
  const paymentId = normalizeText(formData.get("paymentId"));
  const outcome = normalizeText(formData.get("outcome"));

  if (!paymentId || !["success", "fail"].includes(outcome)) {
    redirect("/courses");
  }

  await simulateMockPaymentResolution({
    paymentId,
    outcome: outcome as "success" | "fail",
  });

  const prisma = getPrismaClient();
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    select: {
      orderId: true,
    },
  });

  if (!payment) {
    redirect("/courses");
  }

  redirect(`/checkout/success?orderId=${encodeURIComponent(payment.orderId)}&state=pending`);
}

export async function resolveMockInstallmentAction(formData: FormData) {
  const installmentPlanId = normalizeText(formData.get("installmentPlanId"));
  const outcome = normalizeText(formData.get("outcome"));

  if (!installmentPlanId || !["approve", "decline"].includes(outcome)) {
    redirect("/courses");
  }

  await simulateMockInstallmentResolution({
    installmentPlanId,
    outcome: outcome as "approve" | "decline",
  });

  const prisma = getPrismaClient();
  const plan = await prisma.installmentPlan.findUnique({
    where: {
      id: installmentPlanId,
    },
    select: {
      orderId: true,
    },
  });

  if (!plan) {
    redirect("/courses");
  }

  redirect(`/checkout/success?orderId=${encodeURIComponent(plan.orderId)}&state=pending`);
}

export async function createTariff(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author");
  const prisma = getPrismaClient();
  const courseId = normalizeText(formData.get("courseId"));
  const title = normalizeText(formData.get("title"));
  const price = normalizeNumber(formData.get("price"), 0);

  if (!courseId || !title || price <= 0) {
    redirect(`/author/courses/${courseId}/studio/pricing`);
  }

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      ...(session.user.role === UserRole.ADMIN ? {} : { authorId: session.user.id }),
    },
    select: {
      id: true,
      currency: true,
    },
  });

  if (!course) {
    redirect("/forbidden");
  }

  const currentCount = await prisma.tariff.count({
    where: {
      courseId,
    },
  });

  await prisma.tariff.create({
    data: {
      courseId,
      title,
      slug: slugifyCourseTitle(title) || `tariff-${Date.now()}`,
      description: normalizeOptionalText(formData.get("description")),
      priceMinor: toMinorUnits(price),
      currency: normalizeOptionalText(formData.get("currency")) ?? course.currency,
      isDefault: currentCount === 0,
      features: (normalizeOptionalText(formData.get("features")) ?? "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      sortOrder: currentCount,
    },
  });

  revalidateBillingPaths(courseId);
}

export async function updateTariff(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author");
  const prisma = getPrismaClient();
  const tariffId = normalizeText(formData.get("tariffId"));
  const title = normalizeText(formData.get("title"));
  const price = normalizeNumber(formData.get("price"), 0);

  if (!tariffId || !title || price <= 0) {
    redirect("/author");
  }

  const existing = await prisma.tariff.findFirst({
    where: {
      id: tariffId,
      course: session.user.role === UserRole.ADMIN ? {} : { authorId: session.user.id },
    },
    select: {
      id: true,
      courseId: true,
    },
  });

  if (!existing) {
    redirect("/forbidden");
  }

  await prisma.tariff.update({
    where: {
      id: existing.id,
    },
    data: {
      title,
      slug: slugifyCourseTitle(title) || `tariff-${Date.now()}`,
      description: normalizeOptionalText(formData.get("description")),
      priceMinor: toMinorUnits(price),
      currency: normalizeOptionalText(formData.get("currency")) ?? "USD",
      features: (normalizeOptionalText(formData.get("features")) ?? "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      isDefault: normalizeText(formData.get("isDefault")) === "true",
    },
  });

  if (normalizeText(formData.get("isDefault")) === "true") {
    await prisma.tariff.updateMany({
      where: {
        courseId: existing.courseId,
        id: {
          not: existing.id,
        },
      },
      data: {
        isDefault: false,
      },
    });
  }

  revalidateBillingPaths(existing.courseId);
}

export async function archiveTariff(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author");
  const prisma = getPrismaClient();
  const tariffId = normalizeText(formData.get("tariffId"));

  if (!tariffId) {
    redirect("/author");
  }

  const existing = await prisma.tariff.findFirst({
    where: {
      id: tariffId,
      course: session.user.role === UserRole.ADMIN ? {} : { authorId: session.user.id },
    },
    select: {
      id: true,
      courseId: true,
    },
  });

  if (!existing) {
    redirect("/forbidden");
  }

  await prisma.tariff.update({
    where: {
      id: existing.id,
    },
    data: {
      status: TariffStatus.ARCHIVED,
      isDefault: false,
    },
  });

  revalidateBillingPaths(existing.courseId);
}

export async function createPromocode(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author");
  const prisma = getPrismaClient();
  const courseId = normalizeOptionalText(formData.get("courseId"));
  const code = normalizeText(formData.get("code")).toUpperCase();
  const discountType = normalizeText(formData.get("discountType"));

  if (!code || !["PERCENT", "FIXED"].includes(discountType)) {
    redirect("/author");
  }

  const course = courseId
    ? await prisma.course.findFirst({
        where: {
          id: courseId,
          ...(session.user.role === UserRole.ADMIN ? {} : { authorId: session.user.id }),
        },
        select: {
          id: true,
          authorId: true,
          currency: true,
        },
      })
    : null;

  if (courseId && !course) {
    redirect("/forbidden");
  }

  await prisma.promocode.create({
    data: {
      authorId: course?.authorId ?? session.user.id,
      courseId: course?.id ?? null,
      tariffId: normalizeOptionalText(formData.get("tariffId")),
      code,
      description: normalizeOptionalText(formData.get("description")),
      discountType: discountType as "PERCENT" | "FIXED",
      percentOff:
        discountType === "PERCENT"
          ? Math.max(1, Math.min(100, Math.round(normalizeNumber(formData.get("percentOff"), 0))))
          : null,
      amountOffMinor:
        discountType === "FIXED"
          ? toMinorUnits(Math.max(0, normalizeNumber(formData.get("amountOff"), 0)))
          : null,
      currency: normalizeOptionalText(formData.get("currency")) ?? course?.currency ?? "USD",
      maxRedemptions: normalizeOptionalText(formData.get("maxRedemptions"))
        ? Math.max(1, Math.round(normalizeNumber(formData.get("maxRedemptions"), 1)))
        : null,
      validFrom: normalizeOptionalText(formData.get("validFrom"))
        ? new Date(normalizeText(formData.get("validFrom")))
        : null,
      validUntil: normalizeOptionalText(formData.get("validUntil"))
        ? new Date(normalizeText(formData.get("validUntil")))
        : null,
      isActive: true,
    },
  });

  revalidateBillingPaths(course?.id ?? null);
}

export async function togglePromocode(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author");
  const prisma = getPrismaClient();
  const promocodeId = normalizeText(formData.get("promocodeId"));

  if (!promocodeId) {
    redirect("/author");
  }

  const existing = await prisma.promocode.findFirst({
    where: {
      id: promocodeId,
      ...(session.user.role === UserRole.ADMIN ? {} : { authorId: session.user.id }),
    },
    select: {
      id: true,
      courseId: true,
      isActive: true,
    },
  });

  if (!existing) {
    redirect("/forbidden");
  }

  await prisma.promocode.update({
    where: {
      id: existing.id,
    },
    data: {
      isActive: !existing.isActive,
    },
  });

  revalidateBillingPaths(existing.courseId);
}

export async function refundOrderAction(formData: FormData) {
  const session = await requireUserRole(["AUTHOR", "ADMIN"], "/author");
  const orderId = normalizeText(formData.get("orderId"));
  const amount = normalizeNumber(formData.get("amount"), 0);
  const courseId = normalizeOptionalText(formData.get("courseId"));

  if (!orderId || amount <= 0) {
    redirect(courseId ? `/author/courses/${courseId}/studio/pricing` : "/author");
  }

  await issueOrderRefund({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    orderId,
    amountMinor: toMinorUnits(amount),
    reason: normalizeOptionalText(formData.get("reason")),
  });

  revalidateBillingPaths(courseId);
}
