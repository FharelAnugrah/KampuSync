-- 007_notifications_and_policies.sql
-- In-app notifications, configurable academic policies, announcements, and academic calendar events

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(180) NOT NULL,
  message text NOT NULL,
  target_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS academic_policies (
  key varchar(100) PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(200) NOT NULL,
  content text NOT NULL,
  category varchar(40) NOT NULL DEFAULT 'AKADEMIK',
  is_published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcements_published_idx
  ON announcements(is_published, published_at DESC);

CREATE TABLE IF NOT EXISTS academic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_period_id uuid REFERENCES academic_periods(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  event_type varchar(40) NOT NULL DEFAULT 'AKADEMIK',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academic_events_dates_chk CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS academic_events_dates_idx
  ON academic_events(start_date, end_date);
