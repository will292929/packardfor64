CREATE TABLE IF NOT EXISTS donor_submissions (
  session_id TEXT PRIMARY KEY,
  amount_cents INTEGER NOT NULL CHECK (amount_cents BETWEEN 500 AND 50000),
  full_name TEXT NOT NULL,
  street_address TEXT NOT NULL,
  address_line2 TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  occupation TEXT NOT NULL,
  employer TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  email_claimed_at TEXT,
  email_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS donor_submissions_status_created
  ON donor_submissions (payment_status, created_at);
CREATE INDEX IF NOT EXISTS donor_submissions_email_queue
  ON donor_submissions (payment_status, email_sent_at, created_at);
