"use server";

import {
  CourseStatus,
  InstallmentGatewayProvider,
  InstallmentPlanStatus,
  OrderStatus,
  PaymentFlowType,
  PaymentGatewayProvider,
  PaymentMethodKind,
  PaymentRecordStatus,
  Prisma,
  RefundStatus,
  TariffStatus,
  UserRole,
  type Promocode,
} from "@prisma/client";
import { randomUUID } from "crypto";
import {
  calculateAuthorRevenueMinor,
  calculatePlatformFeeMinor,
  fromMinorUnits,
  toMinorUnits,
} from "@/lib/payments";
import {
  buildFunnelStepHref,
  coerceFunnelTransitions,
  resolveNextStepKey,
} from "@/lib/funnels";
import {
  createSignedMockInstallmentPayload,
  createSignedMockPaymentPayload,
  getConfiguredInstallmentProviderKey,
  getConfiguredPaymentProviderKey,
  getInstallmentProvider,
  getPaymentProvider,
} from "@/server/billing/providers";
import { recordContactLifecycleEvent } from "@/server/automations/engine";
import { getAppUrl } from "@/server/app-url";
import { getPrismaClient } from "@/server/db";
import { recordPlatformEvent } from "@/server/events";

type DbClient = Prisma.TransactionClient | ReturnType<typeof getPrismaClient>;

const OPEN_ORDER_REUSE_WINDOW_MS = 30 * 60_000;

type CheckoutTariffOption = {
  id: string | null;
  title: string;
  description: string | null;
  currency: string;
  priceMinor: number;
  features: string[];
  isDefault: boolean;
  isFallback: boolean;
};

export type CheckoutPageData = {
  course: {
    id: string;
    slug: string;
    title: string;
    description: string;
    category: string;
    level: string;
    currency: string;
    authorName: string;
    viewer: {
      isEnrolled: boolean;
    };
    tariffs: CheckoutTariffOption[];
  };
};

export type StartCheckoutInput = {
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  courseId: string;
  tariffId?: string | null;
  promoCode?: string | null;
  paymentMethod: PaymentMethodKind;
  checkoutSessionKey?: string | null;
  funnelId?: string | null;
  funnelStepId?: string | null;
  funnelVisitId?: string | null;
  orderBumpTitle?: string | null;
  orderBumpAmountMinor?: number;
  billingFullName?: string | null;
  billingEmail?: string | null;
  offerUrl?: string | null;
  refundPolicyUrl?: string | null;
  metadata?: Record<string, unknown>;
};

export type StartCheckoutResult =
  | {
      state: "already-owned";
      orderId: string | null;
      redirectUrl: string;
    }
  | {
      state: "redirect";
      orderId: string;
      redirectUrl: string;
    };

export type CheckoutReturnState =
  | "paid"
  | "already-owned"
  | "pending"
  | "failed"
  | "refunded";

export type CheckoutReturnStateData = {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  courseDescription: string;
  state: CheckoutReturnState;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  autoRedirectHref: string | null;
  orderId: string | null;
};

function toInputJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function asRecord(value: Prisma.JsonValue | null | undefined) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function minorToDecimal(valueMinor: number) {
  return new Prisma.Decimal(fromMinorUnits(valueMinor));
}

function sanitizeWebhookPayload(payload: Record<string, unknown>) {
  const data = asRecord(payload.data as Prisma.JsonValue | null | undefined);

  return {
    id: typeof payload.id === "string" ? payload.id : null,
    type: typeof payload.type === "string" ? payload.type : null,
    data: {
      providerPaymentId:
        typeof data.providerPaymentId === "string" ? data.providerPaymentId : null,
      providerPlanId:
        typeof data.providerPlanId === "string" ? data.providerPlanId : null,
      providerRefundId:
        typeof data.providerRefundId === "string" ? data.providerRefundId : null,
      amountMinor: typeof data.amountMinor === "number" ? data.amountMinor : null,
      currency: typeof data.currency === "string" ? data.currency : null,
      reason: typeof data.reason === "string" ? data.reason : null,
      metadata:
        data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
          ? data.metadata
          : {},
    },
  };
}

function getCheckoutSuccessUrl(orderId: string) {
  return `${getAppUrl()}/checkout/success?orderId=${encodeURIComponent(orderId)}&state=pending`;
}

function getCourseCheckoutHref(courseSlug: string) {
  return `/checkout?course=${encodeURIComponent(courseSlug)}`;
}

function buildFallbackTariff(course: {
  title: string;
  price: Prisma.Decimal;
  currency: string;
}): CheckoutTariffOption {
  return {
    id: null,
    title: "Стандарт",
    description: `Базовый тариф для курса ${course.title}.`,
    currency: course.currency,
    priceMinor: toMinorUnits(Number(course.price)),
    features: [],
    isDefault: true,
    isFallback: true,
  };
}

