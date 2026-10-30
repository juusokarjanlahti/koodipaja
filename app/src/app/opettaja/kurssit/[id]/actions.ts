"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { retryFailedGrades } from "@/lib/lti/grade-sync";
import { isTeacherOf } from "@/lib/teacher/course";

/** Teacher-only: send the failed grade transfers of this course to Moodle again. */
export async function retryGradesAction(courseId: number): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !(await isTeacherOf(user.id, courseId))) throw new Error("Forbidden");
  await retryFailedGrades(courseId);
  revalidatePath(`/opettaja/kurssit/${courseId}`);
}
