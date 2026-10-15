import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const requests = sqliteTable("ride_requests", {
 id:text("id").primaryKey(), name:text("name").notNull(), phone:text("phone").notNull(), email:text("email").notNull(),
 date:text("date").notNull(), start:integer("start").notNull(), end:integer("end").notNull(),
 details:text("details").notNull(), estimate:text("estimate").notNull(), status:text("status").notNull().default("quoted"),
 payment:text("payment").notNull().default("unpaid"), created:text("created").notNull()
},t=>[index("rides_date_status").on(t.date,t.status),index("rides_phone").on(t.phone)]);
export const blocks=sqliteTable("availability_blocks",{id:text("id").primaryKey(),date:text("date").notNull(),start:integer("start").notNull(),end:integer("end").notNull()},t=>[index("blocks_date").on(t.date)]);