function mapTariffFeatures(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

async function getActiveTariffs(
  tx: DbClient,
  course: {
    id: string;
    title: string;
    price: Prisma.Decimal;
    currency: string;
  },
) {
  const tariffs = await tx.tariff.findMany({
    where: {
      courseId: course.id,
      status: TariffStatus.ACTIVE,
    },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  if (!tariffs.length) {
    return [buildFallbackTariff(course)];
  }

  return tariffs.map((tariff) => ({
    id: tariff.id,
    title: tariff.title,
    description: tariff.description,
    currency: tariff.currency,
    priceMinor: tariff.priceMinor,
    features: mapTariffFeatures(tariff.features),
    isDefault: tariff.isDefault,
    isFallback: false,
  }));
}

async function resolveTariffSelection(
  tx: DbClient,
  course: {
    id: string;
    title: string;
    price: Prisma.Decimal;
    currency: string;
  },
  tariffId?: string | null,
) {
  const options = await getActiveTariffs(tx, course);
  const selected =
    (tariffId ? options.find((item) => item.id === tariffId) : null) ??
    options.find((item) => item.isDefault) ??
    options[0];

  return selected;
}

function computePromocodeDiscountMinor(
  promo: Promocode,
  subtotalMinor: number,
  currency: string,
) {
  if (promo.discountType === "PERCENT") {
    const percent = Math.max(0, Math.min(100, promo.percentOff ?? 0));
    return Math.min(subtotalMinor, Math.round((subtotalMinor * percent) / 100));
  }

  if (promo.currency && promo.currency !== currency) {
    return 0;
  }

  return Math.min(subtotalMinor, promo.amountOffMinor ?? 0);
}

async function resolvePromocode(
  tx: DbClient,
  input: {
    authorId: string;
    courseId: string;
    tariffId?: string | null;
    code?: string | null;
    subtotalMinor: number;
    currency: string;
  },
) {
  const normalized = input.code?.trim().toUpperCase();

  if (!normalized) {
    return {
      promocode: null,
      discountMinor: 0,
    };
  }

  const now = new Date();
  const promo = await tx.promocode.findUnique({
    where: {
      code: normalized,
    },
  });

  if (!promo || promo.authorId !== input.authorId || !promo.isActive) {
    return {
      promocode: null,
      discountMinor: 0,
    };
  }

  if (promo.validFrom && promo.validFrom > now) {
    return {
      promocode: null,
      discountMinor: 0,
    };
  }

  if (promo.validUntil && promo.validUntil < now) {
    return {
      promocode: null,
      discountMinor: 0,
    };
  }

  if (promo.maxRedemptions != null && promo.redemptionsCount >= promo.maxRedemptions) {
    return {
      promocode: null,
      discountMinor: 0,
    };
  }

  if (promo.courseId && promo.courseId !== input.courseId) {
    return {
      promocode: null,
      discountMinor: 0,
    };
  }

  if (promo.tariffId && promo.tariffId !== input.tariffId) {
    return {
      promocode: null,
      discountMinor: 0,
    };
  }

  return {
    promocode: promo,
    discountMinor: computePromocodeDiscountMinor(
      promo,
      input.subtotalMinor,
      input.currency,
    ),
  };
}

async function createBillingAuditLog(
  tx: DbClient,
  input: {
    authorId: string;
    type:
      | "ORDER_CREATED"
      | "CHECKOUT_START"
      | "PAYMENT_PENDING"
      | "PAYMENT_SUCCEEDED"
      | "PAYMENT_FAILED"
      | "INSTALLMENT_SELECTED"
      | "REFUND_ISSUED"
      | "ACCESS_GRANTED";
    orderId?: string | null;
    paymentId?: string | null;
    installmentPlanId?: string | null;
    refundId?: string | null;
    message?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const created = await tx.billingAuditLog.create({
    data: {
      authorId: input.authorId,
      type: input.type,
      orderId: input.orderId ?? null,
      paymentId: input.paymentId ?? null,
      installmentPlanId: input.installmentPlanId ?? null,
      refundId: input.refundId ?? null,
      message: input.message ?? null,
      metadata: toInputJson(input.metadata ?? {}),
    },
  });

  let orderContext:
    | {
        contactId: string | null;
        courseId: string;
      }
    | undefined;

  if (input.orderId) {
    orderContext = await tx.order.findUnique({
      where: {
        id: input.orderId,
      },
      select: {
        contactId: true,
        courseId: true,
      },
    }) ?? undefined;
  }

  await recordPlatformEvent(
    {
      ownerId: input.authorId,
      contactId: orderContext?.contactId ?? null,
      courseId: orderContext?.courseId ?? null,
      orderId: input.orderId ?? null,
      source: "billing",
      name: input.type,
      eventKey: created.id,
      metadata: {
        paymentId: input.paymentId ?? null,
        installmentPlanId: input.installmentPlanId ?? null,
        refundId: input.refundId ?? null,
        message: input.message ?? null,
        ...(input.metadata ?? {}),
      },
      timestamp: created.createdAt,
    },
    tx,
  );
}

async function ensureEnrollmentForOrder(
  tx: DbClient,
  order: {
    id: string;
    userId: string;
    courseId: string;
    course: {
      authorId: string;
    };
  },
) {
  const existing = await tx.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: order.userId,
        courseId: order.courseId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    await tx.enrollment.create({
      data: {
        userId: order.userId,
        courseId: order.courseId,
      },
    });
  }

  await createBillingAuditLog(tx, {
    authorId: order.course.authorId,
    orderId: order.id,
    type: "ACCESS_GRANTED",
    message: "Enrollment granted after confirmed payment.",
  });
}

async function ensurePayoutForOrder(
  tx: DbClient,
  order: {
    id: string;
    course: {
      authorId: string;
    };
    authorRevenueMinor: number;
    currency: string;
  },
) {
  await tx.payout.upsert({
    where: {
      orderId: order.id,
    },
    update: {
      amountMinor: order.authorRevenueMinor,
      currency: order.currency,
      status: "PENDING",
    },
    create: {
      authorId: order.course.authorId,
      orderId: order.id,
      amountMinor: order.authorRevenueMinor,
      currency: order.currency,
      status: "PENDING",
      scheduledAt: new Date(),
    },
  });
}

async function consumePromocodeIfNeeded(
  tx: DbClient,
  order: {
    promocodeId: string | null;
  },
) {
  if (!order.promocodeId) {
    return;
  }

  await tx.promocode.update({
    where: {
      id: order.promocodeId,
    },
    data: {
      redemptionsCount: {
        increment: 1,
      },
    },
  });
}

async function findReusableOrder(
  tx: DbClient,
  input: {
    userId: string;
    courseId: string;
    checkoutSessionKey?: string | null;
    tariffId?: string | null;
    paymentFlow: PaymentFlowType;
  },
) {
  if (input.checkoutSessionKey) {
    return tx.order.findUnique({
      where: {
        checkoutSessionKey: input.checkoutSessionKey,
      },
      include: {
        payments: {
          orderBy: [{ createdAt: "desc" }],
        },
        installmentPlan: true,
      },
    });
  }

  return tx.order.findFirst({
    where: {
      userId: input.userId,
      courseId: input.courseId,
      tariffId: input.tariffId ?? null,
      paymentFlow: input.paymentFlow,
      status: OrderStatus.PENDING,
      createdAt: {
        gte: new Date(Date.now() - OPEN_ORDER_REUSE_WINDOW_MS),
      },
    },
    orderBy: [{ createdAt: "desc" }],
    include: {
      payments: {
        orderBy: [{ createdAt: "desc" }],
      },
      installmentPlan: true,
    },
  });
}

function getReturnStateForOrder(order: {
  status: OrderStatus;
  refundedMinor: number;
  amountMinor: number;
  payments: Array<{
    status: PaymentRecordStatus;
  }>;
}) {
  if (order.status === OrderStatus.REFUNDED || order.refundedMinor >= order.amountMinor) {
    return "refunded" as const;
  }

  if (order.status === OrderStatus.PAID) {
    return "paid" as const;
  }

  if (order.payments.some((payment) => payment.status === PaymentRecordStatus.FAILED)) {
    return "failed" as const;
  }

  return "pending" as const;
}

function getFunnelContinuationHref(input: {
  state: CheckoutReturnState;
  funnelSlug: string | null;
  visitId: string | null;
  checkoutStepKey: string | null;
  transitions: Prisma.JsonValue | null | undefined;
}) {
  if (!input.funnelSlug || !input.checkoutStepKey) {
    return null;
  }

  if (input.state === "paid" || input.state === "already-owned") {
    const transitions = coerceFunnelTransitions(input.transitions);
    const nextStepKey =
      input.state === "already-owned"
        ? resolveNextStepKey(transitions, "alreadyOwned") ||
          resolveNextStepKey(transitions, "paid")
        : resolveNextStepKey(transitions, "paid");

    if (!nextStepKey) {
      return null;
    }

    return buildFunnelStepHref(input.funnelSlug, nextStepKey, {
      visitId: input.visitId ?? undefined,
    });
  }

  if (input.state === "failed") {
    return buildFunnelStepHref(input.funnelSlug, input.checkoutStepKey, {
      visitId: input.visitId ?? undefined,
    });
  }

  return null;
}

async function settlePaidOrder(
  prisma: ReturnType<typeof getPrismaClient>,
  input: {
    orderId: string;
    paymentId: string;
    source: "payment" | "installment";
    metadata?: Record<string, unknown>;
  },
) {
  const settlement = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: input.orderId,
      },
      include: {
        course: {
          select: {
            authorId: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    const payment = await tx.payment.findUnique({
      where: {
        id: input.paymentId,
      },
    });

    if (!payment) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    const wasPaid = order.status === OrderStatus.PAID;

    if (payment.status !== PaymentRecordStatus.SUCCEEDED) {
      await tx.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: PaymentRecordStatus.SUCCEEDED,
          confirmedAt: new Date(),
          failureCode: null,
          failureMessage: null,
          metadata: toInputJson({
            ...asRecord(payment.metadata),
            ...(input.metadata ?? {}),
          }),
        },
      });
    }

    if (!wasPaid) {
      await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: OrderStatus.PAID,
          paidAt: new Date(),
          paymentProvider: payment.provider,
          paymentId: payment.providerPaymentId ?? payment.id,
          metadata: toInputJson({
            ...asRecord(order.metadata),
            paidSource: input.source,
          }),
        },
      });
    }

    await ensureEnrollmentForOrder(tx, order);
    await ensurePayoutForOrder(tx, order);

    if (!wasPaid) {
      await consumePromocodeIfNeeded(tx, order);
      await createBillingAuditLog(tx, {
        authorId: order.course.authorId,
        orderId: order.id,
        paymentId: payment.id,
        type: "PAYMENT_SUCCEEDED",
        message: `Order confirmed from ${input.source} webhook.`,
        metadata: input.metadata,
      });
    }

    return {
      orderId: order.id,
      courseId: order.courseId,
      authorId: order.course.authorId,
      userId: order.user.id,
      userName: order.user.name,
      userEmail: order.user.email,
      shouldRecordPurchaseEvent: !wasPaid,
    };
  });

  if (settlement.shouldRecordPurchaseEvent) {
    await recordContactLifecycleEvent({
      authorId: settlement.authorId,
      courseId: settlement.courseId,
      orderId: settlement.orderId,
      eventKey: `purchase:${settlement.orderId}`,
      type: "COURSE_PURCHASED",
      metadata: {
        source: input.source,
      },
      contact: {
        userId: settlement.userId,
        fullName: settlement.userName,
        email: settlement.userEmail,
        source: "checkout_provider",
        isStudent: true,
      },
    });
  }
}

