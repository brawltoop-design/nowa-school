ALTER TABLE "Contact"
  ADD COLUMN IF NOT EXISTS "personalDataConsentGranted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "personalDataConsentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "emailConsentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "telegramConsentAt" TIMESTAMP(3);

UPDATE "Contact"
SET "personalDataConsentAt" = COALESCE("personalDataConsentAt", "createdAt")
WHERE "personalDataConsentGranted" = true
  AND "personalDataConsentAt" IS NULL;

UPDATE "Contact"
SET "emailConsentAt" = COALESCE("emailConsentAt", "createdAt")
WHERE "emailConsentGranted" = true
  AND "emailConsentAt" IS NULL;

UPDATE "Contact"
SET "telegramConsentAt" = COALESCE("telegramConsentAt", "createdAt")
WHERE "telegramConsentGranted" = true
  AND "telegramConsentAt" IS NULL;

CREATE TABLE IF NOT EXISTS "Event" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "contactId" TEXT,
  "courseId" TEXT,
  "orderId" TEXT,
  "source" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "eventKey" TEXT,
  "visitorId" TEXT,
  "utm" JSONB,
  "metadata" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Event_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Event_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Event_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Event_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Event_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Event_ownerId_name_eventKey_key"
  ON "Event"("ownerId", "name", "eventKey");
CREATE INDEX IF NOT EXISTS "Event_ownerId_timestamp_idx"
  ON "Event"("ownerId", "timestamp");
CREATE INDEX IF NOT EXISTS "Event_source_timestamp_idx"
  ON "Event"("source", "timestamp");
CREATE INDEX IF NOT EXISTS "Event_name_timestamp_idx"
  ON "Event"("name", "timestamp");
CREATE INDEX IF NOT EXISTS "Event_contactId_timestamp_idx"
  ON "Event"("contactId", "timestamp");
CREATE INDEX IF NOT EXISTS "Event_courseId_timestamp_idx"
  ON "Event"("courseId", "timestamp");
CREATE INDEX IF NOT EXISTS "Event_orderId_timestamp_idx"
  ON "Event"("orderId", "timestamp");
CREATE INDEX IF NOT EXISTS "Event_visitorId_timestamp_idx"
  ON "Event"("visitorId", "timestamp");

CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
  "id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "hits" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RateLimitBucket_scope_key_windowStart_key"
  ON "RateLimitBucket"("scope", "key", "windowStart");
CREATE INDEX IF NOT EXISTS "RateLimitBucket_scope_key_expiresAt_idx"
  ON "RateLimitBucket"("scope", "key", "expiresAt");
CREATE INDEX IF NOT EXISTS "RateLimitBucket_expiresAt_idx"
  ON "RateLimitBucket"("expiresAt");

INSERT INTO "Event" (
  "id",
  "ownerId",
  "contactId",
  "courseId",
  "orderId",
  "source",
  "name",
  "eventKey",
  "visitorId",
  "utm",
  "metadata",
  "timestamp",
  "createdAt"
)
SELECT
  'evt_contact_' || ce."id",
  ce."authorId",
  ce."contactId",
  ce."courseId",
  ce."orderId",
  'contact',
  CASE
    WHEN ce."type"::text = 'LEAD_CAPTURED' THEN 'contact_created'
    ELSE lower(ce."type"::text)
  END,
  'backfill:contact:' || ce."id",
  c."metadata"->>'visitorId',
  jsonb_strip_nulls(jsonb_build_object(
    'utm_source', ce."metadata"->>'utm_source',
    'utm_medium', ce."metadata"->>'utm_medium',
    'utm_campaign', ce."metadata"->>'utm_campaign',
    'utm_content', ce."metadata"->>'utm_content',
    'utm_term', ce."metadata"->>'utm_term',
    'ref', ce."metadata"->>'ref'
  )),
  COALESCE(ce."metadata"::jsonb, '{}'::jsonb),
  ce."occurredAt",
  ce."createdAt"
