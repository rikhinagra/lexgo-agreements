import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { getCurrentAdmin } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const POINTS: { icon: IconName; title: string; text: string }[] = [
  { icon: "document", title: "Agreements in minutes", text: "Send a prefilled MOU and get it signed online." },
  { icon: "bolt", title: "Invoices on autopilot", text: "Pro rated and monthly invoices go out on schedule." },
  { icon: "shield", title: "Secure by design", text: "Every signature and change is recorded and protected." },
];

function Heading({ className = "" }: { className?: string }) {
  return (
    <h1 className={`font-display font-bold leading-[1.15] text-white ${className}`}>
      Agreements and billing, <span className="text-gold">made simple.</span>
    </h1>
  );
}

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin/mous");
  return (
    <main className="flex min-h-dvh flex-1 flex-col lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Navy brand area. On phones and tablets it is the top of the page, on laptops it is the left side. */}
      <section className="relative overflow-hidden bg-navy px-6 pb-20 pt-8 text-white sm:px-12 sm:pb-24 sm:pt-12 lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-light-gold/10 blur-3xl" />
        <div className="relative"><Logo /></div>
        <div className="relative mt-8 max-w-md lg:mt-0">
          <Heading className="text-3xl sm:text-4xl lg:text-[2.6rem]" />
          <ul className="mt-10 hidden space-y-6 lg:block">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-gold">
                  <Icon name={p.icon} />
                </span>
                <span>
                  <span className="block font-semibold">{p.title}</span>
                  <span className="block text-sm text-white/65">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative hidden text-xs text-white/45 lg:block">LexGo Solutions. Internal tool.</p>
      </section>

      {/* Form area. On phones and tablets the card overlaps the navy area above it. */}
      <section className="relative flex flex-1 flex-col justify-center px-6 pb-12 sm:px-12 lg:py-12">
        <div className="fade-up relative z-10 mx-auto -mt-14 w-full max-w-md sm:-mt-16 lg:mt-0 lg:max-w-sm">
          <div className="mb-8 hidden lg:block">
            <h2 className="font-display text-3xl font-bold">Welcome back</h2>
            <p className="mt-2 text-slate">Sign in to manage agreements and invoices.</p>
          </div>
          <div className="card p-7 shadow-pop lg:shadow-card">
            <div className="mb-6 lg:hidden">
              <h2 className="font-display text-2xl font-bold">Welcome back</h2>
              <p className="mt-1 text-sm text-slate">Sign in to manage agreements and invoices.</p>
            </div>
            <LoginForm />
          </div>
          <p className="mt-6 text-center text-xs text-slate">
            Trouble signing in? Ask a LexGo administrator to reset your password.
          </p>
        </div>
      </section>

      {/* Navy strip at the bottom on phones and tablets, to frame the page */}
      <footer className="bg-navy px-6 py-5 text-center text-xs text-white/60 lg:hidden">
        LexGo Solutions. Internal tool.
      </footer>
    </main>
  );
}
