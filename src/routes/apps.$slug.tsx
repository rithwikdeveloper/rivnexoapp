import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, ExternalLink, Heart, ShieldCheck, Star } from "lucide-react";
import { ShareDialog } from "@/components/share-dialog";
import { SiteLayout, EmptyState } from "@/components/site-layout";
import { AndroidAppBadge, AppIcon, isVerifiedApp, TypeBadge, VerifiedBadge } from "@/components/app-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { appBySlugQuery, reviewsQuery } from "@/lib/queries";
import { compact, formatBytes, mediaUrl } from "@/lib/media";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getApkDownload, recordWebsiteOpen } from "@/lib/market.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/apps/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — Rivnexo` },
      { name: "description", content: "App details, screenshots, reviews and download on Rivnexo." },
      { property: "og:title", content: `${params.slug.replace(/-/g, " ")} on Rivnexo` },
      { property: "og:description", content: "App details, screenshots, reviews and download on Rivnexo." },
    ],
  }),
  component: AppDetail,
});

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} aria-label={`${n} stars`}>
          <Star className={cn("size-4", n <= value ? "fill-star text-star" : "text-muted-foreground")} />
        </button>
      ))}
    </div>
  );
}

function AppDetail() {
  const { slug } = Route.useParams();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = Route.useNavigate();
  useEffect(() => {
    if (!authLoading && !user) {
      toast.info("Please sign in first to open websites and APK apps");
      navigate({ to: "/auth" });
    }
  }, [authLoading, user, navigate]);
  const qc = useQueryClient();
  const { data: app, isLoading } = useQuery(appBySlugQuery(slug));
  const { data: reviews = [] } = useQuery({ ...reviewsQuery(app?.id ?? ""), enabled: !!app });
  const { data: isFav = false } = useQuery({
    queryKey: ["fav", app?.id, user?.id],
    enabled: !!app && !!user,
    queryFn: async () => !!(await supabase.from("favorites").select("app_id").eq("app_id", app!.id).maybeSingle()).data,
  });
  const download = useServerFn(getApkDownload);
  const recordOpen = useServerFn(recordWebsiteOpen);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const favMut = useMutation({
    mutationFn: async () => {
      if (isFav) await supabase.from("favorites").delete().eq("app_id", app!.id).eq("user_id", user!.id);
      else await supabase.from("favorites").insert({ app_id: app!.id, user_id: user!.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fav"] }),
  });
  const dlMut = useMutation({
    mutationFn: () => download({ data: { appId: app!.id } }),
    onSuccess: (r) => { window.location.href = r.url; toast.success("Download started"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const reviewMut = useMutation({
    mutationFn: async () => {
      const text = body.trim().slice(0, 1000);
      const { error } = await supabase.from("reviews").upsert(
        { app_id: app!.id, user_id: user!.id, rating, body: text || null, author_name: user!.email?.split("@")[0] },
        { onConflict: "user_id,app_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => { setBody(""); toast.success("Review saved"); qc.invalidateQueries({ queryKey: ["reviews"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <SiteLayout><div className="mx-auto max-w-5xl p-10"><div className="glass-panel h-64 animate-pulse rounded-2xl" /></div></SiteLayout>;
  if (!app) return <SiteLayout><div className="p-16"><EmptyState title="App not found" body="It may have been removed or unpublished." action={<Link to="/search" className="text-primary">Browse apps</Link>} /></div></SiteLayout>;

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const banner = mediaUrl(app.banner_url);
  const open = () => {
    if (!app.website_url) return;
    window.open(app.website_url, "_blank", "noopener,noreferrer");
    recordOpen({ data: { appId: app.id } }).catch(() => {});
  };
  const info: [string, string | null | undefined][] = app.kind === "apk"
    ? [["Size", formatBytes(app.file_size)], ["Min Android", app.min_android], ["Released", app.release_date], ["SHA-256", app.sha256]]
    : [["Website", app.website_url], ["Category", app.categories?.name]];

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {banner && <img src={banner} alt="" className="mb-8 aspect-[3/1] w-full rounded-2xl object-cover ring-1 ring-border" />}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <AppIcon app={app} size="xl" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-semibold">{app.name}</h1><TypeBadge kind={app.kind} />{isVerifiedApp(app) && <VerifiedBadge />}</div>
            <p className="mt-1 text-sm text-muted-foreground">{[app.developer, app.categories?.name].filter(Boolean).join(" · ")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="size-4 fill-star text-star" />{avg ? avg.toFixed(1) : "No ratings"} ({reviews.length})</span>
              {isAdmin && <span>{app.kind === "apk" ? `${compact(app.download_count)} downloads` : `${compact(app.open_count)} opens`}</span>}
              {app.kind === "apk" && app.scan_status === "clean" && <span className="flex items-center gap-1 text-success"><ShieldCheck className="size-4" />Security scan passed</span>}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {app.kind === "website" ? (
                <>
                  {user ? <Button size="lg" onClick={open}><ExternalLink />Open Website</Button> : <Button size="lg" asChild><Link to="/auth"><ExternalLink />Sign in to open</Link></Button>}
                  {app.android_app?.slug && <Button size="lg" variant="outline" asChild><Link to="/apps/$slug" params={{ slug: app.android_app.slug }}><Download />Download Android App</Link></Button>}
                </>
              ) : user ? (
                <Button size="lg" variant="ink" onClick={() => dlMut.mutate()} disabled={dlMut.isPending}><Download />{dlMut.isPending ? "Preparing…" : "Download APK"}</Button>
              ) : (
                <Button size="lg" variant="ink" asChild><Link to="/auth"><Download />Sign in to download</Link></Button>
              )}
              {user && <Button size="lg" variant="outline" onClick={() => favMut.mutate()}><Heart className={cn(isFav && "fill-destructive text-destructive")} />{isFav ? "Saved" : "Save"}</Button>}
              <ShareDialog name={app.name} />
            </div>
            {app.kind === "website" && <div className="mt-3"><AndroidAppBadge linked={!!app.android_app_id} /></div>}
          </div>
        </div>

        {app.kind === "apk" && (
          <div className="mt-8 grid grid-cols-2 gap-3">
            {([
              ["Size", app.file_size ? `${(app.file_size / 1048576).toFixed(1)} MB` : null],
              ["Requires", app.min_android ? `Android ${app.min_android}+` : null],
            ] as [string, string | null][]).map(([k, v]) => (
              <div key={k} className="glass-panel rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p>
                <p className="mt-1 truncate font-semibold" title={v ?? ""}>{v ?? "—"}</p>
              </div>
            ))}
          </div>
        )}

        {app.screenshots.length > 0 && (
          <div className="mt-10 flex gap-4 overflow-x-auto pb-2">
            {app.screenshots.map((s, index) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedScreenshot(s)}
                className="shrink-0 cursor-zoom-in rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label={`Open screenshot ${index + 1} full screen`}
              >
                <img src={mediaUrl(s)} alt={`Screenshot ${index + 1}`} loading="lazy" className="h-80 rounded-xl object-cover ring-1 ring-border transition-opacity hover:opacity-85" />
              </button>
            ))}
          </div>
        )}

        <Dialog open={!!selectedScreenshot} onOpenChange={(open) => !open && setSelectedScreenshot(null)}>
          <DialogContent className="flex h-screen w-screen max-w-none items-center justify-center border-0 bg-black/95 p-4 sm:rounded-none">
            <DialogTitle className="sr-only">Full-screen screenshot preview</DialogTitle>
            {selectedScreenshot && (
              <img
                src={mediaUrl(selectedScreenshot)}
                alt="Full-screen screenshot preview"
                className="max-h-full max-w-full object-contain"
              />
            )}
          </DialogContent>
        </Dialog>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-xl font-semibold">About this app</h2>
              <p className="mt-3 whitespace-pre-line text-pretty text-muted-foreground">{app.full_description || app.short_description}</p>
              {app.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{app.tags.map((t) => <span key={t} className="rounded-full bg-secondary px-3 py-1 text-xs ring-1 ring-border">{t}</span>)}</div>}
            </section>
            {app.kind === "apk" && (
              <section className="glass-panel rounded-2xl p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-xl font-semibold">What's new</h2>
                  <span className="text-xs text-muted-foreground">{app.release_date && new Date(app.release_date).toLocaleDateString()}</span>
                </div>
                <p className="mt-3 whitespace-pre-line text-muted-foreground">{app.changelog || "No release notes for this version."}</p>
              </section>
            )}
            <section>
              <h2 className="text-xl font-semibold">Ratings & reviews</h2>
              {user ? (
                <form onSubmit={(e) => { e.preventDefault(); reviewMut.mutate(); }} className="glass-panel mt-4 space-y-3 rounded-2xl p-4">
                  <Stars value={rating} onChange={setRating} />
                  <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} placeholder="Share your experience (optional)" />
                  <Button type="submit" disabled={reviewMut.isPending}>Post review</Button>
                </form>
              ) : <p className="mt-3 text-sm text-muted-foreground"><Link to="/auth" className="text-primary">Sign in</Link> to leave a review.</p>}
              <div className="mt-4 space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="glass-panel rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{r.author_name ?? "User"}</span><Stars value={r.rating} /></div>
                    {r.body && <p className="mt-2 text-sm text-muted-foreground">{r.body}</p>}
                  </div>
                ))}
                {!reviews.length && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
              </div>
            </section>
          </div>
          <aside className="glass-panel h-fit rounded-2xl p-5">
            <h3 className="font-semibold">Information</h3>
            <dl className="mt-3 space-y-2 text-sm">
              {info.filter(([, v]) => v).map(([k, v]) => (
                <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="break-all font-medium">{v}</dd></div>
              ))}
            </dl>
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
}
