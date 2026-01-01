import { cookies } from "next/headers";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export default async function AdminPage() {
  const adminCookie = cookies().get("admin_pass")?.value;
  const correctPass = process.env.ADMIN_PASSWORD;

  if (adminCookie !== correctPass) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold">Admin Login</h1>
        <AdminLoginForm />
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
