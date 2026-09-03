"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DocumentManager from "@/components/document-manager";
import InstructorAssistant from "@/components/instructor-assistant";

type Course = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  instructor_id: string;
  created_at: string;
};

export default function CoursePage() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCourse() {
      if (!courseId) {
        setError("Course ID is missing");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/courses/${courseId}`,
          {
            cache: "no-store",
          },
        );

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          setError(
            data.detail ?? "Unable to load the course",
          );
          return;
        }

        setCourse(data);
      } catch {
        setError(
          "Unable to connect to the course service",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadCourse();
  }, [courseId, router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading course…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
              CourseGround AI
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Course workspace
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
          >
            Back to dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-300"
          >
            {error}
          </div>
        ) : course ? (
          <div className="space-y-8">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
                    {course.code}
                  </p>

                  <h1 className="mt-3 text-4xl font-bold">
                    {course.title}
                  </h1>

                  <p className="mt-4 max-w-3xl leading-7 text-slate-400">
                    {course.description ??
                      "No course description has been provided."}
                  </p>
                </div>

                <span className="w-fit rounded-full bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-300">
                  Active
                </span>
              </div>

              <div className="mt-8 border-t border-slate-800 pt-5">
                <p className="text-sm text-slate-500">
                  Created{" "}
                  {new Date(
                    course.created_at,
                  ).toLocaleDateString()}
                </p>
              </div>
            </section>

            <DocumentManager courseId={course.id} />

            <InstructorAssistant courseId={course.id} />
          </div>
        ) : (
          <div
            role="alert"
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-200"
          >
            Course data was not found.
          </div>
        )}
      </div>
    </main>
  );
}