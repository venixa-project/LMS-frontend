// ============================================================
// LMS - Assessment Persistence Migration Service
// Migrates legacy localStorage assessments safely to PostgreSQL
// ============================================================
import { createAssessmentApi, mapConfigToBackendPayload } from '../api/assessment.api';
import { Course, QuizAssessmentConfig } from '../types';

export interface MigrationReport {
  totalFound: number;
  migrated: number;
  skipped: number;
  errors: string[];
  timestamp: string;
}

const MIGRATION_FLAG_KEY = 'venilearn_assessments_pg_migrated_v1';

/**
 * Checks if migration has already run successfully
 */
export function isAssessmentMigrationCompleted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
}

/**
 * Execute safe idempotent migration of localStorage assessments into PostgreSQL
 */
export async function migrateLocalStorageAssessmentsToPostgres(): Promise<MigrationReport> {
  const report: MigrationReport = {
    totalFound: 0,
    migrated: 0,
    skipped: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  if (typeof window === 'undefined') return report;

  try {
    // 1. Inspect localStorage courses
    const rawCourses = localStorage.getItem('venilearn_courses');
    const courses: Course[] = rawCourses ? JSON.parse(rawCourses) : [];

    let coursesModified = false;

    for (const course of courses) {
      const courseId = course.id;

      // A. Final Assessment
      if (
        course.finalAssessment &&
        course.finalAssessment.questions &&
        course.finalAssessment.questions.length > 0
      ) {
        report.totalFound++;
        const finalAsm = course.finalAssessment as QuizAssessmentConfig & { _migratedToPgId?: string };

        if (finalAsm._migratedToPgId) {
          report.skipped++;
        } else {
          try {
            const payload = mapConfigToBackendPayload(finalAsm, { courseId });
            const created = await createAssessmentApi(payload);
            finalAsm._migratedToPgId = created.id;
            report.migrated++;
            coursesModified = true;
          } catch (err: any) {
            report.errors.push(`Final assessment for "${course.title}": ${err.message || err}`);
          }
        }
      }

      // B. Module & Lesson Assessments
      if (course.modules && Array.isArray(course.modules)) {
        for (const moduleItem of course.modules) {
          const moduleId = moduleItem.id;

          // Module Assessment
          if (
            moduleItem.assessment &&
            moduleItem.assessment.questions &&
            moduleItem.assessment.questions.length > 0
          ) {
            report.totalFound++;
            const modAsm = moduleItem.assessment as QuizAssessmentConfig & { _migratedToPgId?: string };

            if (modAsm._migratedToPgId) {
              report.skipped++;
            } else {
              try {
                const payload = mapConfigToBackendPayload(modAsm, { courseId, moduleId });
                const created = await createAssessmentApi(payload);
                modAsm._migratedToPgId = created.id;
                report.migrated++;
                coursesModified = true;
              } catch (err: any) {
                report.errors.push(`Module assessment for "${moduleItem.title}": ${err.message || err}`);
              }
            }
          }

          // Lesson Quizzes
          if (moduleItem.lessons && Array.isArray(moduleItem.lessons)) {
            for (const lesson of moduleItem.lessons) {
              const lessonId = lesson.id;
              if (
                lesson.quizConfig &&
                lesson.quizConfig.questions &&
                lesson.quizConfig.questions.length > 0
              ) {
                report.totalFound++;
                const quizAsm = lesson.quizConfig as QuizAssessmentConfig & { _migratedToPgId?: string };

                if (quizAsm._migratedToPgId) {
                  report.skipped++;
                } else {
                  try {
                    const payload = mapConfigToBackendPayload(quizAsm, { courseId, moduleId, lessonId });
                    const created = await createAssessmentApi(payload);
                    quizAsm._migratedToPgId = created.id;
                    report.migrated++;
                    coursesModified = true;
                  } catch (err: any) {
                    report.errors.push(`Lesson quiz for "${lesson.title}": ${err.message || err}`);
                  }
                }
              }
            }
          }
        }
      }
    }

    // 2. Save back courses with migration markers (NEVER deletes localStorage data!)
    if (coursesModified) {
      localStorage.setItem('venilearn_courses', JSON.stringify(courses));
    }

    if (report.errors.length === 0) {
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    }
  } catch (globalErr: any) {
    report.errors.push(`Migration exception: ${globalErr.message || globalErr}`);
  }

  return report;
}

