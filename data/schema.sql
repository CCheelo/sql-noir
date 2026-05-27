-- schema.sql
-- All table definitions for SQL Noir: Case File 74/LKS/1147
-- Hand-edit this file to change the database structure.
-- After changes, re-run: node scripts/build-seed.js

-- Every named person in the world of the case.
-- Players discover what each person is connected to by querying other tables.
CREATE TABLE IF NOT EXISTS people (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  alias       TEXT,
  dob         TEXT,
  gender      TEXT,
  occupation  TEXT,
  address_id  TEXT,
  notes       TEXT
);

-- Physical addresses for people, venues, and crime scenes.
CREATE TABLE IF NOT EXISTS addresses (
  id           TEXT PRIMARY KEY,
  street       TEXT,
  neighborhood TEXT,
  city         TEXT DEFAULT 'Lusaka',
  type         TEXT  -- 'residence', 'business', 'venue', 'crime_scene'
);

-- Telephone call records. caller_id and receiver_id reference people.id.
-- 'exchange' is the telephone exchange name (e.g. 'Livingstone', 'NCCM-Central').
CREATE TABLE IF NOT EXISTS phone_calls (
  id           INTEGER PRIMARY KEY,
  caller_id    TEXT,
  receiver_id  TEXT,
  date         TEXT,
  time         TEXT,
  duration_min INTEGER,
  exchange     TEXT,
  notes        TEXT
);

-- Formal interview statements taken by CID officers.
-- statement is the full text of what the subject said.
CREATE TABLE IF NOT EXISTS interviews (
  id          INTEGER PRIMARY KEY,
  subject_id  TEXT,
  officer_id  TEXT,
  date        TEXT,
  location    TEXT,
  statement   TEXT
);

-- Official crime scene documentation.
CREATE TABLE IF NOT EXISTS crime_scene_reports (
  id          INTEGER PRIMARY KEY,
  location_id TEXT,
  date        TEXT,
  time        TEXT,
  officer_id  TEXT,
  description TEXT
);

-- Physical evidence items logged from crime scenes.
CREATE TABLE IF NOT EXISTS evidence (
  id             INTEGER PRIMARY KEY,
  report_id      INTEGER,
  item           TEXT,
  description    TEXT,
  location_found TEXT
);

-- Bank transaction records from Standard Chartered.
-- txn_type: 'deposit' or 'withdrawal'. amount in kwacha (K).
CREATE TABLE IF NOT EXISTS bank_records (
  id          INTEGER PRIMARY KEY,
  person_id   TEXT,
  date        TEXT,
  amount      REAL,
  txn_type    TEXT,
  memo        TEXT
);

-- Witness accounts of seeing a person at a specific place and time.
CREATE TABLE IF NOT EXISTS sightings (
  id          INTEGER PRIMARY KEY,
  subject_id  TEXT,
  location_id TEXT,
  date        TEXT,
  time        TEXT,
  witness_id  TEXT,
  notes       TEXT
);

-- Vehicle registration records.
CREATE TABLE IF NOT EXISTS vehicles (
  id       INTEGER PRIMARY KEY,
  owner_id TEXT,
  make     TEXT,
  model    TEXT,
  year     INTEGER,
  plate    TEXT,
  color    TEXT
);

-- Performance bookings at venues. Links a performer to a venue and time slot.
CREATE TABLE IF NOT EXISTS club_bookings (
  id           INTEGER PRIMARY KEY,
  venue        TEXT,
  performer_id TEXT,
  date         TEXT,
  set_start    TEXT,
  set_end      TEXT,
  fee          REAL
);

-- Articles and notices from Times of Zambia and Zambia Daily Mail.
-- body is the full article text.
CREATE TABLE IF NOT EXISTS newspaper_archive (
  id        INTEGER PRIMARY KEY,
  date      TEXT,
  headline  TEXT,
  section   TEXT,
  author_id TEXT,
  body      TEXT
);

-- Internal CID shift logs, case notes, and administrative records.
CREATE TABLE IF NOT EXISTS precinct_logs (
  id          INTEGER PRIMARY KEY,
  date        TEXT,
  officer_id  TEXT,
  entry_type  TEXT,  -- 'shift_log', 'case_note', 'missing_persons', 'admin'
  notes       TEXT
);

-- Social and professional connections between people.
-- type: 'employer', 'employee', 'romantic', 'family', 'business', 'acquaintance', 'rival'
CREATE TABLE IF NOT EXISTS relationships (
  id           INTEGER PRIMARY KEY,
  person_a_id  TEXT,
  person_b_id  TEXT,
  type         TEXT,
  notes        TEXT
);

-- Internal CID memoranda. Not listed in the Schema tab. Discoverable only
-- by querying sqlite_master. Reward for the curious detective.
CREATE TABLE IF NOT EXISTS confidential_notes (
  id            INTEGER PRIMARY KEY,
  date          TEXT,
  author_badge  TEXT,
  classification TEXT,
  content       TEXT
);
