ALTER TABLE donor_submissions ADD COLUMN email_claimed_at TEXT;
ALTER TABLE donor_submissions ADD COLUMN email_sent_at TEXT;
CREATE INDEX IF NOT EXISTS donor_submissions_email_queue
  ON donor_submissions (payment_status, email_sent_at, created_at);
