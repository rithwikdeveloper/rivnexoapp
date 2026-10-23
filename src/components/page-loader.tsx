import { LogoMark } from "@/components/brand";

export function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-live="polite" aria-label="Loading Rivnexo">
      <div className="page-loader__orb" />
      <div className="relative flex flex-col items-center gap-4">
        <div className="page-loader__mark">
          <LogoMark className="size-11" />
        </div>
        <div className="text-center">
          <p className="font-display text-xl font-semibold tracking-tight">Rivnexo</p>
          <p className="mt-1 text-sm text-muted-foreground">Loading your marketplace…</p>
        </div>
        <div className="page-loader__dots" aria-hidden="true"><span /><span /><span /></div>
      </div>
    </div>
  );
}
