import { getSessionUser } from './auth';
import { generateId } from './crypto';
import { resolveEvidenceRetention } from './evidence-retention';
import { approveTask, rejectTask } from './tasks';
import { Env } from './types';

function json(data: unknown, status = 200): Response { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }); }
function errorJson(message: string, status = 400): Response { return json({ success: false, error: message }, status); }
async function findEvidenceSubmission(env:Env,familyId:string,id:string){ return env.DB.prepare(`SELECT ts.id,ts.task_instance_id,ts.status,ts.review_mode,ts.verification_status,ti.family_id,ti.child_id,ti.title,ti.status AS task_status FROM task_submissions ts JOIN task_instances ti ON ti.id=ts.task_instance_id WHERE ts.id=? AND ti.family_id=? AND ts.media_kind IS NOT NULL`).bind(id,familyId).first<any>(); }
async function findEvidenceByTask(env:Env,familyId:string,id:string){ return env.DB.prepare(`SELECT ts.id,ts.task_instance_id,ts.status,ts.review_mode,ts.verification_status,ti.family_id,ti.child_id,ti.title,ti.status AS task_status FROM task_submissions ts JOIN task_instances ti ON ti.id=ts.task_instance_id WHERE ts.task_instance_id=? AND ti.family_id=? AND ts.media_kind IS NOT NULL ORDER BY ts.submitted_at DESC LIMIT 1`).bind(id,familyId).first<any>(); }
async function audit(env:Env,familyId:string,id:string,action:string,metadata:unknown){ await env.DB.prepare(`INSERT INTO audit_log (id,family_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,?,'parent','parent',?,'task_submission',?,?,?)`).bind(generateId(),familyId,action,id,JSON.stringify(metadata??{}),new Date().toISOString()).run(); }

async function approveEvidence(env:Env,familyId:string,s:any,body:any):Promise<Response>{
 const custom=body.rewardMinutes!==undefined?Number(body.rewardMinutes):undefined; const r=await approveTask(env.DB,s.task_instance_id,familyId,custom,'parent'); if(!r.success)return errorJson(r.error||'אישור המשימה נכשל',400);
 const now=new Date().toISOString(); await env.DB.prepare(`UPDATE task_submissions SET verification_status='verified',review_mode='parent',reviewed_at=?,status='approved' WHERE id=?`).bind(now,s.id).run();
 if((r.minutesAwarded||0)>0) await env.DB.prepare(`UPDATE minute_transactions SET evidence_submission_id=? WHERE id=(SELECT id FROM minute_transactions WHERE task_instance_id=? AND evidence_submission_id IS NULL ORDER BY created_at DESC LIMIT 1)`).bind(s.id,s.task_instance_id).run();
 const ret=await resolveEvidenceRetention(env.DB,s.id); await audit(env,familyId,s.id,'evidence_parent_approved',{taskInstanceId:s.task_instance_id,minutesAwarded:r.minutesAwarded||0,xpAwarded:r.xpAwarded||0,evidenceExpiresAt:ret.expiresAt});
 return json({success:true,message:'התיעוד והמשימה אושרו בהצלחה',minutesAwarded:r.minutesAwarded||0,xpAwarded:r.xpAwarded||0,evidenceExpiresAt:ret.expiresAt});
}
async function rejectEvidence(env:Env,familyId:string,s:any,body:any):Promise<Response>{
 const reason=String(body.reason||'הראיה אינה מספיקה').slice(0,500); const r=await rejectTask(env.DB,s.task_instance_id,familyId,reason); if(!r.success)return errorJson(r.error||'דחיית המשימה נכשלה',400);
 const now=new Date().toISOString(); await env.DB.prepare(`UPDATE task_submissions SET verification_status='needs_parent_review',review_mode='parent',reviewed_at=?,status='rejected',verification_summary=? WHERE id=?`).bind(now,`ההורה דחה את הראיה: ${reason}`,s.id).run();
 const ret=await resolveEvidenceRetention(env.DB,s.id); await audit(env,familyId,s.id,'evidence_parent_rejected',{taskInstanceId:s.task_instance_id,reason,evidenceExpiresAt:ret.expiresAt}); return json({success:true,message:'הראיה נדחתה וניתן להגיש מחדש',evidenceExpiresAt:ret.expiresAt});
}
async function adjustEvidenceAward(env:Env,familyId:string,s:any,body:any):Promise<Response>{
 if(s.task_status!=='approved'||s.status!=='approved')return errorJson('ניתן לשנות דקות רק לאחר אישור המשימה',409); const delta=Number(body.minutesDelta); if(!Number.isInteger(delta)||delta===0||Math.abs(delta)>600)return errorJson('שינוי הדקות חייב להיות מספר שלם בין ‎-600 ל-600 ואינו יכול להיות 0',400);
 const reason=String(body.reason||'תיקון זיכוי תיעוד').trim().slice(0,500); const child=await env.DB.prepare(`SELECT available_minutes FROM children WHERE id=? AND family_id=?`).bind(s.child_id,familyId).first<{available_minutes:number}>(); if(!child)return errorJson('הילד לא נמצא',404);
 const prev=Number(child.available_minutes||0), next=prev+delta; if(next<0)return errorJson('התיקון ייצור יתרה שלילית; יש לבחור סכום קטן יותר',400); const now=new Date().toISOString(), tx=generateId();
 await env.DB.batch([env.DB.prepare(`UPDATE children SET available_minutes=?,updated_at=? WHERE id=? AND family_id=?`).bind(next,now,s.child_id,familyId),env.DB.prepare(`INSERT INTO minute_transactions (id,family_id,child_id,type,amount,balance_after,reason,task_instance_id,evidence_submission_id,created_by,created_at) VALUES (?,?,?,'adjustment',?,?,?,?,?,'parent',?)`).bind(tx,familyId,s.child_id,delta,next,reason,s.task_instance_id,s.id,now)]);
 await audit(env,familyId,s.id,'evidence_parent_adjusted',{transactionId:tx,minutesDelta:delta,previousBalance:prev,newBalance:next,reason}); return json({success:true,message:'הדקות תוקנו באמצעות תנועת איזון',minutesDelta:delta,newBalance:next,transactionId:tx});
}
export async function handleEvidenceReviewRequest(request:Request,env:Env):Promise<Response|null>{
 if(request.method.toUpperCase()!=='POST')return null; const url=new URL(request.url); const a=url.pathname.match(/^\/api\/parent\/evidence\/([^/]+)\/approve$/), r=url.pathname.match(/^\/api\/parent\/evidence\/([^/]+)\/reject$/), j=url.pathname.match(/^\/api\/parent\/evidence\/([^/]+)\/adjust$/), t=url.pathname.match(/^\/api\/parent\/tasks\/([^/]+)\/approve$/); if(!a&&!r&&!j&&!t)return null;
 const u=await getSessionUser(request,env.DB); if(!u)return errorJson('נדרשת התחברות למערכת',401); if(u.role!=='parent')return errorJson('פעולה זו מורשית להורים בלבד',403); const s=t?await findEvidenceByTask(env,u.familyId,t[1]):await findEvidenceSubmission(env,u.familyId,(a||r||j)![1]); if(!s&&t)return null; if(!s)return errorJson('הגשת הראיה לא נמצאה',404); const body=await request.json().catch(()=>({})) as any; if(r)return rejectEvidence(env,u.familyId,s,body); if(j)return adjustEvidenceAward(env,u.familyId,s,body); return approveEvidence(env,u.familyId,s,body);
}
