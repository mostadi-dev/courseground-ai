"use client";

import { useEffect, useState } from "react";

type Course = {
  id: string;
};

type Document = {
  id: string;
};

export default function DashboardSummary() {
  const [courseCount, setCourseCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSummary() {
      try {
        const courseResponse = await fetch("/api/courses", {
          cache: "no-store",
        });

        const courseData = await courseResponse.json();

        if (!courseResponse.ok) {
          setError(
            courseData.detail ??
              "Unable to load dashboard statistics",
          );
          return;
        }

        const courses = courseData as Course[];
        setCourseCount(courses.length);

        const documentRequests = courses.map(
          async (course) => {
            const response = await fetch(
              `/api/courses/${course.id}/documents`,
              {
                cache: "no-store",
              },
            );

            if (!response.ok) {
              return [] as Document[];
            }

            return (await response.json()) as Document[];
          },
        );

        const documentGroups = await Promise.all(
          documentRequests,
        );

        const totalDocuments = documentGroups.reduce(
          (total, documents) => total + documents.length,
          0,
        );

        setDocumentCount(totalDocuments);
      } catch {
        setError("Unable to load dashboard statistics");
      } finally {
        setIsLoading(false);
      }
    }

    loadSummary();
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
        {error}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm text-slate-400">
          Courses
        </p>

        <p className="mt-3 text-3xl font-bold">
          {isLoading ? "…" : courseCount}
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Available course workspaces.
        </p>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm text-slate-400">
          Documents
        </p>

        <p className="mt-3 text-3xl font-bold">
          {isLoading ? "…" : documentCount}
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Uploaded learning materials.
        </p>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm text-slate-400">
          AI readiness
        </p>

        <p className="mt-3 text-3xl font-bold text-cyan-400">
          Day 1
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Secure application foundation established.
        </p>
      </article>
    </div>
  );
}