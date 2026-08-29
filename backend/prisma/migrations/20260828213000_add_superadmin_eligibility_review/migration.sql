ALTER TABLE ordered_student_checks
  ADD COLUMN submitted_to_super_admin_at TIMESTAMPTZ,
  ADD COLUMN is_super_admin_approved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN super_admin_approved_at TIMESTAMPTZ;

CREATE INDEX ordered_student_checks_submitted_to_super_admin_at_idx
  ON ordered_student_checks (submitted_to_super_admin_at);

CREATE INDEX ordered_student_checks_is_super_admin_approved_idx
  ON ordered_student_checks (is_super_admin_approved);