async function applyRefundSettlement(
  prisma: ReturnType<typeof getPrismaClient>,
  input: {
    orderId: string;
    paymentId: string;
    refundId: string;
    amountMinor: number;
    providerRefundId: string;
    metadata?: Record<string, unknown>;
  },
) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: input.orderId,
      },
      include: {
        course: {
          select: {
            authorId: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    const refund = await tx.refund.findUnique({
      where: {
        id: input.refundId,
      },
    });

    if (!refund) {
      throw new Error("REFUND_NOT_FOUND");
    }

    const payment = await tx.payment.findUnique({
      where: {
        id: input.paymentId,
      },
    });

    if (!payment) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    const nextRefundedMinor = Math.min(order.amountMinor, order.refundedMinor + input.amountMinor);
    const fullyRefunded = nextRefundedMinor >= order.amountMinor;

    await tx.refund.update({
      where: {
        id: refund.id,
      },
      data: {
        status: RefundStatus.SUCCEEDED,
        providerRefundId: input.providerRefundId,
        processedAt: new Date(),
        metadata: toInputJson({
          ...asRecord(refund.metadata),
          ...(input.metadata ?? {}),
        }),
      },
    });

    await tx.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: fullyRefunded
          ? PaymentRecordStatus.REFUNDED
          : PaymentRecordStatus.PARTIALLY_REFUNDED,
        refundedAt: fullyRefunded ? new Date() : payment.refundedAt,
      },
    });

    await tx.order.update({
      where: {
        id: order.id,
      },
      data: {
        refundedMinor: nextRefundedMinor,
        status: fullyRefunded ? OrderStatus.REFUNDED : order.status,
      },
    });

    if (fullyRefunded) {
      const otherPaidOrder = await tx.order.findFirst({
        where: {
          id: {
            not: order.id,
          },
          userId: order.userId,
          courseId: order.courseId,
          status: OrderStatus.PAID,
        },
        select: {
          id: true,
        },
      });

      if (!otherPaidOrder) {
        await tx.enrollment.deleteMany({
          where: {
            userId: order.userId,
            courseId: order.courseId,
          },
        });
      }
    }

    const payout = await tx.payout.findUnique({
      where: {
        orderId: order.id,
      },
    });

    if (payout && payout.status === "PENDING") {
      const refundAuthorRevenueMinor = calculateAuthorRevenueMinor(input.amountMinor);
      const nextPayoutMinor = Math.max(0, payout.amountMinor - refundAuthorRevenueMinor);

      await tx.payout.update({
        where: {
          id: payout.id,
        },
        data: {
          amountMinor: nextPayoutMinor,
          status: nextPayoutMinor === 0 ? "REVERSED" : payout.status,
          reversedAt: nextPayoutMinor === 0 ? new Date() : payout.reversedAt,
        },
      });
    }

    await createBillingAuditLog(tx, {
      authorId: order.course.authorId,
      orderId: order.id,
      paymentId: payment.id,
      refundId: refund.id,
      type: "REFUND_ISSUED",
      message: fullyRefunded ? "Full refund processed." : "Partial refund processed.",
      metadata: {
        amountMinor: input.amountMinor,
        providerRefundId: input.providerRefundId,
      },
    });
  });
}

