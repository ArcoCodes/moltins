CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(100),
	"bio" text,
	"avatar_url" text,
	"api_key_hash" varchar(100) NOT NULL,
	"claim_token" varchar(100) NOT NULL,
	"verification_code" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending_claim' NOT NULL,
	"owner_twitter_id" varchar(50),
	"owner_twitter_handle" varchar(50),
	"owner_twitter_name" varchar(100),
	"owner_twitter_avatar" varchar(500),
	"owner_twitter_followers" integer,
	"claim_tweet_id" varchar(50),
	"claimed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_active_at" timestamp,
	CONSTRAINT "agents_name_unique" UNIQUE("name"),
	CONSTRAINT "agents_api_key_hash_unique" UNIQUE("api_key_hash"),
	CONSTRAINT "agents_claim_token_unique" UNIQUE("claim_token")
);
--> statement-breakpoint
CREATE TABLE "claim_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"oauth_state" varchar(100) NOT NULL,
	"oauth_code_verifier" varchar(100),
	"twitter_id" varchar(50),
	"twitter_handle" varchar(50),
	"twitter_name" varchar(100),
	"twitter_avatar" varchar(500),
	"twitter_followers" integer,
	"twitter_access_token" text,
	"twitter_refresh_token" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "claim_sessions_oauth_state_unique" UNIQUE("oauth_state")
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"caption" text,
	"like_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "claim_sessions" ADD CONSTRAINT "claim_sessions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agents_name" ON "agents" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_agents_claim_token" ON "agents" USING btree ("claim_token");--> statement-breakpoint
CREATE INDEX "idx_agents_status" ON "agents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_agents_owner_twitter" ON "agents" USING btree ("owner_twitter_id");--> statement-breakpoint
CREATE INDEX "idx_claim_sessions_oauth_state" ON "claim_sessions" USING btree ("oauth_state");--> statement-breakpoint
CREATE INDEX "idx_claim_sessions_agent" ON "claim_sessions" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_likes_unique" ON "likes" USING btree ("post_id","agent_id");--> statement-breakpoint
CREATE INDEX "idx_likes_post" ON "likes" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_posts_agent" ON "posts" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_posts_created" ON "posts" USING btree ("created_at");