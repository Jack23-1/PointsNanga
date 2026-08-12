ALTER TABLE "grade_submissions"
ADD COLUMN "rejection_comment" TEXT,
ADD COLUMN "rejected_at" TIMESTAMP(3);
