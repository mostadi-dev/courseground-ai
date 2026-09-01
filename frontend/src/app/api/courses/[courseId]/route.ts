import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const apiUrl = process.env.API_URL;

type RouteContext = {
  params: Promise<{
    courseId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const { courseId } = await context.params;
  const cookieStore = await cookies();

  const token = cookieStore.get(
    "courseground_access_token",
  )?.value;

  if (!token) {
    return NextResponse.json(
      { detail: "Not authenticated" },
      { status: 401 },
    );
  }

  if (!apiUrl) {
    return NextResponse.json(
      { detail: "API_URL is not configured" },
      { status: 500 },
    );
  }

  try {
    const apiResponse = await fetch(
      `${apiUrl}/courses/${courseId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    const data = await apiResponse.json();

    return NextResponse.json(data, {
      status: apiResponse.status,
    });
  } catch {
    return NextResponse.json(
      { detail: "Course service is unavailable" },
      { status: 502 },
    );
  }
}