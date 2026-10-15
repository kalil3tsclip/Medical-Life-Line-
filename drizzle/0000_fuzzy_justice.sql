CREATE TABLE `availability_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `blocks_date` ON `availability_blocks` (`date`);--> statement-breakpoint
CREATE TABLE `ride_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`date` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`details` text NOT NULL,
	`estimate` text NOT NULL,
	`status` text DEFAULT 'quoted' NOT NULL,
	`payment` text DEFAULT 'unpaid' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rides_date_status` ON `ride_requests` (`date`,`status`);--> statement-breakpoint
CREATE INDEX `rides_phone` ON `ride_requests` (`phone`);