FROM "ContactEvent" ce
JOIN "Contact" c ON c."id" = ce."contactId"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Event" (
  "id",
  "ownerId",
  "contactId",
  "courseId",
  "orderId",
  "source",
  "name",
  "eventKey",
  "visitorId",
  "utm",
  "metadata",
  "timestamp",
  "createdAt"
)
SELECT
  'evt_funnel_' || fe."id",
  f."authorId",
  fv."contactId",
  f."courseId",
  NULL,
  'funnel',
  lower(fe."type"::text),
  'backfill:funnel:' || fe."id",
  fv."id",
  COALESCE(fv."utm"::jsonb, '{}'::jsonb),
  jsonb_build_object(
    'funnelId', fe."funnelId",
    'stepId', fe."stepId",
    'variant', fe."variant"
  ) || COALESCE(fe."metadata"::jsonb, '{}'::jsonb),
  fe."createdAt",
  fe."createdAt"
FROM "FunnelEvent" fe
JOIN "FunnelVisit" fv ON fv."id" = fe."funnelVisitId"
JOIN "Funnel" f ON f."id" = fe."funnelId"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Event" (
  "id",
  "ownerId",
  "contactId",
  "courseId",
  "orderId",
  "source",
  "name",
  "eventKey",
  "visitorId",
  "utm",
  "metadata",
  "timestamp",
  "createdAt"
)
SELECT
  'evt_automation_' || are."id",
  a."authorId",
  are."contactId",
  a."courseId",
  NULL,
  'automation',
  lower(are."type"::text),
  'backfill:automation:' || are."id",
  NULL,
  '{}'::jsonb,
  jsonb_build_object(
    'automationId', are."automationId",
    'runId', are."runId",
    'stepId', are."stepId",
    'messageId', are."messageId"
  ) || COALESCE(are."metadata"::jsonb, '{}'::jsonb),
  are."createdAt",
  are."createdAt"
FROM "AutomationRunEvent" are
JOIN "Automation" a ON a."id" = are."automationId"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Event" (
  "id",
  "ownerId",
  "contactId",
  "courseId",
  "orderId",
  "source",
  "name",
  "eventKey",
  "visitorId",
  "utm",
  "metadata",
  "timestamp",
  "createdAt"
)
SELECT
  'evt_salespage_' || spe."id",
  c."authorId",
  NULL,
  spe."courseId",
  NULL,
  'sales_page',
  lower(spe."type"::text),
  'backfill:salespage:' || spe."id",
  spe."visitorId",
  jsonb_strip_nulls(jsonb_build_object(
    'utm_source', spe."metadata"->>'utm_source',
    'utm_medium', spe."metadata"->>'utm_medium',
    'utm_campaign', spe."metadata"->>'utm_campaign',
    'utm_content', spe."metadata"->>'utm_content',
    'utm_term', spe."metadata"->>'utm_term',
    'ref', spe."metadata"->>'ref'
  )),
  jsonb_build_object(
    'salesPageId', spe."salesPageId",
    'userId', spe."userId"
  ) || COALESCE(spe."metadata"::jsonb, '{}'::jsonb),
  spe."createdAt",
  spe."createdAt"
FROM "SalesPageAnalyticsEvent" spe
JOIN "Course" c ON c."id" = spe."courseId"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Event" (
  "id",
  "ownerId",
  "contactId",
  "courseId",
  "orderId",
  "source",
  "name",
  "eventKey",
  "visitorId",
  "utm",
  "metadata",
  "timestamp",
  "createdAt"
)
SELECT
  'evt_billing_' || bal."id",
  bal."authorId",
  o."contactId",
  o."courseId",
  bal."orderId",
  'billing',
  lower(bal."type"::text),
  'backfill:billing:' || bal."id",
  NULL,
  jsonb_strip_nulls(jsonb_build_object(
    'utm_source', bal."metadata"->>'utm_source',
    'utm_medium', bal."metadata"->>'utm_medium',
    'utm_campaign', bal."metadata"->>'utm_campaign',
    'utm_content', bal."metadata"->>'utm_content',
    'utm_term', bal."metadata"->>'utm_term',
    'ref', bal."metadata"->>'ref'
  )),
  jsonb_build_object(
    'paymentId', bal."paymentId",
    'installmentPlanId', bal."installmentPlanId",
    'refundId', bal."refundId",
    'message', bal."message"
  ) || COALESCE(bal."metadata"::jsonb, '{}'::jsonb),
  bal."createdAt",
  bal."createdAt"
FROM "BillingAuditLog" bal
LEFT JOIN "Order" o ON o."id" = bal."orderId"
ON CONFLICT ("id") DO NOTHING;
