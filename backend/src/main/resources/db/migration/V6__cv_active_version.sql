-- An active CV is a selection; uploaded objects and application snapshots stay immutable.
ALTER TABLE cv_versions ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT FALSE;

WITH latest AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY candidate_id ORDER BY created_at DESC, id DESC) AS position
    FROM cv_versions
)
UPDATE cv_versions SET is_active = TRUE
WHERE id IN (SELECT id FROM latest WHERE position = 1);

CREATE UNIQUE INDEX uq_cv_versions_active_candidate ON cv_versions(candidate_id) WHERE is_active;
