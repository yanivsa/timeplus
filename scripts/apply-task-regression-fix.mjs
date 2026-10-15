import { readFileSync, writeFileSync } from 'node:fs';

function ensureReplacement(source, before, after, label) {
  if (source.includes(after)) return source;
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected one source pattern for ${label}, found ${count}`);
  return source.replace(before, after);
}

const parentPath = 'web/src/screens/ParentDashboard.tsx';
let parent = readFileSync(parentPath, 'utf8');

parent = ensureReplacement(
  parent,
  "import React, { useState, useEffect } from 'react';",
  "import React, { useState, useEffect, useRef } from 'react';",
  'React useRef import'
);

parent = ensureReplacement(
  parent,
  "  const [newTemplateModal, setNewTemplateModal] = useState(false);\n  const [templateTitle, setTemplateTitle] = useState('');",
  "  const [newTemplateModal, setNewTemplateModal] = useState(false);\n  const [creatingTemplate, setCreatingTemplate] = useState(false);\n  const creatingTemplateRef = useRef(false);\n  const taskCreationRequestIdRef = useRef<string | null>(null);\n  const [templateTitle, setTemplateTitle] = useState('');",
  'task creation guard state'
);

parent = ensureReplacement(
  parent,
  "  const handleCreateTemplate = async (e: React.FormEvent) => {\n    e.preventDefault();\n    audio.playTap();\n\n    try {",
  "  const handleCreateTemplate = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (creatingTemplateRef.current) return;\n\n    creatingTemplateRef.current = true;\n    setCreatingTemplate(true);\n    const clientRequestId =\n      taskCreationRequestIdRef.current ||\n      globalThis.crypto?.randomUUID?.() ||\n      `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;\n    taskCreationRequestIdRef.current = clientRequestId;\n    audio.playTap();\n\n    try {",
  'create handler concurrency guard'
);

parent = parent.replace(
  /(?:          clientRequestId,\n)+(?=          title: templateTitle\.trim\(\),)/g,
  '          clientRequestId,\n'
);
if (!parent.includes("          clientRequestId,\n          title: templateTitle.trim(),")) {
  parent = ensureReplacement(
    parent,
    "          title: templateTitle.trim(),\n          description: templateDescription.trim() || null,",
    "          clientRequestId,\n          title: templateTitle.trim(),\n          description: templateDescription.trim() || null,",
    'client request id payload'
  );
}

parent = ensureReplacement(
  parent,
  "      setTemplateAiEnabled(false); setTemplateAllowVideo(false); setTemplateAutoApprove(false); setTemplateAiInstructions('');\n      setStatusMessage({ text: 'תבנית המשימה נוצרה בהצלחה!', type: 'success' });",
  "      setTemplateAiEnabled(false); setTemplateAllowVideo(false); setTemplateAutoApprove(false); setTemplateAiInstructions('');\n      taskCreationRequestIdRef.current = null;\n      setStatusMessage({ text: 'תבנית המשימה נוצרה בהצלחה!', type: 'success' });",
  'reset request id after success'
);

parent = ensureReplacement(
  parent,
  "    } catch (err: any) {\n      audio.playReject();\n      setStatusMessage({ text: err.message || 'יצירת תבנית נכשלה', type: 'error' });\n    }\n  };\n\n  // Archive Template",
  "    } catch (err: any) {\n      audio.playReject();\n      setStatusMessage({ text: err.message || 'יצירת תבנית נכשלה', type: 'error' });\n    } finally {\n      creatingTemplateRef.current = false;\n      setCreatingTemplate(false);\n    }\n  };\n\n  // Archive Template",
  'release creation guard'
);

parent = ensureReplacement(
  parent,
  "              <button\n                type=\"submit\"\n                className=\"w-full py-3 rounded-2xl font-bold text-night-950 bg-gradient-to-r from-gold-400 to-amber-400 text-sm shadow-md\"\n              >\n                צור משימה\n              </button>",
  "              <button\n                type=\"submit\"\n                disabled={creatingTemplate}\n                className=\"w-full py-3 rounded-2xl font-bold text-night-950 bg-gradient-to-r from-gold-400 to-amber-400 text-sm shadow-md disabled:opacity-60 disabled:cursor-not-allowed\"\n              >\n                {creatingTemplate ? 'יוצר משימה...' : 'צור משימה'}\n              </button>",
  'disable create button while submitting'
);

writeFileSync(parentPath, parent);

const workerPath = 'worker/src/index.ts';
let worker = readFileSync(workerPath, 'utf8');

const oldVisibility = "           WHERE ti.child_id = ? AND (ti.due_date = ? OR ti.status = 'submitted')";
const newVisibility = "           WHERE ti.child_id = ? AND (\n             ti.due_date = ?\n             OR ti.status = 'submitted'\n             OR (tt.schedule_type = 'repeatable' AND ti.status IN ('open','rejected'))\n           )";
const visibilityCount = worker.split(oldVisibility).length - 1;
if (visibilityCount > 0) worker = worker.split(oldVisibility).join(newVisibility);
if (!worker.includes(newVisibility)) throw new Error('Repeatable-task visibility patch is missing');

const requestIdLine = "        const clientRequestId = typeof body.clientRequestId === 'string' ? body.clientRequestId.trim() : '';\n";
while (worker.includes(requestIdLine + requestIdLine)) {
  worker = worker.replace(requestIdLine + requestIdLine, requestIdLine);
}
if (!worker.includes(requestIdLine)) {
  worker = ensureReplacement(
    worker,
    "        const title = body.title?.trim();\n        const description = body.description?.trim() || null;",
    requestIdLine + "        const title = body.title?.trim();\n        const description = body.description?.trim() || null;",
    'server idempotency key parsing'
  );
}

const validationBlock = "        if (clientRequestId && !/^[A-Za-z0-9._:-]{8,160}$/.test(clientRequestId)) {\n          return errorJson('מזהה בקשה אינו תקין', 400);\n        }\n";
while (worker.includes(validationBlock + validationBlock)) {
  worker = worker.replace(validationBlock + validationBlock, validationBlock);
}
if (!worker.includes(validationBlock)) {
  worker = ensureReplacement(
    worker,
    "        if (!title) return errorJson('כותרת משימה נדרשת', 400);\n",
    "        if (!title) return errorJson('כותרת משימה נדרשת', 400);\n" + validationBlock,
    'server idempotency key validation'
  );
}

worker = ensureReplacement(
  worker,
  "        const templateId = generateId();\n        const now = new Date().toISOString();\n\n        await env.DB.prepare(\n          `INSERT INTO task_templates (",
  "        const templateId = clientRequestId\n          ? `tplreq:${user.familyId}:${clientRequestId}`\n          : generateId();\n        const now = new Date().toISOString();\n\n        await env.DB.prepare(\n          `INSERT OR IGNORE INTO task_templates (",
  'idempotent template insert'
);

writeFileSync(workerPath, worker);

console.log('Task regression source is normalized and fixed.');
