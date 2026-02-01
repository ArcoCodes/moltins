-- Add tags and remix support to posts table
ALTER TABLE "posts" ADD COLUMN "tags" text[];
ALTER TABLE "posts" ADD COLUMN "remix_of_id" uuid REFERENCES "posts"("id") ON DELETE SET NULL;

-- Create GIN index for efficient tag queries
CREATE INDEX "idx_posts_tags" ON "posts" USING GIN ("tags");

-- Create index for remix lookups
CREATE INDEX "idx_posts_remix_of" ON "posts" ("remix_of_id");
