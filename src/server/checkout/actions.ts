"use server";

import { OrderStatus, Prisma, SalesPageStatus, UserRole } from "@prisma/client";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  calculateAuthorRevenue,
  calculatePlatformFee,
} from "@/lib/payments";
import { getServerAuthSession } from "@/server/auth/session";
import { getPrismaClient } from "@/server/db";
import { recordSalesPageAnalyticsEvent } from "@/server/sales-page/analytics";

type MockCheckoutState = "paid" | "already-owned";

function revalidatePurchaseState(courseId: string, slug: string) {
  revalidatePath("/courses");
  revalidatePath(`/courses/${slug}`);
  revalidatePath("/learn");
  revalidatePath(`/learn/${courseId}`);
  revalidatePath("/author");
  revalidatePath("/admin");
}

export async function completeMockCheckout(courseId: string, formData: FormData) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === UserRole.AUTHOR) {
    redirect("/forbidden");
  }

  const prisma = getPrismaClient();
  const result = await prisma.$transaction(async (tx) => {
    const course = await tx.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        slug: true,
        price: true,
        status: true,
        salesPage: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!course || course.status !== "PUBLISHED") {
      throw new Error("COURSE_NOT_AVAILABLE");
    }

    const existingEnrollment = await tx.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
      select: { id: true },
    });

    const existingPaidOrder = await tx.order.findFirst({
      where: {
        userId: session.user.id,
        courseId,
        status: OrderStatus.PAID,
      },
      select: { id: true },
    });

    if (existingEnrollment || existingPaidOrder) {
      if (!existingEnrollment) {
        await tx.enrollment.create({
          data: {
            userId: session.user.id,
            courseId,
          },
        });
      }

      return {
        courseId: course.id,
        courseSlug: course.slug,
        state: "already-owned" as MockCheckoutState,
      };
    }

    const amount = Number(course.price);
    const platformFee = calculatePlatformFee(amount);
    const authorRevenue = calculateAuthorRevenue(amount);

    await tx.order.create({
      data: {
        userId: session.user.id,
        courseId,
        amount: new Prisma.Decimal(amount),
        platformFee: new Prisma.Decimal(platformFee),
        authorRevenue: new Prisma.Decimal(authorRevenue),
        status: OrderStatus.PAID,
        paymentProvider: "mock",
        paymentId: `mock_${randomUUID()}`,
      },
    });

    await tx.enrollment.create({
      data: {
        userId: session.user.id,
        courseId,
      },
    });

    return {
      courseId: course.id,
      courseSlug: course.slug,
      salesPageId:
        course.salesPage?.status === SalesPageStatus.PUBLISHED
          ? course.salesPage.id
          : null,
      state: "paid" as MockCheckoutState,
    };
  });

  if (result.state === "paid" && result.salesPageId) {
    const metadata = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"].reduce<Record<string, string>>(
      (acc, key) => {
        const value = formData.get(key);

        if (typeof value === "string" && value.trim()) {
          acc[key] = value.trim();
        }

        return acc;
      },
      {},
    );

    const visitorId = formData.get("visitorId");

    await recordSalesPageAnalyticsEvent({
      salesPageId: result.salesPageId,
      courseId: result.courseId,
      type: "PURCHASE",
      visitorId: typeof visitorId === "string" && visitorId.trim() ? visitorId : null,
      userId: session.user.id,
      metadata,
    });
  }

  revalidatePurchaseState(result.courseId, result.courseSlug);

  redirect(
    `/checkout/success?courseId=${encodeURIComponent(result.courseId)}&state=${result.state}`,
  );
}
