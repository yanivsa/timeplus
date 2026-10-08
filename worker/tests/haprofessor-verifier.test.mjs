import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const sourceUrl = new URL('../src/haprofessor-verifier.ts', import.meta.url);
const source = readFileSync(sourceUrl, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    strict: true,
  },
}).outputText;
const moduleShim = { exports: {} };
new Function('module', 'exports', compiled)(moduleShim, moduleShim.exports);
const { evaluateHaprofessorExtraction, isHaprofessorRules } = moduleShim.exports;

function extraction(overrides = {}) {
  return {
    visibleUrl: 'https://online.haprofessor.com/exams/13/3944275/summary',
    completionHeading: 'סיימתם את המבחן!',
    resultText: 'ענית נכון על 7 שאלות מתוך 10 שאלות',
    successRateText: 'שיעור הצלחה 70%',
    correctAnswers: 7,
    totalQuestions: 10,
    displayedPercentage: 70,
    subjectBreakdown: [{ name: 'צורות ברצף', correct: 7, total: 10 }],
    ...overrides,
  };
}

test('awards exactly one minute per correct answer, never total questions or percentage', () => {
  const result = evaluateHaprofessorExtraction(extraction());
  assert.equal(result.decision, 'verified');
  assert.equal(result.correctAnswers, 7);
  assert.equal(result.totalQuestions, 10);
  assert.equal(result.minutesToAward, 7);
  assert.equal(result.examId, '3944275');
  assert.equal(result.courseId, '13');
});

test('accepts Haprofessor integer percentage rounding such as 7/8 shown as 87%', () => {
  const result = evaluateHaprofessorExtraction(extraction({
    visibleUrl: 'https://online.haprofessor.com/exams/17/3946718/summary',
    resultText: 'ענית נכון על 7 שאלות מתוך 8 שאלות',
    successRateText: 'שיעור הצלחה 87%',
    correctAnswers: 7,
    totalQuestions: 8,
    displayedPercentage: 87,
    subjectBreakdown: [
      { name: 'English - Grammar', correct: 4, total: 4 },
      { name: 'english unseen', correct: 3, total: 4 },
    ],
  }));
  assert.equal(result.decision, 'verified');
  assert.equal(result.minutesToAward, 7);
});

test('supports varying course IDs and uses the last path ID as the exam ID', () => {
  const result = evaluateHaprofessorExtraction(extraction({
    visibleUrl: 'https://online.haprofessor.com/exams/27990/3970081/summary',
    resultText: 'ענית נכון על 4 שאלות מתוך 5 שאלות',
    successRateText: 'שיעור הצלחה 80%',
    correctAnswers: 4,
    totalQuestions: 5,
    displayedPercentage: 80,
    subjectBreakdown: [{ name: 'שאלות גרירה', correct: 4, total: 5 }],
  }));
  assert.equal(result.decision, 'verified');
  assert.equal(result.courseId, '27990');
  assert.equal(result.examId, '3970081');
  assert.equal(result.minutesToAward, 4);
});

test('does not treat repeated educational content as a duplicate when exam IDs differ', () => {
  const first = evaluateHaprofessorExtraction(extraction({
    visibleUrl: 'https://online.haprofessor.com/exams/801/3947132/summary',
  }));
  const second = evaluateHaprofessorExtraction(extraction({
    visibleUrl: 'https://online.haprofessor.com/exams/801/3946728/summary',
  }));
  assert.equal(first.decision, 'verified');
  assert.equal(second.decision, 'verified');
  assert.notEqual(first.examId, second.examId);
});

test('fails closed when the percentage contradicts the explicit X/Y result', () => {
  const result = evaluateHaprofessorExtraction(extraction({
    displayedPercentage: 90,
    successRateText: 'שיעור הצלחה 90%',
  }));
  assert.equal(result.decision, 'needs_review');
  assert.equal(result.minutesToAward, 0);
  assert.ok(result.riskFlags.includes('percentage_mismatch'));
});

test('fails closed when the summary URL or exam ID is not readable', () => {
  const result = evaluateHaprofessorExtraction(extraction({ visibleUrl: '' }));
  assert.equal(result.decision, 'needs_review');
  assert.equal(result.examId, null);
  assert.equal(result.minutesToAward, 0);
});

test('rejects a clearly different host instead of guessing', () => {
  const result = evaluateHaprofessorExtraction(extraction({
    visibleUrl: 'https://example.com/exams/13/3944275/summary',
  }));
  assert.equal(result.decision, 'not_verified');
  assert.equal(result.minutesToAward, 0);
  assert.ok(result.riskFlags.includes('wrong_provider'));
});

test('fails closed if a complete subject checksum contradicts the headline result', () => {
  const result = evaluateHaprofessorExtraction(extraction({
    subjectBreakdown: [{ name: 'צורות ברצף', correct: 6, total: 10 }],
  }));
  assert.equal(result.decision, 'needs_review');
  assert.equal(result.minutesToAward, 0);
  assert.ok(result.riskFlags.includes('subject_breakdown_mismatch'));
});

test('recognizes only the explicit Haprofessor dynamic-reward rule', () => {
  assert.equal(isHaprofessorRules({
    activityType: 'haprofessor_exam_result',
    provider: 'haprofessor',
    rewardPolicy: 'correct_answers',
  }), true);
  assert.equal(isHaprofessorRules({ activityType: 'educational_result_screenshot' }), false);
});
