import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const adsTable = pgTable("ads", {
  id: uuid("id").defaultRandom().primaryKey(),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  imagePath: text("image_path"),
  linkUrl: text("link_url"),
  active: boolean("active").notNull().default(false),
  advertiserEmail: text("advertiser_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
});

export type Ad = typeof adsTable.$inferSelect;
