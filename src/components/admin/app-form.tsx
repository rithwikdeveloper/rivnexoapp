import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery, type AppRow } from "@/lib/queries";
import { formatBytes, mediaUrl, slugify } from "@/lib/media";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type Kind = "website" | "apk";

const base = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  short_description: z.string().trim().max(160),
  full_description: z.string().trim().max(5000),
  developer: z.string().trim().max(80),
});

async function sha256(file: File) {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function uploadMedia(file: File, folder: string) {
  if (!file.type.startsWith("image/")) throw new Error("Images only");
  const path = `${folder}/${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase() ?? "png"}`;
  const { error } = await supabase.storage.from("app-media").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

export function AppForm({ initial, defaultKind }: { initial?: AppRow; defaultKind?: Kind }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: cats = [] } = useQuery(categoriesQuery);
  const { data: apkApps = [] } = useQuery({
    queryKey: ["admin-apk-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("apps").select("id, name, version_name").eq("kind", "apk").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [kind, setKind] = useState<Kind>(initial?.kind ?? defaultKind ?? "website");
  const [f, setF] = useState({
    name: initial?.name ?? "", short_description: initial?.short_description ?? "", full_description: initial?.full_description ?? "",
    developer: initial?.developer ?? "", website_url: initial?.website_url ?? "", category_id: initial?.category_id ?? "",
    tags: (initial?.tags ?? []).join(", "), min_android: initial?.min_android ?? "", release_date: initial?.release_date ?? "",
    changelog: initial?.changelog ?? "", scan_status: initial?.scan_status ?? "pending", approval_status: initial?.approval_status ?? "pending",
    is_featured: initial?.is_featured ?? false, is_published: initial?.is_published ?? false,
  });
  const [icon, setIcon] = useState(initial?.icon_url ?? "");
  const [banner, setBanner] = useState(initial?.banner_url ?? "");
  const [androidAppId, setAndroidAppId] = useState(initial?.android_app_id ?? "");
  const [shots, setShots] = useState<string[]>(initial?.screenshots ?? []);
  const [apk, setApk] = useState<{ path: string; size: number; sha: string } | null>(
    initial?.apk_path ? { path: initial.apk_path, size: initial.file_size ?? 0, sha: initial.sha256 ?? "" } : null,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const onImage = (setter: (p: string) => void, folder: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(folder);
    try { setter(await uploadMedia(file, folder)); } catch (err) { toast.error((err as Error).message); } finally { setBusy(null); }
  };
  const onShots = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 8);
    setBusy("screenshots");
    try { const paths = await Promise.all(files.map((fl) => uploadMedia(fl, "screenshots"))); setShots((s) => [...s, ...paths].slice(0, 10)); }
    catch (err) { toast.error((err as Error).message); } finally { setBusy(null); }
  };
  const onApk = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".apk")) return toast.error("Please choose an .apk file");
    setBusy("apk");
    try {
      const sha = await sha256(file);
      const path = `${slugify(f.name || "app")}/${Date.now()}.apk`;
      const { error } = await supabase.storage.from("apks").upload(path, file, { contentType: "application/vnd.android.package-archive" });
      if (error) throw error;
      setApk({ path, size: file.size, sha });
      toast.success("APK uploaded");
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(null); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = base.safeParse(f);
    if (!p.success) return toast.error(p.error.issues[0].message);
    if (kind === "website") {
      const u = z.string().url().refine((v) => /^https?:\/\//.test(v), "Must start with http(s)://").safeParse(f.website_url.trim());
      if (!u.success) return toast.error("Enter a valid website URL (https://…)");
    }
    if (kind === "apk" && !apk) return toast.error("Upload an APK file");
    if (!rightsConfirmed) return toast.error("Confirm that you have rights to publish this app and its media");
    setBusy("save");
    const row = {
      kind, ...p.data, icon_url: icon || null, banner_url: banner || null, screenshots: shots,
      category_id: f.category_id || null, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12),
      is_featured: f.is_featured, is_published: f.is_published, updated_at: new Date().toISOString(),
      website_url: kind === "website" ? f.website_url.trim() : null,
      android_app_id: kind === "website" ? (androidAppId || null) : null,
      ...(kind === "apk" ? {
        apk_path: apk!.path, file_size: apk!.size, sha256: apk!.sha,
        min_android: f.min_android || null, release_date: f.release_date || null, changelog: f.changelog || null,
        scan_status: f.scan_status, approval_status: f.approval_status,
      } : { approval_status: "approved" }),
    };
    const res = initial
      ? await supabase.from("apps").update(row).eq("id", initial.id).select("id").single()
      : await supabase.from("apps").insert({ ...row, slug: `${slugify(p.data.name)}-${Math.random().toString(36).slice(2, 6)}` }).select("id").single();
    setBusy(null);
    if (res.error) return toast.error(res.error.message);
    await logAudit(initial ? "app.update" : "app.create", res.data.id, { name: p.data.name, kind });
    qc.invalidateQueries();
    toast.success(initial ? "App updated" : "App created");
    navigate({ to: kind === "apk" ? "/admin/apks" : "/admin/websites" });
  };

  const field = "space-y-1.5";
  return (
    <form onSubmit={save} className="space-y-6">
      {!initial && (
        <div className="flex gap-2">
          {(["website", "apk"] as const).map((k) => (
            <button type="button" key={k} onClick={() => setKind(k)} className={`rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-border ${kind === k ? "bg-ink text-ink-foreground" : "bg-secondary"}`}>{k === "website" ? "Website app" : "APK app"}</button>
          ))}
        </div>
      )}
      <div className="glass-panel grid gap-4 rounded-2xl p-6 sm:grid-cols-2">
        <div className={field}><Label>App name *</Label><Input value={f.name} onChange={set("name")} maxLength={80} /></div>
        <div className={field}><Label>Developer / publisher</Label><Input value={f.developer} onChange={set("developer")} maxLength={80} /></div>
        <div className={`${field} sm:col-span-2`}><Label>Short description</Label><Input value={f.short_description} onChange={set("short_description")} maxLength={160} /></div>
        <div className={`${field} sm:col-span-2`}><Label>Full description</Label><Textarea rows={5} value={f.full_description} onChange={set("full_description")} maxLength={5000} /></div>
        <div className={field}>
          <Label>Category</Label>
          <select value={f.category_id} onChange={set("category_id")} className="h-9 w-full rounded-md bg-secondary px-3 text-sm ring-1 ring-border">
            <option value="">—</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className={field}><Label>Tags (comma separated)</Label><Input value={f.tags} onChange={set("tags")} /></div>
        {kind === "website" && <div className={`${field} sm:col-span-2`}><Label>Website URL *</Label><Input type="url" placeholder="https://" value={f.website_url} onChange={set("website_url")} /></div>}
        {kind === "website" && <div className={`${field} sm:col-span-2`}>
          <Label>Official Android App</Label>
          <select value={androidAppId} onChange={(e) => setAndroidAppId(e.target.value)} className="h-9 w-full rounded-md bg-secondary px-3 text-sm ring-1 ring-border">
            <option value="">No Android app linked</option>
            {apkApps.map((apk) => <option key={apk.id} value={apk.id}>{apk.name}{apk.version_name ? ` · v${apk.version_name}` : ""}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">Link the APK listing that belongs to this website.</p>
        </div>}
      </div>

      {kind === "apk" && (
        <div className="glass-panel grid gap-4 rounded-2xl p-6 sm:grid-cols-2">
          <div className={`${field} sm:col-span-2`}>
            <Label>APK file *</Label>
            <Input type="file" accept=".apk" onChange={onApk} disabled={busy === "apk"} />
            {busy === "apk" && <p className="text-xs text-muted-foreground">Uploading & computing checksum…</p>}
            {apk && <p className="break-all text-xs text-muted-foreground">{formatBytes(apk.size)} · SHA-256 {apk.sha}</p>}
          </div>
          <div className={field}><Label>Minimum Android</Label><Input value={f.min_android} onChange={set("min_android")} placeholder="8.0" /></div>
          <div className={field}><Label>Release date</Label><Input type="date" value={f.release_date} onChange={set("release_date")} /></div>
          <div className={field}>
            <Label>Security scan</Label>
            <select value={f.scan_status} onChange={set("scan_status")} className="h-9 w-full rounded-md bg-secondary px-3 text-sm ring-1 ring-border"><option value="pending">Pending</option><option value="clean">Clean</option><option value="flagged">Flagged</option></select>
          </div>
          <div className={field}>
            <Label>Approval</Label>
            <select value={f.approval_status} onChange={set("approval_status")} className="h-9 w-full rounded-md bg-secondary px-3 text-sm ring-1 ring-border"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
          </div>
          <div className={`${field} sm:col-span-2`}><Label>Changelog</Label><Textarea value={f.changelog} onChange={set("changelog")} maxLength={3000} /></div>
        </div>
      )}

      <div className="glass-panel grid gap-4 rounded-2xl p-6 sm:grid-cols-2">
        <div className={field}>
          <Label>Icon</Label>
          <div className="flex items-center gap-3">{icon && <img src={mediaUrl(icon)} alt="" className="size-12 rounded-xl object-cover" />}<Input type="file" accept="image/*" onChange={onImage(setIcon, "icons")} /></div>
        </div>
        <div className={field}>
          <Label>Banner</Label>
          <div className="flex items-center gap-3">{banner && <img src={mediaUrl(banner)} alt="" className="h-12 w-20 rounded-lg object-cover" />}<Input type="file" accept="image/*" onChange={onImage(setBanner, "banners")} /></div>
        </div>
        <div className={`${field} sm:col-span-2`}>
          <Label>Screenshots</Label>
          <Input type="file" accept="image/*" multiple onChange={onShots} />
          <div className="flex flex-wrap gap-2">
            {shots.map((s) => (
              <div key={s} className="relative"><img src={mediaUrl(s)} alt="" className="h-24 rounded-lg object-cover" />
                <button type="button" onClick={() => setShots(shots.filter((x) => x !== s))} className="absolute right-1 top-1 rounded-full bg-background p-0.5" aria-label="Remove"><X className="size-3" /></button>
              </div>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm"><Switch checked={f.is_featured} onCheckedChange={(v) => setF({ ...f, is_featured: v })} />Featured</label>
        <label className="flex items-center gap-3 text-sm"><Switch checked={f.is_published} onCheckedChange={(v) => setF({ ...f, is_published: v })} />Published</label>
        <label className="flex items-start gap-3 text-sm sm:col-span-2">
          <input type="checkbox" checked={rightsConfirmed} onChange={(e) => setRightsConfirmed(e.target.checked)} className="mt-0.5 size-4 accent-primary" />
          <span>I confirm that Rivnexo has permission to host and publish this app, APK, website information, screenshots, logos, and descriptions. I understand that infringing or malicious content may be removed.</span>
        </label>
      </div>
      <Button type="submit" size="lg" disabled={!!busy}>{busy === "save" ? "Saving…" : initial ? "Save changes" : "Create app"}</Button>
    </form>
  );
}
