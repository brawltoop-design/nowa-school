DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentFlowType') THEN
    CREATE TYPE "PaymentFlowType" AS ENUM ('FULL', 'INSTALLMENT');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethodKind') THEN
    CREATE TYPE "PaymentMethodKind" AS ENUM ('CARD', 'SBP', 'INSTALLMENT');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentGatewayProvider') THEN
    CREATE TYPE "PaymentGatewayProvider" AS ENUM ('MOCK', 'STRIPE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InstallmentGatewayProvider') THEN
    CREATE TYPE "InstallmentGatewayProvider" AS ENUM ('MOCK', 'TINKOFF');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentRecordStatus') THEN
    CREATE TYPE "PaymentRecordStatus" AS ENUM (
      'PENDING',
      'REQUIRES_ACTION',
      'SUCCEEDED',
      'FAILED',
      'CANCELLED',
      'REFUNDED',
      'PARTIALLY_REFUNDED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InstallmentPlanStatus') THEN
    CREATE TYPE "InstallmentPlanStatus" AS ENUM (
      'PENDING',
      'APPROVED',
      'DECLINED',
      'ACTIVE',
      'FAILED',
      'CANCELLED',
      'COMPLETED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TariffStatus') THEN
    CREATE TYPE "TariffStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PromocodeDiscountType') THEN
    CREATE TYPE "PromocodeDiscountType" AS ENUM ('PERCENT', 'FIXED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RefundStatus') THEN
    CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayoutStatus') THEN
    CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'REVERSED', 'FAILED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingEventType') THEN
    CREATE TYPE "BillingEventType" AS ENUM (
      'ORDER_CREATED',
      'CHECKOUT_START',
      'PAYMENT_PENDING',
      'PAYMENT_SUCCEEDED',
      'PAYMENT_FAILED',
      'INSTALLMENT_SELECTED',
      'REFUND_ISSUED',
      'ACCESS_GRANTED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WebhookProviderScope') THEN
    CREATE TYPE "WebhookProviderScope" AS ENUM ('PAYMENT', 'INSTALLMENT');
  END IF;
