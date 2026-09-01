"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

type Course = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  instructor_id: string;
  created_at: string;
};

type CourseListProps = {
  canCreate?: boolean;
};

export default function CourseList({
  canCreate = false,
}: CourseListProps) {
  const [courses, setCourses] = useState<Course[]>([]);

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    async function loadCourses() {
      try {
        const response = await fetch("/api/courses", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.detail ?? "Unable to load courses");
          return;
        }

        setCourses(data);
      } catch {
        setError("Unable to connect to the course service");
      } finally {
        setIsLoading(false);
      }
    }

    loadCourses();
  }, []);

  async function handleCreateCourse(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setIsCreating(true);

    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code.trim(),
          title: title.trim(),
          description: description.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (typeof data.detail === "string") {
          setError(data.detail);
        } else {
          setError(
            "Check the course information and try again.",
          );
        }

        return;
      }

      setCourses((currentCourses) => [
        data,
        ...currentCourses,
      ]);

      setCode("");
      setTitle("");
      setDescription("");
      setShowForm(false);
      setSuccess(`${data.code} was created successfully.`);
    } catch {
      setError("Unable to connect to the course service");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-400">
            {courses.length}{" "}
            {courses.length === 1
              ? "course"
              : "courses"}{" "}
            available
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => {
              setShowForm(
                (currentValue) => !currentValue,
              );
              setError("");
              setSuccess("");
            }}
            className="w-fit rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            {showForm ? "Cancel" : "Create course"}
          </button>
        )}
      </div>

      {showForm && canCreate && (
        <form
          onSubmit={handleCreateCourse}
          className="mb-6 rounded-2xl border border-cyan-400/30 bg-slate-900 p-6"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
              New course
            </p>

            <h3 className="mt-2 text-xl font-bold text-white">
              Create a course workspace
            </h3>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="course-code"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Course code
              </label>

              <input
                id="course-code"
                type="text"
                required
                minLength={2}
                maxLength={30}
                pattern="[A-Za-z0-9_-]+"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value)
                }
                placeholder="CPSC-210"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              />
            </div>

            <div>
              <label
                htmlFor="course-title"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Course title
              </label>

              <input
                id="course-title"
                type="text"
                required
                minLength={2}
                maxLength={200}
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="Software Construction"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="mt-4">
            <label
              htmlFor="course-description"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Description
            </label>

            <textarea
              id="course-description"
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Describe the course and its learning goals."
              className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
            />
          </div>

          <button
            type="submit"
            disabled={
              isCreating ||
              code.trim().length < 2 ||
              title.trim().length < 2
            }
            className="mt-5 rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {isCreating ? "Creating…" : "Create course"}
          </button>
        </form>
      )}

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
        >
          {success}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-400">
          Loading courses…
        </p>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
          No courses are available yet.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="group block"
            >
              <article className="h-full rounded-2xl border border-slate-800 bg-slate-900 p-6 transition group-hover:-translate-y-1 group-hover:border-cyan-400/50 group-hover:shadow-lg group-hover:shadow-cyan-950/30">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-cyan-400">
                      {course.code}
                    </p>

                    <h3 className="mt-2 text-xl font-bold text-white transition group-hover:text-cyan-100">
                      {course.title}
                    </h3>
                  </div>

                  <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
                    Active
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-400">
                  {course.description ??
                    "No description provided."}
                </p>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <p className="text-xs text-slate-500">
                    Created{" "}
                    {new Date(
                      course.created_at,
                    ).toLocaleDateString()}
                  </p>

                  <span className="text-sm font-medium text-cyan-400 opacity-0 transition group-hover:opacity-100">
                    Open course →
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}