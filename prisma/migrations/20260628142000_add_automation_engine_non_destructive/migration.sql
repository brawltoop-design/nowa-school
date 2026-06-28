DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContactEventType') THEN
    CREATE TYPE "ContactEventType" AS ENUM (
      'LEAD_CAPTURED',
      'CHECKOUT_STARTED',
      'COURSE_PURCHASED',
      'WEBINAR_REGISTERED',
      'COURSE_VIEWED',
      'MODULE_COMPLETED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DiscountCodeStatus') THEN
    CREATE TYPE "DiscountCodeStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AutomationStatus') THEN
    CREATE TYPE "AutomationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AutomationTriggerType') THEN
    CREATE TYPE "AutomationTriggerType" AS ENUM (
      'LEAD_CAPTURED',
      'ABANDONED_CHECKOUT',
      'WEBINAR_REGISTERED',
      'COURSE_INACTIVE_DAYS',
      'MODULE_COMPLETED',
      'DAYS_AFTER_EVENT'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AutomationDelayUnit') THEN
    CREATE TYPE "AutomationDelayUnit" AS ENUM ('MINUTES', 'HOURS', 'DAYS');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AutomationActionType') THEN
    CREATE TYPE "AutomationActionType" AS ENUM (
      'SEND_MESSAGE',
      'APPLY_TAG',
      'CHANGE_DEAL_STAGE',
      'ISSUE_PROMO_CODE',
      'CREATE_FOLLOW_UP'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AutomationRunStatus') THEN
    CREATE TYPE "AutomationRunStatus" AS ENUM (
      'ACTIVE',
      'COMPLETED',
      'GOAL_MET',
      'EXITED',
      'STOPPED',
      'FAILED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AutomationDispatchStatus') THEN
    CREATE TYPE "AutomationDispatchStatus" AS ENUM (
      'PENDING',
      'PROCESSING',
      'COMPLETED',
      'RETRYING',
      'SKIPPED',
      'FAILED',
      'CANCELLED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageChannel') THEN
    CREATE TYPE "MessageChannel" AS ENUM ('TELEGRAM', 'EMAIL');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageProvider') THEN
    CREATE TYPE "MessageProvider" AS ENUM ('MOCK', 'TELEGRAM', 'SMTP');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageStatus') THEN
    CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'OPENED', 'FAILED', 'SKIPPED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AutomationEventType') THEN
    CREATE TYPE "AutomationEventType" AS ENUM (
      'AUTOMATION_ENTER',
      'MESSAGE_SENT',
      'MESSAGE_OPENED',
      'AUTOMATION_GOAL_MET',
      'AUTOMATION_EXIT'
    );
  END IF;
END $$;

ALTER TABLE "Contact"
  ADD COLUMN IF NOT EXISTS "emailConsentGranted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "emailUnsubscribedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "globalUnsubscribedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "telegramConsentGranted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "telegramUnsubscribedAt" TIMESTAMP(3);

ALTER TABLE "Deal"
  ALTER COLUMN "title" SET DEFAULT 'Сделка';

ALTER TABLE "Enrollment"
  ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "FunnelVisit"
  ADD COLUMN IF NOT EXISTS "contactId" TEXT;

ALTER TABLE "Segment"
  ADD COLUMN IF NOT EXISTS "filters" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS "ContactEvent" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "courseId" TEXT,
  "orderId" TEXT,
  "eventKey" TEXT,
  "type" "ContactEventType" NOT NULL,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DiscountCode" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "contactId" TEXT,
  "automationRunId" TEXT,
  "code" TEXT NOT NULL,
  "percentOff" INTEGER,
  "amountOff" DECIMAL(10,2),
  "currency" TEXT,
  "status" "DiscountCodeStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3),
  "redeemedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Automation" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "courseId" TEXT,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "status" "AutomationStatus" NOT NULL DEFAULT 'DRAFT',
  "triggerType" "AutomationTriggerType" NOT NULL,
  "triggerConfig" JSONB,
  "conditions" JSONB,
  "goal" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AutomationStep" (
  "id" TEXT NOT NULL,
  "automationId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "delayAmount" INTEGER NOT NULL DEFAULT 0,
  "delayUnit" "AutomationDelayUnit" NOT NULL DEFAULT 'HOURS',
  "actionType" "AutomationActionType" NOT NULL,
  "actionConfig" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AutomationRun" (
  "id" TEXT NOT NULL,
  "automationId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "userId" TEXT,
  "triggerEventId" TEXT,
  "entryKey" TEXT NOT NULL,
  "status" "AutomationRunStatus" NOT NULL DEFAULT 'ACTIVE',
  "currentStepOrder" INTEGER,
  "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "goalMetAt" TIMESTAMP(3),
  "exitedAt" TIMESTAMP(3),
  "exitReason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AutomationDispatch" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "stepId" TEXT NOT NULL,
  "status" "AutomationDispatchStatus" NOT NULL DEFAULT 'PENDING',
  "dueAt" TIMESTAMP(3) NOT NULL,
  "lockedAt" TIMESTAMP(3),
  "lockedBy" TEXT,
  "processedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationDispatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Message" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "automationRunId" TEXT,
  "automationStepId" TEXT,
  "channel" "MessageChannel" NOT NULL,
  "provider" "MessageProvider" NOT NULL,
  "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
  "dedupeKey" TEXT NOT NULL,
  "externalMessageId" TEXT,
  "subject" TEXT,
  "contentText" TEXT NOT NULL,
  "contentHtml" TEXT,
  "metadata" JSONB,
  "skipReason" TEXT,
  "sentAt" TIMESTAMP(3),
  "openedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AutomationRunEvent" (
  "id" TEXT NOT NULL,
  "automationId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "stepId" TEXT,
  "messageId" TEXT,
  "type" "AutomationEventType" NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AutomationRunEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ContactEvent_authorId_type_occurredAt_idx"
  ON "ContactEvent"("authorId", "type", "occurredAt");

CREATE INDEX IF NOT EXISTS "ContactEvent_contactId_occurredAt_idx"
  ON "ContactEvent"("contactId", "occurredAt");

CREATE INDEX IF NOT EXISTS "ContactEvent_courseId_occurredAt_idx"
  ON "ContactEvent"("courseId", "occurredAt");

CREATE INDEX IF NOT EXISTS "ContactEvent_orderId_occurredAt_idx"
  ON "ContactEvent"("orderId", "occurredAt");

CREATE UNIQUE INDEX IF NOT EXISTS "ContactEvent_authorId_type_eventKey_key"
  ON "ContactEvent"("authorId", "type", "eventKey");

CREATE UNIQUE INDEX IF NOT EXISTS "DiscountCode_code_key"
  ON "DiscountCode"("code");

CREATE INDEX IF NOT EXISTS "DiscountCode_authorId_status_createdAt_idx"
  ON "DiscountCode"("authorId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "DiscountCode_contactId_idx"
  ON "DiscountCode"("contactId");

CREATE INDEX IF NOT EXISTS "DiscountCode_automationRunId_idx"
  ON "DiscountCode"("automationRunId");

CREATE INDEX IF NOT EXISTS "Automation_authorId_status_triggerType_idx"
  ON "Automation"("authorId", "status", "triggerType");

CREATE INDEX IF NOT EXISTS "Automation_courseId_idx"
  ON "Automation"("courseId");

CREATE UNIQUE INDEX IF NOT EXISTS "Automation_authorId_slug_key"
  ON "Automation"("authorId", "slug");

CREATE INDEX IF NOT EXISTS "AutomationStep_automationId_actionType_idx"
  ON "AutomationStep"("automationId", "actionType");

CREATE UNIQUE INDEX IF NOT EXISTS "AutomationStep_automationId_order_key"
  ON "AutomationStep"("automationId", "order");

CREATE INDEX IF NOT EXISTS "AutomationRun_automationId_status_enteredAt_idx"
  ON "AutomationRun"("automationId", "status", "enteredAt");

CREATE INDEX IF NOT EXISTS "AutomationRun_contactId_status_idx"
  ON "AutomationRun"("contactId", "status");

CREATE INDEX IF NOT EXISTS "AutomationRun_triggerEventId_idx"
  ON "AutomationRun"("triggerEventId");

CREATE UNIQUE INDEX IF NOT EXISTS "AutomationRun_automationId_entryKey_key"
  ON "AutomationRun"("automationId", "entryKey");

CREATE INDEX IF NOT EXISTS "AutomationDispatch_status_dueAt_idx"
  ON "AutomationDispatch"("status", "dueAt");

CREATE INDEX IF NOT EXISTS "AutomationDispatch_lockedAt_idx"
  ON "AutomationDispatch"("lockedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "AutomationDispatch_runId_stepId_key"
  ON "AutomationDispatch"("runId", "stepId");

CREATE UNIQUE INDEX IF NOT EXISTS "Message_dedupeKey_key"
  ON "Message"("dedupeKey");

CREATE INDEX IF NOT EXISTS "Message_authorId_channel_status_createdAt_idx"
  ON "Message"("authorId", "channel", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "Message_contactId_sentAt_idx"
  ON "Message"("contactId", "sentAt");

CREATE INDEX IF NOT EXISTS "Message_automationRunId_idx"
  ON "Message"("automationRunId");

CREATE INDEX IF NOT EXISTS "Message_automationStepId_idx"
  ON "Message"("automationStepId");

CREATE INDEX IF NOT EXISTS "AutomationRunEvent_automationId_type_createdAt_idx"
  ON "AutomationRunEvent"("automationId", "type", "createdAt");

CREATE INDEX IF NOT EXISTS "AutomationRunEvent_contactId_createdAt_idx"
  ON "AutomationRunEvent"("contactId", "createdAt");

CREATE INDEX IF NOT EXISTS "AutomationRunEvent_runId_createdAt_idx"
  ON "AutomationRunEvent"("runId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "Contact_unsubscribeToken_key"
  ON "Contact"("unsubscribeToken");

CREATE INDEX IF NOT EXISTS "Deal_contactId_updatedAt_idx"
  ON "Deal"("contactId", "updatedAt");

CREATE INDEX IF NOT EXISTS "FunnelVisit_contactId_idx"
  ON "FunnelVisit"("contactId");

CREATE UNIQUE INDEX IF NOT EXISTS "Tag_tenantAuthorId_slug_key"
  ON "Tag"("tenantAuthorId", "slug");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FunnelVisit_contactId_fkey') THEN
    ALTER TABLE "FunnelVisit"
      ADD CONSTRAINT "FunnelVisit_contactId_fkey"
      FOREIGN KEY ("contactId") REFERENCES "Contact"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContactEvent_authorId_fkey') THEN
    ALTER TABLE "ContactEvent"
      ADD CONSTRAINT "ContactEvent_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContactEvent_contactId_fkey') THEN
    ALTER TABLE "ContactEvent"
      ADD CONSTRAINT "ContactEvent_contactId_fkey"
      FOREIGN KEY ("contactId") REFERENCES "Contact"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContactEvent_courseId_fkey') THEN
    ALTER TABLE "ContactEvent"
      ADD CONSTRAINT "ContactEvent_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContactEvent_orderId_fkey') THEN
    ALTER TABLE "ContactEvent"
      ADD CONSTRAINT "ContactEvent_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DiscountCode_authorId_fkey') THEN
    ALTER TABLE "DiscountCode"
      ADD CONSTRAINT "DiscountCode_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DiscountCode_contactId_fkey') THEN
    ALTER TABLE "DiscountCode"
      ADD CONSTRAINT "DiscountCode_contactId_fkey"
      FOREIGN KEY ("contactId") REFERENCES "Contact"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DiscountCode_automationRunId_fkey') THEN
    ALTER TABLE "DiscountCode"
      ADD CONSTRAINT "DiscountCode_automationRunId_fkey"
      FOREIGN KEY ("automationRunId") REFERENCES "AutomationRun"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Automation_authorId_fkey') THEN
    ALTER TABLE "Automation"
      ADD CONSTRAINT "Automation_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Automation_courseId_fkey') THEN
    ALTER TABLE "Automation"
      ADD CONSTRAINT "Automation_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AutomationStep_automationId_fkey') THEN
    ALTER TABLE "AutomationStep"
      ADD CONSTRAINT "AutomationStep_automationId_fkey"
      FOREIGN KEY ("automationId") REFERENCES "Automation"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AutomationRun_automationId_fkey') THEN
    ALTER TABLE "AutomationRun"
      ADD CONSTRAINT "AutomationRun_automationId_fkey"
      FOREIGN KEY ("automationId") REFERENCES "Automation"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AutomationRun_contactId_fkey') THEN
    ALTER TABLE "AutomationRun"
      ADD CONSTRAINT "AutomationRun_contactId_fkey"
      FOREIGN KEY ("contactId") REFERENCES "Contact"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AutomationRun_userId_fkey') THEN
    ALTER TABLE "AutomationRun"
      ADD CONSTRAINT "AutomationRun_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AutomationRun_triggerEventId_fkey') THEN
    ALTER TABLE "AutomationRun"
      ADD CONSTRAINT "AutomationRun_triggerEventId_fkey"
      FOREIGN KEY ("triggerEventId") REFERENCES "ContactEvent"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AutomationDispatch_runId_fkey') THEN
    ALTER TABLE "AutomationDispatch"
      ADD CONSTRAINT "AutomationDispatch_runId_fkey"
      FOREIGN KEY ("runId") REFERENCES "AutomationRun"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AutomationDispatch_stepId_fkey') THEN
    ALTER TABLE "AutomationDispatch"
      ADD CONSTRAINT "AutomationDispatch_stepId_fkey"
      FOREIGN KEY ("stepId") REFERENCES "AutomationStep"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Message_authorId_fkey') THEN
    ALTER TABLE "Message"
      ADD CONSTRAINT "Message_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Message_contactId_fkey') THEN
    ALTER TABLE "Message"
      ADD CONSTRAINT "Message_contactId_fkey"
      FOREIGN KEY ("contactId") REFERENCES "Contact"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Message_automationRunId_fkey') THEN
    ALTER TABLE "Message"
      ADD CONSTRAINT "Message_automationRunId_fkey"
      FOREIGN KEY ("automationRunId") REFERENCES "AutomationRun"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Message_automationStepId_fkey') THEN
    ALTER TABLE "Message"
      ADD CONSTRAINT "Message_automationStepId_fkey"
      FOREIGN KEY ("automationStepId") REFERENCES "AutomationStep"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AutomationRunEvent_automationId_fkey') THEN
    ALTER TABLE "AutomationRunEvent"
      ADD CONSTRAINT "AutomationRunEvent_automationId_fkey"
      FOREIGN KEY ("automationId") REFERENCES "Automation"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AutomationRunEvent_runId_fkey') THEN
    ALTER TABLE "AutomationRunEvent"
      ADD CONSTRAINT "AutomationRunEvent_runId_fkey"
      FOREIGN KEY ("runId") REFERENCES "AutomationRun"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AutomationRunEvent_contactId_fkey') THEN
    ALTER TABLE "AutomationRunEvent"
      ADD CONSTRAINT "AutomationRunEvent_contactId_fkey"
      FOREIGN KEY ("contactId") REFERENCES "Contact"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AutomationRunEvent_stepId_fkey') THEN
    ALTER TABLE "AutomationRunEvent"
      ADD CONSTRAINT "AutomationRunEvent_stepId_fkey"
      FOREIGN KEY ("stepId") REFERENCES "AutomationStep"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AutomationRunEvent_messageId_fkey') THEN
    ALTER TABLE "AutomationRunEvent"
      ADD CONSTRAINT "AutomationRunEvent_messageId_fkey"
      FOREIGN KEY ("messageId") REFERENCES "Message"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
