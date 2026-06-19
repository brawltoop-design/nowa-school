-- CreateEnum
CREATE TYPE "SalesPageStatus" AS ENUM (
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'PUBLISHED',
  'REJECTED',
  'UNPUBLISHED'
);

-- CreateEnum
CREATE TYPE "SalesPageBlockType" AS ENUM (
  'HERO',
  'OUTCOMES',
  'WHO_IS_THIS_FOR',
  'WHAT_YOU_WILL_BUILD',
  'CURRICULUM',
  'AUTHOR',
  'FEATURES',
  'BONUSES',
  'FILES_INCLUDED',
  'TESTIMONIALS',
  'FAQ',
  'PRICING',
  'CTA',
  'COMPARISON',
  'PROCESS',
  'CERTIFICATE',
  'COMMUNITY',
  'CUSTOM_TEXT',
  'IMAGE_TEXT',
  'ICON_GRID'
);

-- CreateEnum
CREATE TYPE "SalesPageSubmissionStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

-- CreateEnum
CREATE TYPE "SalesPageAnalyticsEventType" AS ENUM (
  'PAGE_VIEW',
  'CTA_CLICK',
  'CHECKOUT_CLICK',
  'PURCHASE',
  'SCROLL_25',
  'SCROLL_50',
  'SCROLL_75',
  'SCROLL_100',
  'FAQ_OPEN',
  'VIDEO_PLAY'
);

-- CreateEnum
CREATE TYPE "ModerationIssueType" AS ENUM (
  'PROFANITY',
  'MISLEADING_CLAIM',
  'GUARANTEED_INCOME',
  'GUARANTEED_EMPLOYMENT',
  'BAD_CONTENT',
  'COPYRIGHT_RISK',
  'SPAM',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "ModerationIssueSeverity" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH'
);

-- CreateEnum
CREATE TYPE "ModerationIssueStatus" AS ENUM (
  'OPEN',
  'RESOLVED',
  'IGNORED'
);

-- CreateTable
CREATE TABLE "CourseSalesPage" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "status" "SalesPageStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL,
  "metaTitle" TEXT,
  "metaDescription" TEXT,
  "ogImage" TEXT,
  "theme" JSONB,
  "publishedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CourseSalesPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesPageBlock" (
  "id" TEXT NOT NULL,
  "salesPageId" TEXT NOT NULL,
  "type" "SalesPageBlockType" NOT NULL,
  "order" INTEGER NOT NULL,
  "title" TEXT,
  "subtitle" TEXT,
  "content" JSONB NOT NULL,
  "settings" JSONB,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SalesPageBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesPageSubmission" (
  "id" TEXT NOT NULL,
  "salesPageId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "status" "SalesPageSubmissionStatus" NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "adminComment" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SalesPageSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesPageAnalyticsEvent" (
  "id" TEXT NOT NULL,
  "salesPageId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "visitorId" TEXT,
  "userId" TEXT,
  "type" "SalesPageAnalyticsEventType" NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SalesPageAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseModerationIssue" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "salesPageId" TEXT,
  "authorId" TEXT NOT NULL,
  "type" "ModerationIssueType" NOT NULL,
  "severity" "ModerationIssueSeverity" NOT NULL,
  "message" TEXT NOT NULL,
  "fieldPath" TEXT,
  "status" "ModerationIssueStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CourseModerationIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseSalesPage_courseId_key" ON "CourseSalesPage"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseSalesPage_slug_key" ON "CourseSalesPage"("slug");

-- CreateIndex
CREATE INDEX "CourseSalesPage_status_idx" ON "CourseSalesPage"("status");

-- CreateIndex
CREATE INDEX "CourseSalesPage_reviewedById_idx" ON "CourseSalesPage"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "SalesPageBlock_salesPageId_order_key" ON "SalesPageBlock"("salesPageId", "order");

-- CreateIndex
CREATE INDEX "SalesPageBlock_salesPageId_type_idx" ON "SalesPageBlock"("salesPageId", "type");

-- CreateIndex
CREATE INDEX "SalesPageSubmission_salesPageId_idx" ON "SalesPageSubmission"("salesPageId");

-- CreateIndex
CREATE INDEX "SalesPageSubmission_authorId_idx" ON "SalesPageSubmission"("authorId");

-- CreateIndex
CREATE INDEX "SalesPageSubmission_status_idx" ON "SalesPageSubmission"("status");

-- CreateIndex
CREATE INDEX "SalesPageSubmission_reviewedById_idx" ON "SalesPageSubmission"("reviewedById");

-- CreateIndex
CREATE INDEX "SalesPageAnalyticsEvent_salesPageId_type_createdAt_idx" ON "SalesPageAnalyticsEvent"("salesPageId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "SalesPageAnalyticsEvent_courseId_type_createdAt_idx" ON "SalesPageAnalyticsEvent"("courseId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "SalesPageAnalyticsEvent_visitorId_idx" ON "SalesPageAnalyticsEvent"("visitorId");

-- CreateIndex
CREATE INDEX "SalesPageAnalyticsEvent_userId_idx" ON "SalesPageAnalyticsEvent"("userId");

-- CreateIndex
CREATE INDEX "CourseModerationIssue_courseId_idx" ON "CourseModerationIssue"("courseId");

-- CreateIndex
CREATE INDEX "CourseModerationIssue_salesPageId_idx" ON "CourseModerationIssue"("salesPageId");

-- CreateIndex
CREATE INDEX "CourseModerationIssue_authorId_idx" ON "CourseModerationIssue"("authorId");

-- CreateIndex
CREATE INDEX "CourseModerationIssue_status_severity_idx" ON "CourseModerationIssue"("status", "severity");

-- AddForeignKey
ALTER TABLE "CourseSalesPage"
ADD CONSTRAINT "CourseSalesPage_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSalesPage"
ADD CONSTRAINT "CourseSalesPage_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPageBlock"
ADD CONSTRAINT "SalesPageBlock_salesPageId_fkey"
FOREIGN KEY ("salesPageId") REFERENCES "CourseSalesPage"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPageSubmission"
ADD CONSTRAINT "SalesPageSubmission_salesPageId_fkey"
FOREIGN KEY ("salesPageId") REFERENCES "CourseSalesPage"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPageSubmission"
ADD CONSTRAINT "SalesPageSubmission_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPageSubmission"
ADD CONSTRAINT "SalesPageSubmission_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPageAnalyticsEvent"
ADD CONSTRAINT "SalesPageAnalyticsEvent_salesPageId_fkey"
FOREIGN KEY ("salesPageId") REFERENCES "CourseSalesPage"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPageAnalyticsEvent"
ADD CONSTRAINT "SalesPageAnalyticsEvent_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPageAnalyticsEvent"
ADD CONSTRAINT "SalesPageAnalyticsEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseModerationIssue"
ADD CONSTRAINT "CourseModerationIssue_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseModerationIssue"
ADD CONSTRAINT "CourseModerationIssue_salesPageId_fkey"
FOREIGN KEY ("salesPageId") REFERENCES "CourseSalesPage"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseModerationIssue"
ADD CONSTRAINT "CourseModerationIssue_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
