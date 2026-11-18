import type { Metadata } from "next";
import { Icon, type IconName } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { MouDocumentView } from "@/components/MouDocumentView";
import { getRequestMeta } from "@/lib/auth/request";
import { formatCents } from "@/lib/billing";
import { formatDateTime, formatDay } from "@/lib/format";
import { documentForMou, lookupByToken, recordView } from "@/lib/services/client-mou";
import { QuestionForm } from "./question-form";
import { SignForm } from "./sign-form";

export const metadata: Metadata = {
  title: "Your agreement",
  robots: { index: false, follow: false },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <header className="bg-navy">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Logo />
          <span className="flex items-center gap-2 text-xs text-light-gold sm:text-sm">
            <Icon name="lock" className="h-4 w-4" /> Secure page
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <footer className="border-t border-navy/10 py-6 text-center text-xs text-slate">
        Questions? Write to <a className="font-medium text-navy underline" href="mailto:hello@lexgosolutions.com">hello@lexgosolutions.com</a>
      </footer>
    </div>
  );
}

function Unavailable({ title, text }: { title: string; text: string }) {
  return (
    <Shell>
      <div className="card mx-auto max-w-xl space-y-3 p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-navy/5 text-navy">
          <Icon name="document" className="h-7 w-7" />
        </span>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <p className="text-slate">{text}</p>
      </div>
    </Shell>
  );
}

function Stat({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-[#8a6d00]">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate">{label}</p>
        <p className="break-words font-semibold">{value}</p>
      </div>
    </div>
  );
}

export default async function ClientMouPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await lookupByToken(token);

  if (found.state === "not_found") {
    return <Unavailable title="This link is not valid" text="Please check that you copied the whole link from your email, or contact LexGo for a new one." />;
  }
  if (found.state === "expired") {
    return <Unavailable title="This link has expired" text="For your security, links stop working after a while. Please contact LexGo and we will send you a new one." />;
  }
  if (found.state === "cancelled") {
    return <Unavailable title="This agreement is no longer available" text="Please contact LexGo if you think this is a mistake." />;
  }

  const { mou } = found;
  const doc = await documentForMou(mou);

  if (found.state === "signed") {
    return (
      <Shell>
        <div className="space-y-6">
          <div className="card flex flex-col gap-4 border-emerald-200 bg-emerald-50 p-6 sm:flex-row sm:items-center">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600">
              <Icon name="checkCircle" className="h-8 w-8" />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-emerald-900">Thank you, this MOU is signed</h1>
              <p className="mt-1 text-emerald-900">
                Signed by {mou.signerName} on {mou.signedAt ? formatDateTime(mou.signedAt) : ""}.
                {mou.startDate ? <> Your service start date is <strong>{formatDay(mou.startDate)}</strong>.</> : null}
              </p>
            </div>
          </div>
          <MouDocumentView doc={doc} />
        </div>
      </Shell>
    );
  }

  const { ip } = await getRequestMeta();
  await recordView(mou, ip);
  const monthly = mou.agents * mou.rateCents;

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#8a6d00]">Agreement for review</p>
          <h1 className="mt-1 break-words font-display text-3xl font-bold sm:text-4xl">{mou.client.companyName}</h1>
          <p className="mt-2 max-w-2xl text-slate">Please read the agreement below. You can ask a question at any time, and sign when you are ready.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat icon="users" label="Virtual assistants" value={String(mou.agents)} />
          <Stat icon="document" label="Rate per assistant" value={`${formatCents(mou.rateCents)} per month`} />
          <Stat icon="clock" label="Monthly total" value={formatCents(monthly)} />
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <MouDocumentView doc={doc} />
          <div className="space-y-6 lg:sticky lg:top-6">
            <section className="card min-w-0 space-y-5" id="sign">
              <div>
                <h2 className="font-display text-xl font-bold">Sign this agreement</h2>
                <p className="text-sm text-slate">Fill in your details to sign for {mou.client.companyName}.</p>
              </div>
              <SignForm token={token} company={mou.client.companyName} />
            </section>
            <section className="card min-w-0 space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold">Have a question?</h2>
                <p className="text-sm text-slate">Ask us before you sign. Your agreement stays open.</p>
              </div>
              <QuestionForm token={token} />
            </section>
          </div>
        </div>
      </div>
    </Shell>
  );
}
