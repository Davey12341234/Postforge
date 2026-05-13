CREATE TABLE "user_wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_id" varchar(256) NOT NULL,
	"email" varchar(512),
	"stripe_customer_id" varchar(256),
	"credits" integer DEFAULT 0 NOT NULL,
	"plan_id" varchar(32) DEFAULT 'free' NOT NULL,
	"accrual_month" varchar(7) NOT NULL,
	"welcome_applied" boolean DEFAULT false NOT NULL,
	"wallet_version" smallint DEFAULT 1 NOT NULL,
	"stripe_subscription_id" varchar(256),
	"stripe_subscription_status" varchar(64),
	"stripe_price_id" varchar(256),
	"payment_alert" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_wallets_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "user_wallets_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
