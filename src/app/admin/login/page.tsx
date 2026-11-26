import Link from "next/link";
import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/booking/security";
import { LoginForm } from "@/components/admin/login-form";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Resort team sign-in",
  robots: { index: false, follow: false },
};
export default async function LoginPage() {
  if (await currentStaff()) redirect("/admin/dashboard/");
  return (
    <div className="admin-auth">
      <aside className="admin-auth-story">
        <div className="auth-brand">
          paraiso<small>DE JUNE QUIXOTE · ECOFARM RESORT</small>
        </div>
        <div>
          <h2>
            Thoughtful stays.
            <br />
            Seamless days.
          </h2>
          <p>
            A considered space for the team behind every memorable Paraiso
            visit.
          </p>
        </div>
        <small>RESORT MANAGEMENT · ASIA / MANILA</small>
      </aside>
      <div className="admin-auth-main">
        <section className="admin-auth-form">
          <span className="workspace-eyebrow">PARAISO / RESORT TEAM</span>
          <h1>A warm welcome back.</h1>
          <p>
            Sign in with your authorized resort account to manage reservations
            and daily operations.
          </p>
          <LoginForm />
          <p className="auth-help">
            Need access or password assistance? Contact your resort
            administrator.
          </p>
          <Link href="/">Return to the resort website</Link>
        </section>
      </div>
    </div>
  );
}
