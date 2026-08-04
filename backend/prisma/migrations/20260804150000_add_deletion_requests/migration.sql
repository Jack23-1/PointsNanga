CREATE TABLE "deletion_requests" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_label" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "data_summary" JSONB,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deletion_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "deletion_requests_status_created_at_idx"
ON "deletion_requests"("status", "created_at");

CREATE INDEX "deletion_requests_entity_type_entity_id_idx"
ON "deletion_requests"("entity_type", "entity_id");
