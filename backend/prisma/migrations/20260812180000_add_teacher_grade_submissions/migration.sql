CREATE TABLE "teacher_grade_submissions" (
  "id" TEXT NOT NULL,
  "assignment_id" BIGINT NOT NULL,
  "period_id" BIGINT NOT NULL,
  "professor_id" BIGINT NOT NULL,
  "titular_id" BIGINT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "teacher_grade_submissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "teacher_grade_submissions_assignment_id_period_id_key" ON "teacher_grade_submissions"("assignment_id", "period_id");
CREATE INDEX "teacher_grade_submissions_titular_id_period_id_status_idx" ON "teacher_grade_submissions"("titular_id", "period_id", "status");
