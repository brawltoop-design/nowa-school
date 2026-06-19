-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('COMPLETION', 'VERIFIED_SKILL', 'EXPERT_REVIEWED');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('PENDING', 'ISSUED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CertificateReviewerType" AS ENUM ('AI', 'AUTHOR', 'EXPERT', 'ADMIN');

-- CreateEnum
CREATE TYPE "CertificateSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'NEEDS_REVISION');

-- AlterTable
ALTER TABLE "Badge" ADD COLUMN     "certificateId" TEXT,
ADD COLUMN     "level" TEXT,
ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "courseId" DROP NOT NULL,
ALTER COLUMN "condition" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "CertificateType" NOT NULL,
    "track" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skills" JSONB NOT NULL,
    "criteria" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'PENDING',
    "projectUrl" TEXT,
    "demoVideoUrl" TEXT,
    "repositoryUrl" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateReview" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewerType" "CertificateReviewerType" NOT NULL,
    "score" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "rubric" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificateReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "projectTitle" TEXT NOT NULL,
    "projectDescription" TEXT NOT NULL,
    "projectUrl" TEXT NOT NULL,
    "demoVideoUrl" TEXT,
    "repositoryUrl" TEXT,
    "files" JSONB NOT NULL,
    "status" "CertificateSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_certificateId_key" ON "Certificate"("certificateId");

-- CreateIndex
CREATE INDEX "Certificate_userId_idx" ON "Certificate"("userId");

-- CreateIndex
CREATE INDEX "Certificate_courseId_idx" ON "Certificate"("courseId");

-- CreateIndex
CREATE INDEX "Certificate_authorId_idx" ON "Certificate"("authorId");

-- CreateIndex
CREATE INDEX "Certificate_status_idx" ON "Certificate"("status");

-- CreateIndex
CREATE INDEX "CertificateReview_certificateId_idx" ON "CertificateReview"("certificateId");

-- CreateIndex
CREATE INDEX "CertificateReview_reviewerId_idx" ON "CertificateReview"("reviewerId");

-- CreateIndex
CREATE INDEX "CertificateSubmission_courseId_idx" ON "CertificateSubmission"("courseId");

-- CreateIndex
CREATE INDEX "CertificateSubmission_status_idx" ON "CertificateSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateSubmission_userId_courseId_key" ON "CertificateSubmission"("userId", "courseId");

-- CreateIndex
CREATE INDEX "Badge_certificateId_idx" ON "Badge"("certificateId");

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateReview" ADD CONSTRAINT "CertificateReview_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateReview" ADD CONSTRAINT "CertificateReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateSubmission" ADD CONSTRAINT "CertificateSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateSubmission" ADD CONSTRAINT "CertificateSubmission_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
