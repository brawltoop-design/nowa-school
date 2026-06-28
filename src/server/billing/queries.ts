import {
  UserRole,
  type PaymentMethodKind,
  type PaymentRecordStatus,
} from "@prisma/client";
import { getPrismaClient } from "@/server/db";

export type BillingActor = {
  userId: string;
  role: UserRole;
};

export type AuthorCoursePricingData = {
  course: {
    id: string;
    title: string;
    slug: string;
    currency: string;
    legacyPrice: number;
  };
  tariffs: Array<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    priceMinor: number;
    currency: string;
    isDefault: boolean;
    status: string;
    features: string[];
  }>;
  promocodes: Array<{
    id: string;
    code: string;
    description: string | null;
    discountType: string;
    percentOff: number | null;
    amountOffMinor: number | null;
    currency: string | null;
    maxRedemptions: number | null;
    redemptionsCount: number;
    validUntil: Date | null;
    isActive: boolean;
  }>;
  orders: Array<{
    id: string;
    buyer: {
      id: string;
      name: string;
      email: string;
    };
    tariffTitle: string | null;
    amountMinor: number;
    refundedMinor: number;
    currency: string;
    status: string;
    paymentMethod: PaymentMethodKind;
    paymentProvider: string | null;
    paymentStatus: PaymentRecordStatus | null;
    installmentStatus: string | null;
    payoutStatus: string | null;
    offerUrl: string | null;
    refundPolicyUrl: string | null;
    paidAt: Date | null;
    createdAt: Date;
    refunds: Array<{
      id: string;
      amountMinor: number;
      status: string;
      createdAt: Date;
    }>;
  }>;
};

function buildCourseAccessWhere(actor: BillingActor) {
  return actor.role === UserRole.ADMIN ? {} : { authorId: actor.userId };
}

function mapFeatures(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export async function getAuthorCoursePricingData(
  courseId: string,
  actor: BillingActor,
): Promise<
  | { status: "ok"; data: AuthorCoursePricingData }
  | { status: "forbidden" }
  | { status: "not_found" }
> {
  const prisma = getPrismaClient();
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      ...buildCourseAccessWhere(actor),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      currency: true,
      price: true,
      tariffs: {
        orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          priceMinor: true,
          currency: true,
          isDefault: true,
          status: true,
          features: true,
        },
      },
      promocodes: {
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          code: true,
          description: true,
          discountType: true,
          percentOff: true,
          amountOffMinor: true,
          currency: true,
          maxRedemptions: true,
          redemptionsCount: true,
          validUntil: true,
          isActive: true,
        },
      },
      orders: {
        orderBy: [{ createdAt: "desc" }],
        take: 24,
        select: {
          id: true,
          tariffTitleSnapshot: true,
          amountMinor: true,
          refundedMinor: true,
          currency: true,
          status: true,
          paymentMethod: true,
          paymentProvider: true,
          offerUrl: true,
          refundPolicyUrl: true,
          paidAt: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          payments: {
            orderBy: [{ createdAt: "desc" }],
            take: 1,
            select: {
              status: true,
            },
          },
          payout: {
            select: {
              status: true,
            },
          },
          installmentPlan: {
            select: {
              status: true,
            },
          },
          refunds: {
            orderBy: [{ createdAt: "desc" }],
            select: {
              id: true,
              amountMinor: true,
              status: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    const exists = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
      select: {
        id: true,
      },
    });

    return exists ? { status: "forbidden" } : { status: "not_found" };
  }

  return {
    status: "ok",
    data: {
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        currency: course.currency,
        legacyPrice: Number(course.price),
      },
      tariffs: course.tariffs.map((tariff) => ({
        id: tariff.id,
        title: tariff.title,
        slug: tariff.slug,
        description: tariff.description,
        priceMinor: tariff.priceMinor,
        currency: tariff.currency,
        isDefault: tariff.isDefault,
        status: tariff.status,
        features: mapFeatures(tariff.features),
      })),
      promocodes: course.promocodes,
      orders: course.orders.map((order) => ({
        id: order.id,
        buyer: order.user,
        tariffTitle: order.tariffTitleSnapshot,
        amountMinor: order.amountMinor,
        refundedMinor: order.refundedMinor,
        currency: order.currency,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentProvider: order.paymentProvider,
        paymentStatus: order.payments[0]?.status ?? null,
        installmentStatus: order.installmentPlan?.status ?? null,
        payoutStatus: order.payout?.status ?? null,
        offerUrl: order.offerUrl,
        refundPolicyUrl: order.refundPolicyUrl,
        paidAt: order.paidAt,
        createdAt: order.createdAt,
        refunds: order.refunds,
      })),
    },
  };
}
