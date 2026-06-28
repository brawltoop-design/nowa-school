import assert from "node:assert/strict";
import test, { after } from "node:test";
import {
  AutomationActionType,
  AutomationDelayUnit,
  AutomationTriggerType,
  CourseStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import {
  processAutomationQueue,
  recordContactLifecycleEvent,
  stopAutomationRunsForAutomation,
} from "../src/server/automations/engine";
import { getAuthorAutomationDetail } from "../src/server/automations/queries";
import { getPrismaClient } from "../src/server/db";

const prisma = getPrismaClient();

after(async () => {
  await prisma.$disconnect();
});

function unique(value: string) {
  return `${value}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createAuthorCourseAutomation(input: {
  triggerType?: AutomationTriggerType;
  triggerConfig?: Prisma.InputJsonValue | null;
  goal?: Prisma.InputJsonValue | null;
  steps: Array<{
    title: string;
    delayAmount: number;
    delayUnit: AutomationDelayUnit;
    actionType: AutomationActionType;
    actionConfig: Prisma.InputJsonValue;
  }>;
}) {
  const authorEmail = `${unique("automation-author")}@example.com`;

  const created = await prisma.$transaction(async (tx) => {
    const author = await tx.user.create({
      data: {
        name: "Automation Test Author",
        email: authorEmail,
        passwordHash: "test-hash",
        role: UserRole.AUTHOR,
      },
    });

    const course = await tx.course.create({
      data: {
        authorId: author.id,
        title: unique("Automation Course"),
        slug: unique("automation-course"),
        description: "Automation test course",
        category: "AI",
        price: new Prisma.Decimal("100.00"),
        currency: "USD",
        level: "Beginner",
        language: "ru",
        status: CourseStatus.PUBLISHED,
      },
    });

    const automation = await tx.automation.create({
      data: {
        authorId: author.id,
        courseId: course.id,
        name: unique("Automation Flow"),
        slug: unique("automation-flow"),
        description: "Test automation flow",
        status: "ACTIVE",
        triggerType: input.triggerType ?? "LEAD_CAPTURED",
        triggerConfig: input.triggerConfig ?? Prisma.JsonNull,
        conditions: Prisma.JsonNull,
        goal:
          input.goal ??
          ({
            type: "COURSE_PURCHASED",
            courseId: course.id,
          } as Prisma.InputJsonValue),
      },
    });

    for (const [index, step] of input.steps.entries()) {
      await tx.automationStep.create({
        data: {
          automationId: automation.id,
          order: index,
          title: step.title,
          delayAmount: step.delayAmount,
          delayUnit: step.delayUnit,
          actionType: step.actionType,
          actionConfig: step.actionConfig,
        },
      });
    }

    return {
      author,
      course,
      automation,
      authorEmail,
    };
  });

  return created;
}

test("automation dedupes duplicate entries and stops after purchase goal", async () => {
  const created = await createAuthorCourseAutomation({
    steps: [
      {
        title: "First touch",
        delayAmount: 0,
        delayUnit: "HOURS",
        actionType: "SEND_MESSAGE",
        actionConfig: {
          channel: "TELEGRAM",
          text: "Привет, {{firstName}}!",
        } as Prisma.InputJsonValue,
      },
      {
        title: "Long tail",
        delayAmount: 1,
        delayUnit: "DAYS",
        actionType: "SEND_MESSAGE",
        actionConfig: {
          channel: "TELEGRAM",
          text: "Второе касание",
        } as Prisma.InputJsonValue,
      },
    ],
  });

  const email = `${unique("lead")}@example.com`;
  const telegramUsername = unique("lead-tg");
  const eventKey = unique("lead-entry");

  try {
    const first = await recordContactLifecycleEvent({
      authorId: created.author.id,
      courseId: created.course.id,
      type: "LEAD_CAPTURED",
      eventKey,
      contact: {
        fullName: "Goal Contact",
        email,
        telegramUsername,
        source: "test",
        personalDataConsentGranted: true,
        telegramConsentGranted: true,
      },
    });
    const duplicate = await recordContactLifecycleEvent({
      authorId: created.author.id,
      courseId: created.course.id,
      type: "LEAD_CAPTURED",
      eventKey,
      contact: {
        fullName: "Goal Contact",
        email,
        telegramUsername,
        source: "test",
        personalDataConsentGranted: true,
        telegramConsentGranted: true,
      },
    });

    assert.equal(first.scheduledRuns, 1);
    assert.equal(duplicate.scheduledRuns, 0);
    assert.equal(
      await prisma.automationRun.count({
        where: {
          automationId: created.automation.id,
        },
      }),
      1,
    );

    const queueResult = await processAutomationQueue({
      automationId: created.automation.id,
      limit: 10,
      workerId: unique("automation-worker"),
    });
    assert.equal(queueResult.processed, 1);

    const messageCountAfterFirstStep = await prisma.message.count({
      where: {
        automationRun: {
          automationId: created.automation.id,
        },
      },
    });
    assert.equal(messageCountAfterFirstStep, 1);

    await recordContactLifecycleEvent({
      authorId: created.author.id,
      courseId: created.course.id,
      type: "COURSE_PURCHASED",
      eventKey: unique("purchase"),
      contact: {
        fullName: "Goal Contact",
        email,
        telegramUsername,
        source: "test",
        personalDataConsentGranted: true,
        telegramConsentGranted: true,
      },
    });

    const run = await prisma.automationRun.findFirst({
      where: {
        automationId: created.automation.id,
      },
    });
    assert.ok(run);
    assert.equal(run.status, "GOAL_MET");

    const dispatchStatuses = await prisma.automationDispatch.findMany({
      where: {
        runId: run.id,
      },
      orderBy: [{ createdAt: "asc" }],
      select: {
        status: true,
      },
    });
    assert.deepEqual(
      dispatchStatuses.map((dispatch) => dispatch.status),
      ["COMPLETED", "CANCELLED"],
    );

    const goalEvents = await prisma.automationRunEvent.count({
      where: {
        automationId: created.automation.id,
        type: "AUTOMATION_GOAL_MET",
      },
    });
    assert.equal(goalEvents, 1);

    const secondQueueResult = await processAutomationQueue({
      automationId: created.automation.id,
      limit: 10,
      workerId: unique("automation-worker"),
    });
    assert.equal(secondQueueResult.processed, 0);
    assert.equal(
      await prisma.message.count({
        where: {
          automationRun: {
            automationId: created.automation.id,
          },
        },
      }),
      1,
    );
  } finally {
    await prisma.user.deleteMany({
      where: {
        email: created.authorEmail,
      },
    });
  }
});

test("stopping an automation cancels pending dispatches and writes exit audit", async () => {
  const created = await createAuthorCourseAutomation({
    steps: [
      {
        title: "Delayed reminder",
        delayAmount: 2,
        delayUnit: "DAYS",
        actionType: "SEND_MESSAGE",
        actionConfig: {
          channel: "TELEGRAM",
          text: "Напоминание",
        } as Prisma.InputJsonValue,
      },
    ],
  });

  try {
    await recordContactLifecycleEvent({
      authorId: created.author.id,
      courseId: created.course.id,
      type: "LEAD_CAPTURED",
      eventKey: unique("stoppable-lead"),
      contact: {
        fullName: "Paused Contact",
        email: `${unique("paused")}@example.com`,
        telegramUsername: unique("paused-tg"),
        source: "test",
        personalDataConsentGranted: true,
        telegramConsentGranted: true,
      },
    });

    const stopped = await stopAutomationRunsForAutomation({
      automationId: created.automation.id,
      reason: "automation_paused_test",
    });
    assert.equal(stopped, 1);

    const run = await prisma.automationRun.findFirst({
      where: {
        automationId: created.automation.id,
      },
    });
    assert.ok(run);
    assert.equal(run.status, "STOPPED");
    assert.equal(run.exitReason, "automation_paused_test");

    const dispatch = await prisma.automationDispatch.findFirst({
      where: {
        runId: run.id,
      },
    });
    assert.ok(dispatch);
    assert.equal(dispatch.status, "CANCELLED");

    const exitEvents = await prisma.automationRunEvent.count({
      where: {
        automationId: created.automation.id,
        runId: run.id,
        type: "AUTOMATION_EXIT",
      },
    });
    assert.equal(exitEvents, 1);
  } finally {
    await prisma.user.deleteMany({
      where: {
        email: created.authorEmail,
      },
    });
  }
});

test("automation detail stats count all runs, not only recent visible rows", async () => {
  const created = await createAuthorCourseAutomation({
    goal: {
      type: "NONE",
    } as Prisma.InputJsonValue,
    steps: [
      {
        title: "Tag contact",
        delayAmount: 0,
        delayUnit: "HOURS",
        actionType: "APPLY_TAG",
        actionConfig: {
          tagName: "stats-tag",
        } as Prisma.InputJsonValue,
      },
    ],
  });

  try {
    for (let index = 0; index < 13; index += 1) {
      await recordContactLifecycleEvent({
        authorId: created.author.id,
        courseId: created.course.id,
        type: "LEAD_CAPTURED",
        eventKey: unique(`stats-lead-${index}`),
        contact: {
          fullName: `Stats Contact ${index}`,
          email: `${unique(`stats-${index}`)}@example.com`,
          source: "test",
          personalDataConsentGranted: true,
        },
      });
    }

    const queueResult = await processAutomationQueue({
      automationId: created.automation.id,
      limit: 50,
      workerId: unique("automation-worker"),
    });
    assert.equal(queueResult.processed, 13);

    const detail = await getAuthorAutomationDetail(created.automation.id, {
      userId: created.author.id,
      role: UserRole.AUTHOR,
    });

    assert.equal(detail.status, "ok");

    if (detail.status !== "ok") {
      throw new Error("Expected automation detail to be accessible");
    }

    assert.equal(detail.data.stats.entered, 13);
    assert.equal(detail.data.stats.completed, 13);
    assert.equal(detail.data.stats.activeRuns, 0);
    assert.equal(detail.data.recentRuns.length, 12);
  } finally {
    await prisma.user.deleteMany({
      where: {
        email: created.authorEmail,
      },
    });
  }
});
