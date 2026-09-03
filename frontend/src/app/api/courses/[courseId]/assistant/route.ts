import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    courseId: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
) {
  const apiUrl = process.env.API_URL;
  const cookieStore = await cookies();
  const token = cookieStore.get(
    "courseground_access_token",
  )?.value;

  const { courseId } = await context.params;

  if (!token) {
    return NextResponse.json(
      {
        detail: "Not authenticated",
      },
      {
        status: 401,
      },
    );
  }

  if (!apiUrl) {
    return NextResponse.json(
      {
        detail: "API_URL is not configured",
      },
      {
        status: 500,
      },
    );
  }

  try {
    const requestBody = await request.json();

    const apiResponse = await fetch(
      `${apiUrl}/courses/${courseId}/assistant`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        cache: "no-store",
      },
    );

    const data = await apiResponse.json();

    return NextResponse.json(data, {
      status: apiResponse.status,
    });
  } catch {
    return NextResponse.json(
      {
        detail: "Instructor assistant service is unavailable",
      },
      {
        status: 502,
      },
    );
  }
}