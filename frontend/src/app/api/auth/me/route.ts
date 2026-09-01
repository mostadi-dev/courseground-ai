import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    return NextResponse.json(
      { detail: "API_URL is not configured" },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("courseground_access_token")?.value;

  if (!token) {
    return NextResponse.json(
      { detail: "Not authenticated" },
      { status: 401 },
    );
  }

  try {
    const apiResponse = await fetch(`${apiUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      const response = NextResponse.json(
        { detail: data.detail ?? "Could not load user" },
        { status: apiResponse.status },
      );

      if (apiResponse.status === 401) {
        response.cookies.delete("courseground_access_token");
      }

      return response;
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { detail: "Authentication service is unavailable" },
      { status: 502 },
    );
  }
}