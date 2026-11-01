"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { MAX_GUIDE_LENGTH, saveCourseGuide } from "@/lib/guides";
import { MAX_HELP_REPLY, answerHelpRequest } from "@/lib/help/requests";
import { retryFailedGrades } from "@/lib/lti/grade-sync";
import { isTeacherOf } from "@/lib/teacher/course";
import { MAX_APPROVAL_REASON, approveGroup, rejectGroup, revokeApproval } from "@/lib/approvals/store";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requestIds(formData: FormData): string[] {
  return String(formData.get("requestIds") ?? "")
    .split(",")
    .filter((id) => UUID.test(id))
    .slice(0, 500);
}

/**
 * Teacher-only: accept the same answer of one or more students for the whole course (#50,
 * #51). The reason is required and logged; earlier submissions are re-evaluated and grades
 * sent to Moodle.
 */
export async function approveGroupAction(courseId: number, formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !(await isTeacherOf(user.id, courseId))) throw new Error("Forbidden");
  const ids = requestIds(formData);
  const reason = String(formData.get("reason") ?? "").trim().slice(0, MAX_APPROVAL_REASON);
  if (ids.length === 0 || !reason) return;
  await approveGroup({ courseId, requestIds: ids, teacherId: user.id, reason });
  revalidatePath(`/opettaja/kurssit/${courseId}`);
}

/** Teacher-only: keep the answer failing and reply to every student who sent it; logged (#51). */
export async function rejectGroupAction(courseId: number, formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !(await isTeacherOf(user.id, courseId))) throw new Error("Forbidden");
  const ids = requestIds(formData);
  const reply = String(formData.get("reply") ?? "").trim().slice(0, MAX_HELP_REPLY);
  if (ids.length === 0 || !reply) return;
  await rejectGroup({ courseId, requestIds: ids, teacherId: user.id, reply });
  revalidatePath(`/opettaja/kurssit/${courseId}`);
}

/** Teacher-only: revoke an approval of this course. The reason is required and logged. */
export async function revokeApprovalAction(courseId: number, formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !(await isTeacherOf(user.id, courseId))) throw new Error("Forbidden");
  const approvalId = Number(formData.get("approvalId"));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, MAX_APPROVAL_REASON);
  if (!Number.isSafeInteger(approvalId) || !reason) return;
  await revokeApproval({ courseId, approvalId, teacherId: user.id, reason });
  revalidatePath(`/opettaja/kurssit/${courseId}`);
}

/** Teacher-only: send the failed grade transfers of this course to Moodle again. */
export async function retryGradesAction(courseId: number): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !(await isTeacherOf(user.id, courseId))) throw new Error("Forbidden");
  await retryFailedGrades(courseId);
  revalidatePath(`/opettaja/kurssit/${courseId}`);
}

/** Teacher-only: answer one open help request of this course. The reply is private to the student. */
export async function answerHelpAction(courseId: number, formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !(await isTeacherOf(user.id, courseId))) throw new Error("Forbidden");
  const requestId = String(formData.get("requestId") ?? "");
  const reply = String(formData.get("reply") ?? "").trim().slice(0, MAX_HELP_REPLY);
  if (!requestId || !reply) return;
  await answerHelpRequest(courseId, requestId, reply);
  revalidatePath(`/opettaja/kurssit/${courseId}`);
}

/** Teacher-only: save the course's own guide for students. */
export async function saveGuideAction(courseId: number, formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !(await isTeacherOf(user.id, courseId))) throw new Error("Forbidden");
  await saveCourseGuide(courseId, user.id, String(formData.get("markdown") ?? "").slice(0, MAX_GUIDE_LENGTH));
  revalidatePath("/ohje");
  revalidatePath(`/opettaja/kurssit/${courseId}/ohje`);
}
