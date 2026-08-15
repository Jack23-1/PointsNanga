CREATE TABLE "teacher_grade_drafts" (
  "id" TEXT NOT NULL,
  "assignment_id" BIGINT NOT NULL,
  "period_id" BIGINT NOT NULL,
  "enrollment_id" BIGINT NOT NULL,
  "value" DECIMAL(6,2) NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "teacher_grade_drafts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "teacher_grade_drafts_assignment_id_period_id_enrollment_id_key"
  ON "teacher_grade_drafts"("assignment_id", "period_id", "enrollment_id");
CREATE INDEX "teacher_grade_drafts_assignment_id_period_id_idx"
  ON "teacher_grade_drafts"("assignment_id", "period_id");