async function markPaymentFailed(
  prisma: ReturnType<typeof getPrismaClient>,
  input: {
    paymentId: string;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: {
        id: input.paymentId,
      },
      include: {
        order: {
          include: {
            course: {
              select: {
                authorId: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    await tx.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: PaymentRecordStatus.FAILED,
        failedAt: new Date(),
        failureMessage: input.reason ?? "Provider marked the payment as failed.",
        metadata: toInputJson({
          ...asRecord(payment.metadata),
          ...(input.metadata ?? {}),
        }),
      },
    });

    await createBillingAuditLog(tx, {
      authorId: payment.order.course.authorId,
      orderId: payment.order.id,
      paymentId: payment.id,
      type: "PAYMENT_FAILED",
      message: input.reason ?? "Payment failed.",
    });
  });
}

function normalizePaymentProviderKey(value: string) {
  return value.toUpperCase() === PaymentGatewayProvider.STRIPE
    ? PaymentGatewayProvider.STRIPE
    : PaymentGatewayProvider.MOCK;
}

function normalizeInstallmentProviderKey(value: string) {
  return value.toUpperCase() === InstallmentGatewayProvider.TINKOFF
    ? InstallmentGatewayProvider.TINKOFF
    : InstallmentGatewayProvider.MOCK;
}

export async function getCheckoutPageData(
  courseSlug: string,
  userId?: string | null,
): Promise<CheckoutPageData | null> {
  const prisma = getPrismaClient();
  const course = await prisma.course.findFirst({
    where: {
      slug: courseSlug,
      status: CourseStatus.PUBLISHED,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      category: true,
      level: true,
      price: true,
      currency: true,
      author: {
        select: {
          name: true,
        },
      },
      ...(userId
        ? {
            enrollments: {
              where: {
                userId,
              },
              select: {
                id: true,
              },
              take: 1,
            },
          }
        : {}),
    },
  });

  if (!course) {
    return null;
  }

  const tariffs = await getActiveTariffs(prisma, course);

  return {
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level,
      currency: course.currency,
      authorName: course.author.name,
      viewer: {
        isEnrolled:
          "enrollments" in course && Array.isArray(course.enrollments)
            ? Boolean(course.enrollments.length)
            : false,
      },
      tariffs,
    },
  };
}

