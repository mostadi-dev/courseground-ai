import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const apiUrl = process.env.API_URL;

async function getAccessToken() {
  const cookieStore = await cookies();

  return cookieStore.get(
    "courseground_access_token",
  )?.value;
}

export async function GET() {
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
      `${apiUrl}/courses`,
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

export async function POST(request: Request) {
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
    const requestBody = await request.json();

    const apiResponse = await fetch(
      `${apiUrl}/courses`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    const data = await apiResponse.json();

    return NextResponse.json(data, {
      status: apiResponse.status,
    });
  } catch {
    return NextResponse.json(
      { detail: "Course creation service is unavailable" },
      { status: 502 },
    );
  }
}