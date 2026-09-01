"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import CourseList from "@/components/course-list";
import DashboardSummary from "@/components/dashboard-summary";

type User = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          setError(
            data.detail ?? "Unable to load your account",
          );
          return;
        }

        setUser(data);
      } catch {
        setError("Unable to connect to the application");
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.replace("/login");
    router.refresh();
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading CourseGround…
      </main>
    );
  }

  const canCreateCourse =
    user?.role === "instructor" ||
    user?.role === "admin";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
              CourseGround AI
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Responsible AI learning assistant
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">
            {error}
          </div>
        ) : (
          <>
            <div className="mb-10">
              <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
                {user?.role.toUpperCase()}
              </p>

              <h1 className="mt-2 text-4xl font-bold">
                Welcome, {user?.full_name}
              </h1>

              <p className="mt-3 text-slate-400">
                Manage your courses, upload learning materials,
                and prepare course content for responsible AI
                assistance.
              </p>
            </div>

            <section className="mb-10">
              <div className="mb-5">
                <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
                  Your courses
                </p>

                <h2 className="mt-2 text-2xl font-bold text-white">
                  Course workspace
                </h2>
              </div>

              <CourseList canCreate={canCreateCourse} />
            </section>

            <DashboardSummary />
          </>
        )}
      </section>
    </main>
  );
}