END $$;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "amountMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "authorRevenueMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "billingEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "billingFullName" TEXT,
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS "discountMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "installmentProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "offerUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paymentFlow" "PaymentFlowType" NOT NULL DEFAULT 'FULL',
  ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethodKind" NOT NULL DEFAULT 'CARD',
  ADD COLUMN IF NOT EXISTS "platformFeeMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "productTitleSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "promocodeId" TEXT,
  ADD COLUMN IF NOT EXISTS "promocodeSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "refundPolicyUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "refundedMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "subtotalMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tariffId" TEXT,
  ADD COLUMN IF NOT EXISTS "tariffTitleSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "Tariff" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "priceMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" "TariffStatus" NOT NULL DEFAULT 'ACTIVE',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "features" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tariff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Promocode" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "courseId" TEXT,
  "tariffId" TEXT,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "discountType" "PromocodeDiscountType" NOT NULL,
  "percentOff" INTEGER,
  "amountOffMinor" INTEGER,
  "currency" TEXT,
  "maxRedemptions" INTEGER,
  "redemptionsCount" INTEGER NOT NULL DEFAULT 0,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Promocode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "provider" "PaymentGatewayProvider" NOT NULL,
  "providerPaymentId" TEXT,
  "method" "PaymentMethodKind" NOT NULL,
  "status" "PaymentRecordStatus" NOT NULL DEFAULT 'PENDING',
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "confirmationUrl" TEXT,
  "providerSessionId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "metadata" JSONB,
  "confirmedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InstallmentPlan" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "provider" "InstallmentGatewayProvider" NOT NULL,
  "providerPlanId" TEXT,
  "status" "InstallmentPlanStatus" NOT NULL DEFAULT 'PENDING',
  "redirectUrl" TEXT,
  "metadata" JSONB,
  "approvedAt" TIMESTAMP(3),
  "declinedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InstallmentPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Refund" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "paymentId" TEXT,
  "amountMinor" INTEGER NOT NULL,
  "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
  "providerRefundId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "reason" TEXT,
  "metadata" JSONB,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Payout" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "orderId" TEXT,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
  "scheduledAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "reversedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProviderWebhookEvent" (
  "id" TEXT NOT NULL,
  "scope" "WebhookProviderScope" NOT NULL,
  "provider" TEXT NOT NULL,
  "externalEventId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
  "orderId" TEXT,
  "paymentId" TEXT,
  "installmentPlanId" TEXT,
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BillingAuditLog" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "orderId" TEXT,
  "paymentId" TEXT,
  "installmentPlanId" TEXT,
  "refundId" TEXT,
  "type" "BillingEventType" NOT NULL,
  "message" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Tariff_courseId_status_idx" ON "Tariff"("courseId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "Tariff_courseId_slug_key" ON "Tariff"("courseId", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Tariff_courseId_sortOrder_key" ON "Tariff"("courseId", "sortOrder");
CREATE UNIQUE INDEX IF NOT EXISTS "Promocode_code_key" ON "Promocode"("code");
CREATE INDEX IF NOT EXISTS "Promocode_authorId_isActive_validUntil_idx" ON "Promocode"("authorId", "isActive", "validUntil");
CREATE INDEX IF NOT EXISTS "Promocode_courseId_idx" ON "Promocode"("courseId");
CREATE INDEX IF NOT EXISTS "Promocode_tariffId_idx" ON "Promocode"("tariffId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "Payment_orderId_status_idx" ON "Payment"("orderId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_provider_providerPaymentId_key" ON "Payment"("provider", "providerPaymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "InstallmentPlan_orderId_key" ON "InstallmentPlan"("orderId");
CREATE INDEX IF NOT EXISTS "InstallmentPlan_status_createdAt_idx" ON "InstallmentPlan"("status", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "InstallmentPlan_provider_providerPlanId_key" ON "InstallmentPlan"("provider", "providerPlanId");
CREATE UNIQUE INDEX IF NOT EXISTS "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "Refund_orderId_status_idx" ON "Refund"("orderId", "status");
CREATE INDEX IF NOT EXISTS "Refund_paymentId_idx" ON "Refund"("paymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payout_orderId_key" ON "Payout"("orderId");
CREATE INDEX IF NOT EXISTS "Payout_authorId_status_createdAt_idx" ON "Payout"("authorId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "ProviderWebhookEvent_orderId_createdAt_idx" ON "ProviderWebhookEvent"("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProviderWebhookEvent_paymentId_createdAt_idx" ON "ProviderWebhookEvent"("paymentId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProviderWebhookEvent_installmentPlanId_createdAt_idx" ON "ProviderWebhookEvent"("installmentPlanId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ProviderWebhookEvent_scope_provider_externalEventId_key" ON "ProviderWebhookEvent"("scope", "provider", "externalEventId");
CREATE INDEX IF NOT EXISTS "BillingAuditLog_authorId_type_createdAt_idx" ON "BillingAuditLog"("authorId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "BillingAuditLog_orderId_createdAt_idx" ON "BillingAuditLog"("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_tariffId_idx" ON "Order"("tariffId");
CREATE INDEX IF NOT EXISTS "Order_promocodeId_idx" ON "Order"("promocodeId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_tariffId_fkey') THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_tariffId_fkey"
      FOREIGN KEY ("tariffId") REFERENCES "Tariff"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_promocodeId_fkey') THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_promocodeId_fkey"
      FOREIGN KEY ("promocodeId") REFERENCES "Promocode"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Tariff_courseId_fkey') THEN
    ALTER TABLE "Tariff"
      ADD CONSTRAINT "Tariff_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Promocode_authorId_fkey') THEN
    ALTER TABLE "Promocode"
      ADD CONSTRAINT "Promocode_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Promocode_courseId_fkey') THEN
    ALTER TABLE "Promocode"
      ADD CONSTRAINT "Promocode_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Promocode_tariffId_fkey') THEN
    ALTER TABLE "Promocode"
      ADD CONSTRAINT "Promocode_tariffId_fkey"
      FOREIGN KEY ("tariffId") REFERENCES "Tariff"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_orderId_fkey') THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "Payment_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstallmentPlan_orderId_fkey') THEN
    ALTER TABLE "InstallmentPlan"
      ADD CONSTRAINT "InstallmentPlan_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Refund_orderId_fkey') THEN
    ALTER TABLE "Refund"
      ADD CONSTRAINT "Refund_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Refund_paymentId_fkey') THEN
    ALTER TABLE "Refund"
      ADD CONSTRAINT "Refund_paymentId_fkey"
      FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payout_authorId_fkey') THEN
    ALTER TABLE "Payout"
      ADD CONSTRAINT "Payout_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payout_orderId_fkey') THEN
    ALTER TABLE "Payout"
      ADD CONSTRAINT "Payout_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProviderWebhookEvent_orderId_fkey') THEN
    ALTER TABLE "ProviderWebhookEvent"
      ADD CONSTRAINT "ProviderWebhookEvent_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProviderWebhookEvent_paymentId_fkey') THEN
    ALTER TABLE "ProviderWebhookEvent"
      ADD CONSTRAINT "ProviderWebhookEvent_paymentId_fkey"
      FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProviderWebhookEvent_installmentPlanId_fkey') THEN
    ALTER TABLE "ProviderWebhookEvent"
      ADD CONSTRAINT "ProviderWebhookEvent_installmentPlanId_fkey"
      FOREIGN KEY ("installmentPlanId") REFERENCES "InstallmentPlan"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BillingAuditLog_authorId_fkey') THEN
    ALTER TABLE "BillingAuditLog"
      ADD CONSTRAINT "BillingAuditLog_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BillingAuditLog_orderId_fkey') THEN
    ALTER TABLE "BillingAuditLog"
      ADD CONSTRAINT "BillingAuditLog_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BillingAuditLog_paymentId_fkey') THEN
    ALTER TABLE "BillingAuditLog"
      ADD CONSTRAINT "BillingAuditLog_paymentId_fkey"
      FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BillingAuditLog_installmentPlanId_fkey') THEN
    ALTER TABLE "BillingAuditLog"
      ADD CONSTRAINT "BillingAuditLog_installmentPlanId_fkey"
      FOREIGN KEY ("installmentPlanId") REFERENCES "InstallmentPlan"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BillingAuditLog_refundId_fkey') THEN
    ALTER TABLE "BillingAuditLog"
      ADD CONSTRAINT "BillingAuditLog_refundId_fkey"
      FOREIGN KEY ("refundId") REFERENCES "Refund"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE "Order" AS o
SET
  "currency" = COALESCE(NULLIF(o."currency", ''), c."currency", 'USD'),
  "amountMinor" = CASE
    WHEN o."amountMinor" = 0 THEN ROUND(COALESCE(o."amount", 0)::numeric * 100)::integer
    ELSE o."amountMinor"
  END,
  "platformFeeMinor" = CASE
    WHEN o."platformFeeMinor" = 0 THEN ROUND(COALESCE(o."platformFee", 0)::numeric * 100)::integer
    ELSE o."platformFeeMinor"
  END,
  "authorRevenueMinor" = CASE
    WHEN o."authorRevenueMinor" = 0 THEN ROUND(COALESCE(o."authorRevenue", 0)::numeric * 100)::integer
    ELSE o."authorRevenueMinor"
  END,
  "subtotalMinor" = CASE
    WHEN o."subtotalMinor" = 0 THEN ROUND(COALESCE(o."amount", 0)::numeric * 100)::integer
    ELSE o."subtotalMinor"
  END,
  "paidAt" = CASE
    WHEN o."paidAt" IS NULL AND o."status" = 'PAID' THEN o."createdAt"
    ELSE o."paidAt"
  END,
  "productTitleSnapshot" = COALESCE(o."productTitleSnapshot", c."title"),
  "offerUrl" = COALESCE(o."offerUrl", '/courses/' || c."slug"),
  "refundPolicyUrl" = COALESCE(o."refundPolicyUrl", '/courses/' || c."slug" || '#refunds'),
  "billingFullName" = COALESCE(o."billingFullName", u."name"),
  "billingEmail" = COALESCE(o."billingEmail", u."email"),
  "updatedAt" = COALESCE(o."updatedAt", o."createdAt")
FROM "Course" AS c,
     "User" AS u
WHERE c."id" = o."courseId"
  AND u."id" = o."userId";

INSERT INTO "Payment" (
  "id",
  "orderId",
  "provider",
  "providerPaymentId",
  "method",
  "status",
  "amountMinor",
  "currency",
  "idempotencyKey",
  "confirmedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  'pay_' || md5(o."id"),
  o."id",
  CASE
    WHEN UPPER(COALESCE(o."paymentProvider", 'MOCK')) = 'STRIPE' THEN 'STRIPE'::"PaymentGatewayProvider"
    ELSE 'MOCK'::"PaymentGatewayProvider"
  END,
  COALESCE(o."paymentId", 'legacy_' || o."id"),
  COALESCE(o."paymentMethod", 'CARD'::"PaymentMethodKind"),
  CASE
    WHEN o."status" = 'REFUNDED' THEN 'REFUNDED'::"PaymentRecordStatus"
    WHEN o."status" = 'PAID' THEN 'SUCCEEDED'::"PaymentRecordStatus"
    ELSE 'PENDING'::"PaymentRecordStatus"
  END,
  o."amountMinor",
  o."currency",
  'payment:' || o."id",
  CASE
    WHEN o."status" IN ('PAID', 'REFUNDED') THEN COALESCE(o."paidAt", o."createdAt")
    ELSE NULL
  END,
  o."createdAt",
  COALESCE(o."updatedAt", o."createdAt")
FROM "Order" AS o
WHERE NOT EXISTS (
  SELECT 1 FROM "Payment" AS p WHERE p."orderId" = o."id"
);

INSERT INTO "Payout" (
  "id",
  "authorId",
  "orderId",
  "amountMinor",
  "currency",
  "status",
  "scheduledAt",
  "createdAt",
  "updatedAt"
)
SELECT
  'payout_' || md5(o."id"),
  c."authorId",
  o."id",
  GREATEST(o."authorRevenueMinor" - ROUND((o."refundedMinor" * 0.85))::integer, 0),
  o."currency",
  CASE
    WHEN o."status" = 'REFUNDED' THEN 'REVERSED'::"PayoutStatus"
    ELSE 'PENDING'::"PayoutStatus"
  END,
  COALESCE(o."paidAt", o."createdAt"),
  o."createdAt",
  COALESCE(o."updatedAt", o."createdAt")
FROM "Order" AS o
JOIN "Course" AS c ON c."id" = o."courseId"
WHERE o."status" IN ('PAID', 'REFUNDED')
  AND NOT EXISTS (
    SELECT 1 FROM "Payout" AS p WHERE p."orderId" = o."id"
  );
