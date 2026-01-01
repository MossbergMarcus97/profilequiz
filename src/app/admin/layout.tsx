import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminCookie = cookies().get("admin_pass")?.value;
  const correctPass = process.env.ADMIN_PASSWORD;

  if (adminCookie !== correctPass) {
    // We'll handle the login in the admin/page.tsx
    // but this layout will be shared.
  }

  return <div className="max-w-5xl mx-auto p-4 md:p-8">{children}</div>;
}

