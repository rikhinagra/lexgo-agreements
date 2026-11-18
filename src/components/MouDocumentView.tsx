import type { MouDocument } from "@/lib/mou-document";

/** The MOU as the client reads it. Plain text only, so nothing from the database can run as code. */
export function MouDocumentView({ doc }: { doc: MouDocument }) {
  return (
    <article className="card min-w-0 space-y-8 p-6 sm:p-10">
      <header className="border-b border-navy/10 pb-6 text-center">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">{doc.title}</h2>
        <p className="mt-1 text-slate">{doc.subtitle}</p>
      </header>

      <p className="break-words leading-relaxed">{doc.intro}</p>

      {doc.sections.map((section) => (
        <section key={section.heading} className="space-y-3">
          <h3 className="font-display text-lg font-bold">{section.heading}</h3>
          {section.paragraphs?.map((p) => (
            <p key={p} className="leading-relaxed">{p}</p>
          ))}
          {section.bullets ? (
            <ul className="list-disc space-y-1 pl-6 leading-relaxed marker:text-gold">
              {section.bullets.map((b) => (
                <li key={b} className="break-words">{b}</li>
              ))}
            </ul>
          ) : null}
          {section.rows ? (
            <dl className="overflow-hidden rounded-xl border border-navy/10">
              {section.rows.map((row) => (
                <div key={row.label} className="grid gap-0.5 border-t border-navy/10 px-4 py-3 text-sm first:border-t-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
                  <dt className="font-semibold text-navy">{row.label}</dt>
                  <dd className="min-w-0 break-words text-slate">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {section.note ? <p className="text-sm italic text-slate">{section.note}</p> : null}
        </section>
      ))}

      <section className="space-y-4">
        <h3 className="font-display text-lg font-bold">6. Signatures</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-cream p-5 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate">For the Service Provider</p>
            <p className="mt-3 break-words font-semibold">{doc.signatures.provider.company}</p>
            <p className="break-words">{doc.signatures.provider.name}</p>
            <p className="break-words text-slate">{doc.signatures.provider.title}</p>
          </div>
          <div className="rounded-xl bg-cream p-5 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate">For the Client</p>
            <p className="mt-3 break-words font-semibold">{doc.signatures.client.company}</p>
            {doc.signatures.client.name ? (
              <>
                <p className="break-words font-display text-xl italic">{doc.signatures.client.name}</p>
                <p className="break-words text-slate">{doc.signatures.client.title}</p>
                <p className="text-slate">Signed {doc.signatures.client.date}</p>
              </>
            ) : (
              <p className="mt-2 text-slate">The signer completes this section on signing.</p>
            )}
          </div>
        </div>
      </section>
    </article>
  );
}
