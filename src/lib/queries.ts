import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRow = Database["public"]["Tables"]["apps"]["Row"] & {
  categories?: { name: string; slug: string } | null;
  android_app?: Pick<Database["public"]["Tables"]["apps"]["Row"], "id" | "name" | "slug" | "apk_path" | "approval_status" | "scan_status" | "is_published"> | null;
};
export type Category = Database["public"]["Tables"]["categories"]["Row"];

const APP_SELECT = "*, categories(name, slug), android_app:apps!apps_android_app_id_fkey(id, name, slug, apk_path, approval_status, scan_status, is_published)";

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("categories").select("*").order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const homeQuery = queryOptions({
  queryKey: ["home"],
  queryFn: async () => {
    const [featured, latest, popular] = await Promise.all([
      supabase.from("apps").select(APP_SELECT).eq("is_featured", true).order("updated_at", { ascending: false }).limit(10),
      supabase.from("apps").select(APP_SELECT).order("created_at", { ascending: false }).limit(6),
      supabase.from("apps").select(APP_SELECT).order("download_count", { ascending: false }).order("open_count", { ascending: false }).limit(6),
    ]);
    return {
      featured: (featured.data ?? []) as AppRow[],
      latest: (latest.data ?? []) as AppRow[],
      popular: (popular.data ?? []) as AppRow[],
    };
  },
});

export type SearchParams = { q?: string; type?: "all" | "website" | "apk"; category?: string; sort?: "newest" | "popular" | "name" };

export const searchQuery = (p: SearchParams) =>
  queryOptions({
    queryKey: ["search", p],
    queryFn: async () => {
      let q = supabase.from("apps").select(APP_SELECT + (p.category ? ", cat:categories!inner(slug)" : ""));
      if (p.type && p.type !== "all") q = q.eq("kind", p.type);
      if (p.category) q = q.eq("cat.slug", p.category);
      const term = p.q?.trim().replace(/[%,()]/g, " ");
      if (term) q = q.or(`name.ilike.%${term}%,developer.ilike.%${term}%,short_description.ilike.%${term}%,package_name.ilike.%${term}%`);
      if (p.sort === "popular") q = q.order("download_count", { ascending: false });
      else if (p.sort === "name") q = q.order("name");
      else q = q.order("created_at", { ascending: false });
      const { data, error } = await q.limit(60);
      if (error) throw error;
      return (data ?? []) as unknown as AppRow[];
    },
  });

export const appBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["app", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("apps").select(APP_SELECT).eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data as AppRow | null;
    },
  });

export const reviewsQuery = (appId: string) =>
  queryOptions({
    queryKey: ["reviews", appId],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("*").eq("app_id", appId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
