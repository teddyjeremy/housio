-- Pins the search path of the pure refund helper (flagged by the database linter).
alter function app.refund_for(text, int, int, date, timestamptz) set search_path = app;
