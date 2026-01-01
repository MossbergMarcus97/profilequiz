import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";

async function loginAction(formData: FormData) {
  "use server";
  const pass = formData.get("password") as string;
  const correctPass = process.env.ADMIN_PASSWORD;
  
  console.log("Login attempt - password length:", pass?.length);
  console.log("Expected password length:", correctPass?.length);
  console.log("Password match:", pass === correctPass);
  
  if (pass && correctPass && pass.trim() === correctPass.trim()) {
    cookies().set("admin_pass", pass.trim(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    redirect("/admin");
  }
  
  // If we get here, login failed - redirect with error
  redirect("/admin?error=invalid");
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const adminCookie = cookies().get("admin_pass")?.value;
  const correctPass = process.env.ADMIN_PASSWORD;

  if (adminCookie !== correctPass) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold">Admin Login</h1>
        {searchParams.error === "invalid" && (
          <p className="text-red-500 text-sm">Invalid password. Please try again.</p>
        )}
        <form action={loginAction} className="flex flex-col space-y-2">
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="border p-2 rounded"
          />
          <button type="submit" className="bg-primary text-primary-foreground p-2 rounded">
            Login
          </button>
        </form>
      </div>
    );
  }

  const tests = await prisma.test.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-serif font-bold">Admin Dashboard</h1>
        <Link
          href="/admin/tests/new"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg"
        >
          Create New Test
        </Link>
      </div>

      <div className="grid gap-4">
        {tests.map((test) => (
          <div key={test.id} className="border p-4 rounded-xl flex justify-between items-center bg-white shadow-sm">
            <div>
              <h2 className="font-bold text-lg">{test.title}</h2>
              <p className="text-muted-foreground text-sm">/t/{test.slug}</p>
            </div>
            <div className="flex space-x-2">
              <Link href={`/admin/tests/${test.id}`} className="text-primary hover:underline">
                Edit
              </Link>
              <Link href={`/t/${test.slug}`} target="_blank" className="text-muted-foreground hover:underline">
                View Public
              </Link>
            </div>
          </div>
        ))}
        {tests.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No tests created yet.</p>
        )}
      </div>
    </div>
  );
}