export async function startOrderCheckout(
  input: StartCheckoutInput,
): Promise<StartCheckoutResult> {
  const prisma = getPrismaClient();
  const flow =
    input.paymentMethod === PaymentMethodKind.INSTALLMENT
      ? PaymentFlowType.INSTALLMENT
      : PaymentFlowType.FULL;

  const created = await prisma.$transaction(async (tx) => {
    const course = await tx.course.findUnique({
      where: {
        id: input.courseId,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        status: true,
        authorId: true,
        price: true,
        currency: true,
      },
    });

    if (!course || course.status !== CourseStatus.PUBLISHED) {
      throw new Error("COURSE_NOT_AVAILABLE");
    }

    const existingEnrollment = await tx.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: input.userId,
          courseId: course.id,
        },
      },
      select: {
        id: true,
      },
    });

    const existingPaidOrder = await tx.order.findFirst({
      where: {
        userId: input.userId,
        courseId: course.id,
        status: OrderStatus.PAID,
      },
      select: {
        id: true,
      },
    });

    if (existingEnrollment || existingPaidOrder) {
      return {
        state: "already-owned" as const,
        orderId: existingPaidOrder?.id ?? null,
        redirectUrl: `/checkout/success?courseId=${encodeURIComponent(course.id)}&state=already-owned`,
        shouldRecordCheckoutEvent: false,
      };
    }

    const selectedTariff = await resolveTariffSelection(tx, course, input.tariffId);
    const subtotalMinor =
      selectedTariff.priceMinor + Math.max(0, input.orderBumpAmountMinor ?? 0);
    const promo = await resolvePromocode(tx, {
      authorId: course.authorId,
      courseId: course.id,
      tariffId: selectedTariff.id,
      code: input.promoCode,
      subtotalMinor,
      currency: selectedTariff.currency,
    });
    const amountMinor = Math.max(0, subtotalMinor - promo.discountMinor);
    const platformFeeMinor = calculatePlatformFeeMinor(amountMinor);
    const authorRevenueMinor = calculateAuthorRevenueMinor(amountMinor);

    const existingOrder = await findReusableOrder(tx, {
      userId: input.userId,
      courseId: course.id,
      checkoutSessionKey: input.checkoutSessionKey,
      tariffId: selectedTariff.id,
      paymentFlow: flow,
    });

    if (existingOrder) {
      const primaryPayment = existingOrder.payments[0] ?? null;

      if (existingOrder.status === OrderStatus.PAID) {
        return {
          state: "already-owned" as const,
          orderId: existingOrder.id,
          redirectUrl: `/checkout/success?orderId=${encodeURIComponent(existingOrder.id)}&state=paid`,
          shouldRecordCheckoutEvent: false,
        };
      }

      if (flow === PaymentFlowType.INSTALLMENT && existingOrder.installmentPlan?.redirectUrl) {
        return {
          state: "redirect" as const,
          orderId: existingOrder.id,
          redirectUrl: existingOrder.installmentPlan.redirectUrl,
          shouldRecordCheckoutEvent: false,
        };
      }

      if (primaryPayment?.confirmationUrl) {
        return {
          state: "redirect" as const,
          orderId: existingOrder.id,
          redirectUrl: primaryPayment.confirmationUrl,
          shouldRecordCheckoutEvent: false,
        };
      }
    }

    const order = await tx.order.create({
      data: {
        userId: input.userId,
        courseId: course.id,
        tariffId: selectedTariff.id,
        promocodeId: promo.promocode?.id ?? null,
        funnelId: input.funnelId ?? null,
        funnelStepId: input.funnelStepId ?? null,
        funnelVisitId: input.funnelVisitId ?? null,
        currency: selectedTariff.currency,
        subtotalMinor,
        discountMinor: promo.discountMinor,
        amountMinor,
        platformFeeMinor,
        authorRevenueMinor,
        amount: minorToDecimal(amountMinor),
        platformFee: minorToDecimal(platformFeeMinor),
        authorRevenue: minorToDecimal(authorRevenueMinor),
        paymentFlow: flow,
        paymentMethod: input.paymentMethod,
        checkoutSessionKey: input.checkoutSessionKey ?? null,
        productTitleSnapshot: course.title,
        tariffTitleSnapshot: selectedTariff.title,
        promocodeSnapshot: promo.promocode?.code ?? null,
        offerUrl: input.offerUrl ?? `/courses/${course.slug}`,
        refundPolicyUrl: input.refundPolicyUrl ?? `/courses/${course.slug}#refunds`,
        billingFullName: input.billingFullName ?? input.userName ?? null,
        billingEmail: input.billingEmail ?? input.userEmail ?? null,
        orderBumpSelected: Boolean(input.orderBumpAmountMinor),
        orderBumpTitle: input.orderBumpTitle ?? null,
        orderBumpAmount:
          input.orderBumpAmountMinor && input.orderBumpAmountMinor > 0
            ? minorToDecimal(input.orderBumpAmountMinor)
            : null,
        metadata: toInputJson(input.metadata ?? {}),
      },
    });

    const paymentProviderKey = getConfiguredPaymentProviderKey();
    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        provider: paymentProviderKey,
        method: input.paymentMethod,
        status:
          flow === PaymentFlowType.FULL
            ? PaymentRecordStatus.REQUIRES_ACTION
            : PaymentRecordStatus.PENDING,
        amountMinor,
        currency: selectedTariff.currency,
        idempotencyKey: `payment:${order.id}`,
      },
    });

    await createBillingAuditLog(tx, {
      authorId: course.authorId,
      orderId: order.id,
      paymentId: payment.id,
      type: "ORDER_CREATED",
      message: "Checkout created a pending order.",
      metadata: {
        tariffId: selectedTariff.id,
        promoCode: promo.promocode?.code ?? null,
        amountMinor,
      },
    });

    await createBillingAuditLog(tx, {
      authorId: course.authorId,
      orderId: order.id,
      paymentId: payment.id,
      type: "CHECKOUT_START",
      message: "Checkout was started.",
      metadata: {
        flow,
        paymentMethod: input.paymentMethod,
      },
    });

    if (flow === PaymentFlowType.INSTALLMENT) {
      const installmentProviderKey = getConfiguredInstallmentProviderKey();
      const installmentProvider = getInstallmentProvider(installmentProviderKey);
      const installmentPlan = await tx.installmentPlan.create({
        data: {
          orderId: order.id,
          provider: installmentProviderKey,
          status: InstallmentPlanStatus.PENDING,
        },
      });
      const planResult = await installmentProvider.createPlan({
        orderId: order.id,
        installmentPlanId: installmentPlan.id,
        amountMinor,
        currency: selectedTariff.currency,
        courseTitle: course.title,
        buyerEmail: input.billingEmail ?? input.userEmail ?? null,
        buyerName: input.billingFullName ?? input.userName ?? null,
        successUrl: getCheckoutSuccessUrl(order.id),
        cancelUrl: `${getAppUrl()}/checkout?course=${encodeURIComponent(course.slug)}`,
      });

      await tx.installmentPlan.update({
        where: {
          id: installmentPlan.id,
        },
        data: {
          providerPlanId: planResult.providerPlanId,
          redirectUrl: planResult.redirectUrl,
          metadata: toInputJson(planResult.metadata ?? {}),
        },
      });

      await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          paymentProvider: paymentProviderKey,
          paymentId: payment.id,
          installmentProvider: installmentProviderKey,
        },
      });

      await createBillingAuditLog(tx, {
        authorId: course.authorId,
        orderId: order.id,
        paymentId: payment.id,
        installmentPlanId: installmentPlan.id,
        type: "INSTALLMENT_SELECTED",
        message: "Installment checkout selected.",
      });

      await createBillingAuditLog(tx, {
        authorId: course.authorId,
        orderId: order.id,
        paymentId: payment.id,
        installmentPlanId: installmentPlan.id,
        type: "PAYMENT_PENDING",
        message: "Pending installment confirmation.",
      });

      return {
        state: "redirect" as const,
        orderId: order.id,
        redirectUrl: planResult.redirectUrl,
        shouldRecordCheckoutEvent: true,
        authorId: course.authorId,
        courseId: course.id,
        courseSlug: course.slug,
      };
    }

    const paymentProvider = getPaymentProvider(paymentProviderKey);
    const paymentResult = await paymentProvider.createPayment({
      orderId: order.id,
      paymentId: payment.id,
      amountMinor,
      currency: selectedTariff.currency,
      method: input.paymentMethod,
      courseTitle: course.title,
      buyerEmail: input.billingEmail ?? input.userEmail ?? null,
      buyerName: input.billingFullName ?? input.userName ?? null,
      successUrl: getCheckoutSuccessUrl(order.id),
      cancelUrl: `${getAppUrl()}/checkout?course=${encodeURIComponent(course.slug)}`,
    });

    await tx.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        providerPaymentId: paymentResult.providerPaymentId,
        providerSessionId: paymentResult.providerSessionId ?? null,
        confirmationUrl: paymentResult.confirmationUrl,
        status:
          paymentResult.initialStatus === "REQUIRES_ACTION"
            ? PaymentRecordStatus.REQUIRES_ACTION
            : PaymentRecordStatus.PENDING,
        metadata: toInputJson(paymentResult.metadata ?? {}),
      },
    });

    await tx.order.update({
      where: {
        id: order.id,
      },
      data: {
        paymentProvider: paymentProviderKey,
        paymentId: paymentResult.providerPaymentId,
      },
    });

    await createBillingAuditLog(tx, {
      authorId: course.authorId,
      orderId: order.id,
      paymentId: payment.id,
      type: "PAYMENT_PENDING",
      message: "Payment created and waiting for provider confirmation.",
      metadata: {
        provider: paymentProviderKey,
        method: input.paymentMethod,
      },
    });

    return {
      state: "redirect" as const,
      orderId: order.id,
      redirectUrl: paymentResult.confirmationUrl,
      shouldRecordCheckoutEvent: true,
      authorId: course.authorId,
      courseId: course.id,
      courseSlug: course.slug,
    };
  });

  if (
    created.state === "redirect" &&
    created.shouldRecordCheckoutEvent &&
    created.orderId &&
    "authorId" in created &&
    typeof created.authorId === "string" &&
    "courseId" in created &&
    typeof created.courseId === "string"
  ) {
    await recordContactLifecycleEvent({
      authorId: created.authorId,
      courseId: created.courseId,
      orderId: created.orderId,
      type: "CHECKOUT_STARTED",
      eventKey: `checkout:${created.orderId}`,
      metadata: input.metadata ?? {},
      contact: {
        userId: input.userId,
        fullName: input.billingFullName ?? input.userName ?? null,
        email: input.billingEmail ?? input.userEmail ?? null,
        source:
          typeof input.metadata?.utm_source === "string"
            ? input.metadata.utm_source
            : input.funnelId
              ? `funnel:${input.funnelId}`
              : "checkout",
        isStudent: false,
      },
    });
  }

  return created;
}

