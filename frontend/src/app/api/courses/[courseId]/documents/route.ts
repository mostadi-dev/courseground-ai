import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const apiUrl = process.env.API_URL;

type RouteContext = {
  params: Promise<{
    courseId: string;
  }>;
};

async function getAccessToken() {
  const cookieStore = await cookies();

  return cookieStore.get(
    "courseground_access_token",
  )?.value;
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const { courseId } = await context.params;
  const token = await getAccessToken();

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
      `${apiUrl}/courses/${courseId}/documents`,
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
      { detail: "Document service is unavailable" },
      { status: 502 },
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  const { courseId } = await context.params;
  const token = await getAccessToken();

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
    const formData = await request.formData();

    const apiResponse = await fetch(
      `${apiUrl}/courses/${courseId}/documents`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      },
    );

    const data = await apiResponse.json();

    return NextResponse.json(data, {
      status: apiResponse.status,
    });
  } catch {
    return NextResponse.json(
      { detail: "Document upload service is unavailable" },
      { status: 502 },
    );
  }
}