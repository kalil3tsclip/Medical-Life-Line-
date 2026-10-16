-- Safe to run on every deploy: creates missing tables only, never changes or deletes data.
CREATE TABLE IF NOT EXISTS `availability_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `blocks_date` ON `availability_blocks` (`date`);
CREATE TABLE IF NOT EXISTS `ride_requests` (
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

CREATE INDEX IF NOT EXISTS `rides_date_status` ON `ride_requests` (`date`,`status`);
CREATE INDEX IF NOT EXISTS `rides_phone` ON `ride_requests` (`phone`);
CREATE TABLE IF NOT EXISTS `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
