ALTER TABLE "superadmin"
ADD COLUMN "reset_token_hash" TEXT,
ADD COLUMN "reset_token_expires_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "superadmin_reset_token_hash_key"
ON "superadmin"("reset_token_hash");
