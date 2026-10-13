/**
 * Układ zakładki: kolumna formularzy 720 px i — gdy jest — prawa kolumna
 * (plan, logo, zaproszenie). Na telefonie prawa kolumna schodzi pod spód.
 */
export function SettingsColumns({ aside, children }: { aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,720px)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
      {aside ? <div className="flex min-w-0 flex-col gap-6">{aside}</div> : null}
    </div>
  );
}
