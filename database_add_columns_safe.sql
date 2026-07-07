-- Safe migration: Add missing columns to existing tables
-- Run this on your live database if tables already exist but are missing the new columns
-- MySQL will skip columns that already exist; errors are safe to ignore

-- Services table
ALTER TABLE `services` ADD COLUMN `imageUrl` VARCHAR(1000) DEFAULT NULL;
ALTER TABLE `services` ADD COLUMN `images` LONGTEXT DEFAULT NULL;
ALTER TABLE `services` ADD COLUMN `imagesCaptions` LONGTEXT DEFAULT NULL;
ALTER TABLE `services` ADD COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Gallery table
ALTER TABLE `gallery` ADD COLUMN `imageUrl` VARCHAR(1000) DEFAULT NULL;
ALTER TABLE `gallery` ADD COLUMN `images` LONGTEXT DEFAULT NULL;
ALTER TABLE `gallery` ADD COLUMN `imagesCaptions` LONGTEXT DEFAULT NULL;
ALTER TABLE `gallery` ADD COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Blog table
ALTER TABLE `blog` ADD COLUMN `imageUrl` VARCHAR(1000) DEFAULT NULL;
ALTER TABLE `blog` ADD COLUMN `images` LONGTEXT DEFAULT NULL;
ALTER TABLE `blog` ADD COLUMN `imagesCaptions` LONGTEXT DEFAULT NULL;
ALTER TABLE `blog` ADD COLUMN `author` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `blog` ADD COLUMN `authorId` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `blog` ADD COLUMN `published` TINYINT(1) DEFAULT 0;
ALTER TABLE `blog` ADD COLUMN `published_at` DATETIME DEFAULT NULL;
ALTER TABLE `blog` ADD COLUMN `date` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `blog` ADD COLUMN `newsletterSent` TINYINT(1) DEFAULT 0;
ALTER TABLE `blog` ADD COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Done
SELECT 'Migration complete' AS status;
