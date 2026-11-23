-- database/schema.sql
-- ------------------------------------------------------------
-- Creates the database, the single table and the sample rows.
-- Rubric: persistence (MySQL). Run it with:
--   mysql -u <user> -p < database/schema.sql
-- WARNING: it drops the table first, so it also RESETS the data.
-- ------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS agenda_db;
USE agenda_db;

DROP TABLE IF EXISTS agenda_items;

-- Single-table design: activities and reminders share one table.
-- The "type" column says which class each row becomes in JavaScript.
CREATE TABLE agenda_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('activity', 'reminder') NOT NULL,
  title VARCHAR(100) NOT NULL,
  date DATETIME NOT NULL,
  description TEXT,
  location VARCHAR(100) NULL,      -- only activities
  minutes_before INT NULL,         -- only reminders
  duration_minutes INT NULL,       -- only activities
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data. Dates are relative to NOW(), so "today" is always the day
-- the script is run (for the week view) and the rest is in the next days.
INSERT INTO agenda_items (type, title, date, description, location, minutes_before, duration_minutes) VALUES
  -- Today
  ('activity', 'Data Structures class', DATE_FORMAT(NOW(), '%Y-%m-%d 15:00:00'),
    'Trees and graphs\nBring the laptop\nQuiz on Friday', 'CUT building B, room 4', NULL, 120),
  ('activity', 'Dinner with family', DATE_FORMAT(NOW(), '%Y-%m-%d 18:30:00'),
    '', 'Home', NULL, 60),
  ('activity', 'Study for the POE exam', DATE_FORMAT(NOW(), '%Y-%m-%d 20:00:00'),
    'Review the event catalog\nPractice the live demo\nRead the README', 'Library', NULL, 60),
  ('reminder', 'Upload POE homework', DATE_FORMAT(NOW(), '%Y-%m-%d 21:30:00'),
    'Upload the PDF to Classroom', NULL, 15, NULL),
  -- Next days
  ('activity', 'Team sync with Isai', DATE_FORMAT(NOW() + INTERVAL 1 DAY, '%Y-%m-%d 10:00:00'),
    'Review the project progress', 'Library, room 2', NULL, 45),
  ('activity', 'Soccer practice', DATE_FORMAT(NOW() + INTERVAL 2 DAY, '%Y-%m-%d 07:00:00'),
    'Bring water and shin guards', 'CUT sports field', NULL, 90),
  ('activity', 'POE final presentation', DATE_FORMAT(NOW() + INTERVAL 3 DAY, '%Y-%m-%d 12:00:00'),
    'Live demo of the agenda', 'CUT building A', NULL, 30),
  ('reminder', 'Submit homework', DATE_FORMAT(NOW() + INTERVAL 2 DAY, '%Y-%m-%d 18:00:00'),
    'Upload the PDF to Classroom', NULL, 30, NULL),
  ('reminder', 'Buy coffee', DATE_FORMAT(NOW() + INTERVAL 5 DAY, '%Y-%m-%d 08:00:00'),
    'Before the morning class', NULL, 10, NULL);
