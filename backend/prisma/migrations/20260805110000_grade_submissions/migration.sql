CREATE TABLE "grade_submissions" (
  "id" TEXT NOT NULL,
  "titular_id" BIGINT NOT NULL,
  "period_id" BIGINT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "grade_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "grade_submissions_titular_id_period_id_key"
ON "grade_submissions"("titular_id", "period_id");

CREATE INDEX "grade_submissions_status_submitted_at_idx"
ON "grade_submissions"("status", "submitted_at");
