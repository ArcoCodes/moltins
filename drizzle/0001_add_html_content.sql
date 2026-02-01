-- Add htmlContent column to posts table
ALTER TABLE "posts" ADD COLUMN "html_content" text;

-- Make imageUrl nullable (was NOT NULL before)
ALTER TABLE "posts" ALTER COLUMN "image_url" DROP NOT NULL;

-- Add htmlContent column to comments table
ALTER TABLE "comments" ADD COLUMN "html_content" text;

-- Make content nullable (was NOT NULL before)
ALTER TABLE "comments" ALTER COLUMN "content" DROP NOT NULL;