async function storeWebhookEvent(
  tx: Prisma.TransactionClient,
  input: {
    scope: "PAYMENT" | "INSTALLMENT";
    provider: string;
    externalEventId: string;
    type: string;
    payload: Record<string, unknown>;
    signatureVerified: boolean;
  },
) {
  const existing = await tx.providerWebhookEvent.findUnique({
    where: {
      scope_provider_externalEventId: {
        scope: input.scope,
        provider: input.provider,
        externalEventId: input.externalEventId,
      },
    },
  });

  if (existing?.processedAt) {
    return {
      event: existing,
      alreadyProcessed: true,
    };
  }

  const event = existing
    ? await tx.providerWebhookEvent.update({
        where: {
          id: existing.id,
        },
        data: {
          type: input.type,
          payload: toInputJson(input.payload),
          signatureVerified: input.signatureVerified,
        },
      })
    : await tx.providerWebhookEvent.create({
        data: {
          scope: input.scope,
          provider: input.provider,
          externalEventId: input.externalEventId,
          type: input.type,
          payload: toInputJson(input.payload),
          signatureVerified: input.signatureVerified,
        },
      });

  return {
    event,
    alreadyProcessed: false,
  };
}

export async function processPaymentWebhook(input: {
  provider: string;
  rawBody: string;
  signatureHeader: string | null;
}) {
  const providerKey = normalizePaymentProviderKey(input.provider);
  const provider = getPaymentProvider(providerKey);
  const parsed = await provider.verifyAndParseWebhook({
    rawBody: input.rawBody,
    signatureHeader: input.signatureHeader,
  });
  const prisma = getPrismaClient();

  const stored = await prisma.$transaction(async (tx) => {
    const storedEvent = await storeWebhookEvent(tx, {
      scope: "PAYMENT",
      provider: providerKey,
      externalEventId: parsed.externalEventId,
      type: parsed.type,
      payload: sanitizeWebhookPayload(
        JSON.parse(input.rawBody) as Record<string, unknown>,
      ),
      signatureVerified: true,
    });

    const payment = await tx.payment.findFirst({
      where: {
        provider: providerKey,
        providerPaymentId: parsed.providerPaymentId,
      },
      include: {
        order: {
          include: {
            course: {
              select: {
                authorId: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      await tx.providerWebhookEvent.update({
        where: {
          id: storedEvent.event.id,
        },
        data: {
          processedAt: new Date(),
          errorMessage: "PAYMENT_NOT_FOUND",
        },
      });

      throw new Error("PAYMENT_NOT_FOUND");
    }

    await tx.providerWebhookEvent.update({
      where: {
        id: storedEvent.event.id,
      },
      data: {
        orderId: payment.orderId,
        paymentId: payment.id,
      },
    });

    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      type: parsed.type,
      reason: parsed.reason ?? null,
      providerRefundId: parsed.providerRefundId ?? null,
      alreadyProcessed: storedEvent.alreadyProcessed,
      authorId: payment.order.course.authorId,
    };
  });

  if (stored.alreadyProcessed) {
    return {
      ok: true,
      duplicated: true,
    };
  }

  if (stored.type === "payment.succeeded") {
    await settlePaidOrder(prisma, {
      orderId: stored.orderId,
      paymentId: stored.paymentId,
      source: "payment",
    });
  } else if (stored.type === "payment.failed") {
    await markPaymentFailed(prisma, {
      paymentId: stored.paymentId,
      reason: stored.reason,
    });
  } else if (stored.type === "refund.succeeded" && stored.providerRefundId) {
    const refund = await prisma.refund.findFirst({
      where: {
        providerRefundId: stored.providerRefundId,
      },
      select: {
        id: true,
        amountMinor: true,
      },
    });

    if (refund) {
      await applyRefundSettlement(prisma, {
        orderId: stored.orderId,
        paymentId: stored.paymentId,
        refundId: refund.id,
        amountMinor: refund.amountMinor,
        providerRefundId: stored.providerRefundId,
      });
    }
  }

  await prisma.providerWebhookEvent.updateMany({
    where: {
      scope: "PAYMENT",
      provider: normalizePaymentProviderKey(input.provider),
      externalEventId: parsed.externalEventId,
    },
    data: {
      processedAt: new Date(),
    },
  });

  return {
    ok: true,
    duplicated: false,
  };
}

export async function processInstallmentWebhook(input: {
  provider: string;
  rawBody: string;
  signatureHeader: string | null;
}) {
  const providerKey = normalizeInstallmentProviderKey(input.provider);
  const provider = getInstallmentProvider(providerKey);
  const parsed = await provider.verifyAndParseWebhook({
    rawBody: input.rawBody,
    signatureHeader: input.signatureHeader,
  });
  const prisma = getPrismaClient();

  const stored = await prisma.$transaction(async (tx) => {
    const storedEvent = await storeWebhookEvent(tx, {
      scope: "INSTALLMENT",
      provider: providerKey,
      externalEventId: parsed.externalEventId,
      type: parsed.type,
      payload: sanitizeWebhookPayload(
        JSON.parse(input.rawBody) as Record<string, unknown>,
      ),
      signatureVerified: true,
    });

    const plan = await tx.installmentPlan.findFirst({
      where: {
        provider: providerKey,
        providerPlanId: parsed.providerPlanId,
      },
      include: {
        order: {
          include: {
            course: {
              select: {
                authorId: true,
              },
            },
            payments: {
              orderBy: [{ createdAt: "asc" }],
              take: 1,
            },
          },
        },
      },
    });

    if (!plan || !plan.order.payments[0]) {
      await tx.providerWebhookEvent.update({
        where: {
          id: storedEvent.event.id,
        },
        data: {
          processedAt: new Date(),
          errorMessage: "INSTALLMENT_PLAN_OR_PAYMENT_NOT_FOUND",
        },
      });

      throw new Error("INSTALLMENT_PLAN_OR_PAYMENT_NOT_FOUND");
    }

    await tx.providerWebhookEvent.update({
      where: {
        id: storedEvent.event.id,
      },
      data: {
        orderId: plan.orderId,
        paymentId: plan.order.payments[0].id,
        installmentPlanId: plan.id,
      },
    });

    return {
      planId: plan.id,
      paymentId: plan.order.payments[0].id,
      orderId: plan.orderId,
      type: parsed.type,
      reason: parsed.reason ?? null,
      alreadyProcessed: storedEvent.alreadyProcessed,
      authorId: plan.order.course.authorId,
    };
  });

  if (stored.alreadyProcessed) {
    return {
      ok: true,
      duplicated: true,
    };
  }

  if (stored.type === "installment.approved") {
    await prisma.$transaction(async (tx) => {
      await tx.installmentPlan.update({
        where: {
          id: stored.planId,
        },
        data: {
          status: InstallmentPlanStatus.APPROVED,
          approvedAt: new Date(),
        },
      });

      await createBillingAuditLog(tx, {
        authorId: stored.authorId,
        orderId: stored.orderId,
        paymentId: stored.paymentId,
        installmentPlanId: stored.planId,
        type: "PAYMENT_PENDING",
        message: "Installment plan approved, settling the order.",
      });
    });

    await settlePaidOrder(prisma, {
      orderId: stored.orderId,
      paymentId: stored.paymentId,
      source: "installment",
    });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.installmentPlan.update({
        where: {
          id: stored.planId,
        },
        data: {
          status: InstallmentPlanStatus.DECLINED,
          declinedAt: new Date(),
          metadata: toInputJson({
            reason: stored.reason,
          }),
        },
      });
    });

    await markPaymentFailed(prisma, {
      paymentId: stored.paymentId,
      reason: stored.reason ?? "Installment provider declined the request.",
    });
  }

  await prisma.providerWebhookEvent.updateMany({
    where: {
      scope: "INSTALLMENT",
      provider: normalizeInstallmentProviderKey(input.provider),
      externalEventId: parsed.externalEventId,
    },
    data: {
      processedAt: new Date(),
    },
  });

  return {
    ok: true,
    duplicated: false,
  };
}

export async function issueOrderRefund(input: {
  actorUserId: string;
  actorRole: UserRole;
  orderId: string;
  amountMinor: number;
  reason?: string | null;
}) {
  const prisma = getPrismaClient();

  const prepared = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: input.orderId,
      },
      include: {
        course: {
          select: {
            authorId: true,
          },
        },
        payments: {
          where: {
            status: {
              in: [PaymentRecordStatus.SUCCEEDED, PaymentRecordStatus.PARTIALLY_REFUNDED],
            },
          },
          orderBy: [{ createdAt: "asc" }],
          take: 1,
        },
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    if (
      input.actorRole !== UserRole.ADMIN &&
      order.course.authorId !== input.actorUserId
    ) {
      throw new Error("FORBIDDEN");
    }

    const payment = order.payments[0];

    if (!payment) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    const refundableMinor = Math.max(0, order.amountMinor - order.refundedMinor);
    const requestedMinor = Math.min(refundableMinor, Math.max(1, input.amountMinor));

    if (!requestedMinor) {
      throw new Error("NOTHING_TO_REFUND");
    }

    const refund = await tx.refund.create({
      data: {
        orderId: order.id,
        paymentId: payment.id,
        amountMinor: requestedMinor,
        status: RefundStatus.PENDING,
        idempotencyKey: `refund:${order.id}:${randomUUID()}`,
        reason: input.reason ?? null,
      },
    });

    return {
      authorId: order.course.authorId,
      orderId: order.id,
      paymentId: payment.id,
      paymentProvider: payment.provider,
      providerPaymentId: payment.providerPaymentId ?? payment.id,
      refundId: refund.id,
      amountMinor: requestedMinor,
      currency: payment.currency,
    };
  });

  const provider = getPaymentProvider(prepared.paymentProvider);
  const refundResult = await provider.createRefund({
    paymentId: prepared.paymentId,
    providerPaymentId: prepared.providerPaymentId,
    refundId: prepared.refundId,
    amountMinor: prepared.amountMinor,
    currency: prepared.currency,
    reason: input.reason ?? null,
  });

  await prisma.refund.update({
    where: {
      id: prepared.refundId,
    },
    data: {
      providerRefundId: refundResult.providerRefundId,
      metadata: toInputJson(refundResult.metadata ?? {}),
    },
  });

  await applyRefundSettlement(prisma, {
    orderId: prepared.orderId,
    paymentId: prepared.paymentId,
    refundId: prepared.refundId,
    amountMinor: prepared.amountMinor,
    providerRefundId: refundResult.providerRefundId,
    metadata: refundResult.metadata,
  });

  return {
    ok: true,
  };
}

export async function simulateMockPaymentResolution(input: {
  paymentId: string;
  outcome: "success" | "fail";
}) {
  const prisma = getPrismaClient();
  const payment = await prisma.payment.findUnique({
    where: {
      id: input.paymentId,
    },
  });

  if (!payment || payment.provider !== PaymentGatewayProvider.MOCK || !payment.providerPaymentId) {
    throw new Error("MOCK_PAYMENT_NOT_FOUND");
  }

  const signed = createSignedMockPaymentPayload({
    type: input.outcome === "success" ? "payment.succeeded" : "payment.failed",
    data: {
      providerPaymentId: payment.providerPaymentId,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      reason: input.outcome === "fail" ? "Mock provider declined the payment." : null,
    },
  });

  await processPaymentWebhook({
    provider: "mock",
    rawBody: signed.rawBody,
    signatureHeader: signed.signature,
  });
}

export async function simulateMockInstallmentResolution(input: {
  installmentPlanId: string;
  outcome: "approve" | "decline";
}) {
  const prisma = getPrismaClient();
  const plan = await prisma.installmentPlan.findUnique({
    where: {
      id: input.installmentPlanId,
    },
  });

  if (
    !plan ||
    plan.provider !== InstallmentGatewayProvider.MOCK ||
    !plan.providerPlanId
  ) {
    throw new Error("MOCK_INSTALLMENT_PLAN_NOT_FOUND");
  }

  const signed = createSignedMockInstallmentPayload({
    type:
      input.outcome === "approve"
        ? "installment.approved"
        : "installment.declined",
    data: {
      providerPlanId: plan.providerPlanId,
      reason:
        input.outcome === "decline"
          ? "Mock installment provider declined the application."
          : null,
    },
  });

  await processInstallmentWebhook({
    provider: "mock",
    rawBody: signed.rawBody,
    signatureHeader: signed.signature,
  });
}

export async function getCheckoutReturnState(
  orderId: string,
): Promise<CheckoutReturnStateData> {
  const prisma = getPrismaClient();
  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
        },
      },
      funnel: {
        select: {
          slug: true,
        },
      },
      funnelStep: {
        select: {
          key: true,
          transitions: true,
        },
      },
      payments: {
        orderBy: [{ createdAt: "desc" }],
      },
    },
  });

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const state = getReturnStateForOrder(order);
  const funnelContinuationHref = getFunnelContinuationHref({
    state,
    funnelSlug: order.funnel?.slug ?? null,
    visitId: order.funnelVisitId ?? null,
    checkoutStepKey: order.funnelStep?.key ?? null,
    transitions: order.funnelStep?.transitions,
  });
  const paidPrimaryHref = funnelContinuationHref ?? `/learn/${order.course.id}`;

  if (state === "paid") {
    return {
      courseId: order.course.id,
      courseSlug: order.course.slug,
      courseTitle: order.course.title,
      courseDescription: order.course.description,
      state,
      primaryHref: paidPrimaryHref,
      primaryLabel: funnelContinuationHref
        ? "Продолжить в воронке"
        : "Перейти к обучению",
      secondaryHref: `/courses/${order.course.slug}`,
      secondaryLabel: "Вернуться к курсу",
      autoRedirectHref: paidPrimaryHref,
      orderId: order.id,
    };
  }

  if (state === "failed") {
    return {
      courseId: order.course.id,
      courseSlug: order.course.slug,
      courseTitle: order.course.title,
      courseDescription: order.course.description,
      state,
      primaryHref:
        funnelContinuationHref ?? getCourseCheckoutHref(order.course.slug),
      primaryLabel: funnelContinuationHref
        ? "Вернуться к шагу оплаты"
        : "Попробовать ещё раз",
      secondaryHref: `/courses/${order.course.slug}`,
      secondaryLabel: "Вернуться к курсу",
      autoRedirectHref: null,
      orderId: order.id,
    };
  }

  if (state === "refunded") {
    return {
      courseId: order.course.id,
      courseSlug: order.course.slug,
      courseTitle: order.course.title,
      courseDescription: order.course.description,
      state,
      primaryHref: `/courses/${order.course.slug}`,
      primaryLabel: "Открыть курс",
      secondaryHref: getCourseCheckoutHref(order.course.slug),
      secondaryLabel: "Оформить заново",
      autoRedirectHref: null,
      orderId: order.id,
    };
  }

  return {
    courseId: order.course.id,
    courseSlug: order.course.slug,
    courseTitle: order.course.title,
    courseDescription: order.course.description,
    state,
    primaryHref: `/checkout/success?orderId=${encodeURIComponent(order.id)}&state=pending`,
    primaryLabel: "Проверить снова",
    secondaryHref: `/courses/${order.course.slug}`,
    secondaryLabel: "Вернуться к курсу",
    autoRedirectHref: null,
    orderId: order.id,
  };
}

export async function getMockPaymentConfirmationData(paymentId: string) {
  const prisma = getPrismaClient();
  return prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    include: {
      order: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      },
    },
  });
}

export async function getMockInstallmentConfirmationData(installmentPlanId: string) {
  const prisma = getPrismaClient();
  return prisma.installmentPlan.findUnique({
    where: {
      id: installmentPlanId,
    },
    include: {
      order: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          payments: {
            orderBy: [{ createdAt: "asc" }],
            take: 1,
          },
        },
      },
    },
  });
}
