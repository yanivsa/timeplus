-- Isolated local D1 fixture for the audio evidence end-to-end regression.
-- These tokens are not credentials for production and never leave the CI runner.
INSERT INTO families(id, name, parent_pin_hash, parent_pin_salt, is_initialized)
 VALUES('audio_qa_family', 'QA local family', 'qa', 'qa', 1);
INSERT INTO family_settings(family_id, allow_photo_proof) VALUES ('audio_qa_family', 1);
INSERT INTO children(id, family_id, name, pin_hash, pin_salt, available_minutes)
 VALUES('audio_qa_child', 'audio_qa_family', 'QA child', 'qa', 'qa', 0);
INSERT INTO child_progress(child_id, family_id, level, xp)
 VALUES('audio_qa_child', 'audio_qa_family', 1, 0);
INSERT INTO task_instances(id, family_id, child_id, title, reward_minutes, status, due_date, task_kind)
 VALUES('audio_qa_reading', 'audio_qa_family', 'audio_qa_child', 'קריאה באנגלית', 3, 'open', '2099-12-31', 'bonus');
INSERT INTO task_instances(id, family_id, child_id, title, reward_minutes, status, due_date, task_kind)
 VALUES('audio_qa_math', 'audio_qa_family', 'audio_qa_child', 'מתמטיקה', 3, 'open', '2099-12-31', 'bonus');
INSERT INTO sessions(id, family_id, role, child_id, expires_at)
 VALUES('qa-audio-child-local-only', 'audio_qa_family', 'child', 'audio_qa_child', '2099-12-31T23:59:59.000Z');
INSERT INTO sessions(id, family_id, role, child_id, expires_at)
 VALUES('qa-audio-parent-local-only', 'audio_qa_family', 'parent', NULL, '2099-12-31T23:59:59.000Z');
