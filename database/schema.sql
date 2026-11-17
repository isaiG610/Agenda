-- database/schema.sql
-- ------------------------------------------------------------
-- Creates the database, the single table and 4 sample rows.
-- Rubric: persistence (MySQL). Run it with:
--   mysql -u <user> -p < database/schema.sql
-- WARNING: it drops the table first, so it also RESETS the data.
-- ------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS agenda_db;
USE agenda_db;

DROP TABLE IF EXISTS agenda_items;

-- Single-table design: meetings and reminders share one table.
-- The "type" column says which class each row becomes in JavaScript.
CREATE TABLE agenda_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('meeting', 'reminder') NOT NULL,
  title VARCHAR(100) NOT NULL,
  date DATETIME NOT NULL,
  description TEXT,
  location VARCHAR(100) NULL,      -- only meetings
  minutes_before INT NULL,         -- only reminders
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data. Dates are relative to NOW() so they are always
-- in the near future, no matter when the script is run.
INSERT INTO agenda_items (type, title, date, description, location, minutes_before) VALUES
  ('meeting', 'Team sync with Isai', DATE_FORMAT(NOW() + INTERVAL 1 DAY, '%Y-%m-%d 10:00:00'),
    'Review the project progress', 'Library, room 2', NULL),
  ('meeting', 'POE final presentation', DATE_FORMAT(NOW() + INTERVAL 3 DAY, '%Y-%m-%d 12:00:00'),
    'Live demo of the agenda', 'CUT building A', NULL),
  ('reminder', 'Submit homework', DATE_FORMAT(NOW() + INTERVAL 2 DAY, '%Y-%m-%d 18:00:00'),
    'Upload the PDF to Classroom', NULL, 30),
  ('reminder', 'Buy coffee', DATE_FORMAT(NOW() + INTERVAL 5 DAY, '%Y-%m-%d 08:00:00'),
    'Before the morning class', NULL, 10);
