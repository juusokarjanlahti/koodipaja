"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { MAX_GUIDE_LENGTH, saveCourseGuide } from "@/lib/guides";
import { MAX_HELP_REPLY, answerHelpRequest } from "@/lib/help/requests";
import { retryFailedGrades } from "@/lib/lti/grade-sync";
import { isTeacherOf } from "@/lib/teacher/course";

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
