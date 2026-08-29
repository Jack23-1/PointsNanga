CREATE TABLE "ordered_student_checks" (
  "id" TEXT NOT NULL,
  "school_id" BIGINT NOT NULL,
  "enrollment_id" BIGINT NOT NULL,
  "period_id" BIGINT NOT NULL,
  "is_in_order" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ordered_student_checks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ordered_student_checks_school_id_enrollment_id_period_id_key"
ON "ordered_student_checks"("school_id", "enrollment_id", "period_id");

CREATE INDEX "ordered_student_checks_school_id_period_id_idx"
ON "ordered_student_checks"("school_id", "period_id");

CREATE INDEX "ordered_student_checks_enrollment_id_idx"
ON "ordered_student_checks"("enrollment_id");
