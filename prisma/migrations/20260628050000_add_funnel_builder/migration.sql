-- CreateEnum
CREATE TYPE "FunnelStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FunnelStepType" AS ENUM ('LANDING', 'LEAD_CAPTURE', 'CHECKOUT', 'UPSELL', 'DOWNSELL', 'THANK_YOU');

-- CreateEnum
CREATE TYPE "FunnelVisitStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "FunnelEventType" AS ENUM ('FUNNEL_ENTER', 'STEP_VIEW', 'FORM_SUBMIT', 'CHECKOUT_START', 'ORDER_BUMP_ADDED', 'UPSELL_VIEW', 'UPSELL_ACCEPT', 'UPSELL_DECLINE', 'FUNNEL_COMPLETE');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "checkoutSessionKey" TEXT,
ADD COLUMN     "funnelId" TEXT,
ADD COLUMN     "funnelStepId" TEXT,
ADD COLUMN     "funnelVisitId" TEXT,
ADD COLUMN     "orderBumpAmount" DECIMAL(10,2),
ADD COLUMN     "orderBumpSelected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "orderBumpTitle" TEXT;

-- CreateTable
CREATE TABLE "Funnel" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "FunnelStatus" NOT NULL DEFAULT 'DRAFT',
    "settings" JSONB,
    "entryStepId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelStep" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FunnelStepType" NOT NULL,
    "order" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "transitions" JSONB,
    "abTestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "splitPercent" INTEGER NOT NULL DEFAULT 50,
    "variantA" JSONB,
    "variantB" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunnelStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelVisit" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "userId" TEXT,
    "currentStepId" TEXT,
    "status" "FunnelVisitStatus" NOT NULL DEFAULT 'ACTIVE',
    "leadName" TEXT,
    "leadEmail" TEXT,
    "telegramUsername" TEXT,
    "utm" JSONB,
    "variantAssignments" JSONB,
    "metadata" JSONB,
    "completedAt" TIMESTAMP(3),
    "lastEventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunnelVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelEvent" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "funnelVisitId" TEXT NOT NULL,
    "stepId" TEXT,
    "type" "FunnelEventType" NOT NULL,
    "variant" TEXT,
    "eventKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Funnel_slug_key" ON "Funnel"("slug");

-- CreateIndex
CREATE INDEX "Funnel_authorId_status_idx" ON "Funnel"("authorId", "status");

-- CreateIndex
CREATE INDEX "Funnel_courseId_idx" ON "Funnel"("courseId");

-- CreateIndex
CREATE INDEX "FunnelStep_funnelId_type_idx" ON "FunnelStep"("funnelId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelStep_funnelId_key_key" ON "FunnelStep"("funnelId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelStep_funnelId_order_key" ON "FunnelStep"("funnelId", "order");

-- CreateIndex
CREATE INDEX "FunnelVisit_funnelId_status_createdAt_idx" ON "FunnelVisit"("funnelId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "FunnelVisit_userId_idx" ON "FunnelVisit"("userId");

-- CreateIndex
CREATE INDEX "FunnelVisit_leadEmail_idx" ON "FunnelVisit"("leadEmail");

-- CreateIndex
CREATE INDEX "FunnelEvent_funnelId_type_createdAt_idx" ON "FunnelEvent"("funnelId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "FunnelEvent_stepId_type_createdAt_idx" ON "FunnelEvent"("stepId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelEvent_funnelVisitId_eventKey_key" ON "FunnelEvent"("funnelVisitId", "eventKey");

-- CreateIndex
CREATE UNIQUE INDEX "Order_checkoutSessionKey_key" ON "Order"("checkoutSessionKey");

-- CreateIndex
CREATE INDEX "Order_funnelId_idx" ON "Order"("funnelId");

-- CreateIndex
CREATE INDEX "Order_funnelStepId_idx" ON "Order"("funnelStepId");

-- CreateIndex
CREATE INDEX "Order_funnelVisitId_idx" ON "Order"("funnelVisitId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_funnelStepId_fkey" FOREIGN KEY ("funnelStepId") REFERENCES "FunnelStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_funnelVisitId_fkey" FOREIGN KEY ("funnelVisitId") REFERENCES "FunnelVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funnel" ADD CONSTRAINT "Funnel_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funnel" ADD CONSTRAINT "Funnel_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funnel" ADD CONSTRAINT "Funnel_entryStepId_fkey" FOREIGN KEY ("entryStepId") REFERENCES "FunnelStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelStep" ADD CONSTRAINT "FunnelStep_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelVisit" ADD CONSTRAINT "FunnelVisit_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelVisit" ADD CONSTRAINT "FunnelVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelVisit" ADD CONSTRAINT "FunnelVisit_currentStepId_fkey" FOREIGN KEY ("currentStepId") REFERENCES "FunnelStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelEvent" ADD CONSTRAINT "FunnelEvent_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelEvent" ADD CONSTRAINT "FunnelEvent_funnelVisitId_fkey" FOREIGN KEY ("funnelVisitId") REFERENCES "FunnelVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelEvent" ADD CONSTRAINT "FunnelEvent_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "FunnelStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

