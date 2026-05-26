-- Auth upgrade: OAuth, email verification, password reset
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "oauth_provider" text,
  ADD COLUMN IF NOT EXISTS "oauth_id" text,
  ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "verify_token" text,
  ADD COLUMN IF NOT EXISTS "verify_token_expires" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "reset_token" text,
  ADD COLUMN IF NOT EXISTS "reset_token_expires" timestamp with time zone;

-- Existing users created before this migration are considered verified
-- (they were able to log in, so their email was real enough)
UPDATE "users" SET "email_verified" = true WHERE "email_verified" IS NULL OR "email_verified" = false;
