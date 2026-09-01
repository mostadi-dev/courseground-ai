import { NextResponse } from "next/server";

type LoginRequest = {
  email?: unknown;
  password?: unknown;
};

export async function POST(request: Request) {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    return NextResponse.json(
      { detail: "API_URL is not configured" },
      { status: 500 },
    );
  }

  let body: LoginRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "Invalid request body" },
      { status: 400 },
    );
  }

  if (
    typeof body.email !== "string" ||
    typeof body.password !== "string" ||
    !body.email.trim() ||
    !body.password
  ) {
    return NextResponse.json(
      { detail: "Email and password are required" },
      { status: 400 },
    );
  }

  const formData = new URLSearchParams();
  formData.set("username", body.email.trim().toLowerCase());
  formData.set("password", body.password);

  try {
    const apiResponse = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
      cache: "no-store",
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return NextResponse.json(
        { detail: data.detail ?? "Login failed" },
        { status: apiResponse.status },
      );
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set(
      "courseground_access_token",
      data.access_token,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
      },
    );

    return response;
  } catch {
    return NextResponse.json(
      { detail: "Authentication service is unavailable" },
      { status: 502 },
    );
  }
}