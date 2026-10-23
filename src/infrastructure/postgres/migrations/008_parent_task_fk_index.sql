-- Cover the self-referential parent_task_id foreign key for task-tree lookups.
-- Safe to rerun and does not change existing task data.
CREATE INDEX IF NOT EXISTS ai_mission_tasks_parent_task_id_idx
  ON public.ai_mission_tasks (parent_task_id);
