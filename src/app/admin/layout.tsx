import { Icon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { requireAdmin } from "@/lib/auth/session";
import { initials } from "@/lib/format";
import { logoutAction } from "./actions";
import { AdminNav } from "./nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-8">
            <Logo href="/admin/mous" />
            <div className="hidden sm:block"><AdminNav /></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-sm font-bold text-navy" title={admin.email}>
                {initials(admin.name)}
              </span>
              <span className="hidden text-sm font-medium text-white md:block">{admin.name}</span>
            </div>
            <form action={logoutAction}>
              <button className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-white/20 px-3 text-sm font-medium text-white/85 transition hover:border-white/50 hover:bg-white/10 hover:text-white" aria-label="Sign out">
                <Icon name="logout" className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 pt-1 sm:hidden"><AdminNav compact /></div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t border-navy/10 py-5 text-center text-xs text-slate">
        LexGo Solutions. Agreements and billing.
      </footer>
    </div>
  );
}
