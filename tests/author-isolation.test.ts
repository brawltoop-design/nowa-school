import assert from "node:assert/strict";
import test from "node:test";
import { CourseStatus, Prisma, UserRole } from "@prisma/client";
import { getAuthorDashboardData, getAuthorCourseStudioShellData } from "../src/server/author/queries";
import { getPrismaClient } from "../src/server/db";
import { recordPlatformEvent } from "../src/server/events";
import { getAuthorFunnelsSummary } from "../src/server/funnels/queries";

const prisma = getPrismaClient();

function unique(value: string) {
  return `${value}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

test("author queries stay isolated by owner", async () => {
  const authorAEmail = `${unique("author-a")}@example.com`;
  const authorBEmail = `${unique("author-b")}@example.com`;

  const created = await prisma.$transaction(async (tx) => {
    const authorA = await tx.user.create({
      data: {
        name: "Isolation Author A",
        email: authorAEmail,
        passwordHash: "test-hash",
        role: UserRole.AUTHOR,
      },
    });
    const authorB = await tx.user.create({
      data: {
        name: "Isolation Author B",
        email: authorBEmail,
        passwordHash: "test-hash",
        role: UserRole.AUTHOR,
      },
    });

    const courseA = await tx.course.create({
      data: {
        authorId: authorA.id,
        title: unique("Course A"),
        slug: unique("course-a"),
        description: "Author A course",
        category: "AI",
        price: new Prisma.Decimal("100.00"),
        currency: "USD",
        level: "Beginner",
        language: "ru",
        status: CourseStatus.PUBLISHED,
      },
    });
    const courseB = await tx.course.create({
      data: {
        authorId: authorB.id,
        title: unique("Course B"),
        slug: unique("course-b"),
        description: "Author B course",
        category: "AI",
        price: new Prisma.Decimal("100.00"),
        currency: "USD",
        level: "Beginner",
        language: "ru",
        status: CourseStatus.PUBLISHED,
      },
    });

    const funnelA = await tx.funnel.create({
      data: {
        authorId: authorA.id,
        courseId: courseA.id,
        name: "Funnel A",
        slug: unique("funnel-a"),
      },
    });
    const funnelB = await tx.funnel.create({
      data: {
        authorId: authorB.id,
        courseId: courseB.id,
        name: "Funnel B",
        slug: unique("funnel-b"),
      },
    });

    return {
      authorA,
      authorB,
      courseA,
      courseB,
      funnelA,
      funnelB,
    };
  });

  try {
    await recordPlatformEvent({
      ownerId: created.authorA.id,
      courseId: created.courseA.id,
      source: "sales_page",
      name: "page_view",
      eventKey: unique("event-a"),
      metadata: {
        test: true,
      },
    });
    await recordPlatformEvent({
      ownerId: created.authorB.id,
      courseId: created.courseB.id,
      source: "sales_page",
      name: "page_view",
      eventKey: unique("event-b"),
      metadata: {
        test: true,
      },
    });

    const ownCourse = await getAuthorCourseStudioShellData(created.courseA.id, {
      userId: created.authorA.id,
      role: UserRole.AUTHOR,
    });
    const foreignCourse = await getAuthorCourseStudioShellData(created.courseB.id, {
      userId: created.authorA.id,
      role: UserRole.AUTHOR,
    });
    const funnels = await getAuthorFunnelsSummary({
      userId: created.authorA.id,
      role: UserRole.AUTHOR,
    });
    const dashboard = await getAuthorDashboardData({
      userId: created.authorA.id,
      role: UserRole.AUTHOR,
    });

    assert.equal(ownCourse.status, "ok");
    assert.equal(foreignCourse.status, "forbidden");
    assert.deepEqual(
      funnels.funnels.map((item) => item.id),
      [created.funnelA.id],
    );
    assert.equal(dashboard.metrics.totalCourses, 1);
    assert.equal(dashboard.metrics.salesPageViews, 1);
    assert.equal(
      dashboard.courses.every((course) => course.id === created.courseA.id),
      true,
    );
  } finally {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [authorAEmail, authorBEmail],
        },
      },
    });
    await prisma.$disconnect();
  }
});
