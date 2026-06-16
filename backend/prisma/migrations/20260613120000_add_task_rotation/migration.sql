-- Add nullable difficulty tag to tasks (used by the daily-assignment rotation cron)
ALTER TABLE "tasks" ADD COLUMN "difficulty" TEXT;

-- Backfill difficulty from the difficulty marker embedded in each task's title
UPDATE "tasks" SET "difficulty" = 'easy' WHERE "title" LIKE '%(Dễ)%';
UPDATE "tasks" SET "difficulty" = 'medium' WHERE "title" LIKE '%(Trung bình)%';
UPDATE "tasks" SET "difficulty" = 'hard' WHERE "title" LIKE '%(Khó)%';

-- Task "Level 1" (bubble_sort) has no difficulty marker in its title. Its
-- config (3-element array, stepsToPredict 2) is the smallest of all tasks —
-- even simpler than the easiest "(Dễ)" bubble_sort tasks — so it is
-- classified as easy. See CHANGES.md [2026-06-13] for the full rationale.
UPDATE "tasks" SET "difficulty" = 'easy'
WHERE "difficulty" IS NULL AND "type" = 'bubble_sort' AND "title" = 'Level 1';

-- Per-difficulty rotation state for the daily-assignment cron
CREATE TABLE "task_rotations" (
    "id" SERIAL NOT NULL,
    "difficulty" TEXT NOT NULL,
    "task_order" JSONB NOT NULL,
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_rotations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "task_rotations_difficulty_key" ON "task_rotations"("difficulty");
