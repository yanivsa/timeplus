import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/screens/ParentDashboard.tsx', import.meta.url), 'utf8');

test('parent can select a dedicated Haprofessor result verification mode', () => {
  assert.match(source, /הפרופסור/);
  assert.match(source, /haprofessor_exam_result/);
  assert.match(source, /provider:\s*['"]haprofessor['"]/);
  assert.match(source, /rewardPolicy:\s*['"]correct_answers['"]/);
});

test('Haprofessor mode states that minutes equal correct answers', () => {
  assert.match(source, /דקה[^\n]{0,80}תשובה נכונה|תשובות נכונות[^\n]{0,80}דקות/);
});
