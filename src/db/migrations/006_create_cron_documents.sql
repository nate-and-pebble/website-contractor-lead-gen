-- Cron documents: markdown docs with embedded JSON config for CRON jobs
CREATE TABLE IF NOT EXISTS cron_documents (
  key         TEXT PRIMARY KEY,
  markdown    TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT,
  version     INTEGER NOT NULL DEFAULT 1,
  enabled     BOOLEAN NOT NULL DEFAULT true
);

-- Auto-update updated_at on change (reuses existing trigger function)
CREATE TRIGGER set_cron_documents_updated_at
  BEFORE UPDATE ON cron_documents
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Seed initial rows with markdown containing cron_config blocks
INSERT INTO cron_documents (key, markdown, enabled) VALUES
  ('find-leads', $md$# find-leads — Contractor Lead Search CRON Job

Automated website contractor lead discovery via web search.

```cron_config
{
  "budget_usd": 10,
  "lead_count": 20,
  "verticals": [
    "General contractors",
    "Home remodeling / renovation",
    "Roofing contractors",
    "Plumbing companies",
    "HVAC contractors",
    "Electrical contractors",
    "Landscaping / hardscaping",
    "Painting contractors",
    "Custom home builders",
    "Kitchen / bath remodeling",
    "Flooring installers",
    "Fencing / deck builders"
  ],
  "roles": [
    "Owner",
    "Founder",
    "General manager",
    "Operations manager",
    "Marketing manager",
    "Office manager"
  ],
  "enabled": true,
  "cron_schedule": "TBD"
}
```

## Rules

- One cycle per CRON run. Pick parameters once, run the command once, done.
- No reroll logic. Do not re-randomize if results are sparse.
$md$, true),
  ('hydrate', $md$# hydrate — Contractor Lead Hydration CRON Job

Automated enrichment of pending raw leads via web research.

```cron_config
{
  "budget_usd": 10,
  "lead_count": 0,
  "verticals": ["all"],
  "roles": ["all"],
  "enabled": true,
  "cron_schedule": "TBD"
}
```

## Rules

- One cycle per CRON run. Run the command once, done.
- Hydration processes whatever pending leads exist at invocation time.
$md$, true)
ON CONFLICT (key) DO NOTHING;
