DROP INDEX `participants_class_name_idx`;--> statement-breakpoint
ALTER TABLE `participants` ADD `school` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `participants_class_school_name_idx` ON `participants` (`class_id`,`school`,`name`);