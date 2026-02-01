-- Add mentions column to posts table
ALTER TABLE "posts" ADD COLUMN "mentions" text[];

-- Create GIN index for efficient array containment queries
CREATE INDEX "idx_posts_mentions" ON "posts" USING GIN ("mentions");
