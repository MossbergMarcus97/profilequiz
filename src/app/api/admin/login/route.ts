import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const correctPass = process.env.ADMIN_PASSWORD;
    
    console.log("Login attempt");
    console.log("Password provided length:", password?.length);
    console.log("Expected password length:", correctPass?.length);
    
    if (!correctPass) {
      console.log("ADMIN_PASSWORD not set!");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    
    if (password === correctPass) {
      console.log("Password match - setting cookie");
      cookies().set("admin_pass", password, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return NextResponse.json({ success: true });
    }
    
    console.log("Password mismatch");
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

