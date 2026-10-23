import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin login by username + password. Bootstraps the first admin from server secrets. */
export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ username: z.string().trim().min(1).max(64), password: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const username = data.username.toLowerCase();
    const invalid = { ok: false as const, error: "Invalid username or password." };

    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
    if (!key || !url) return invalid;
    const pub = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    // Normal admin logins do not need the service-role key. The account email
    // is deterministic for the original username used during provisioning.
    const email = `${username.replace(/[^a-z0-9._-]/g, "")}@admin.rivnexo.app`;
    const { data: signedIn, error: signInError } = await pub.auth.signInWithPassword({ email, password: data.password });
    if (!signInError && signedIn.user && signedIn.session) {
      const { data: role } = await pub.rpc("has_role", { _user_id: signedIn.user.id, _role: "admin" });
      if (role) {
        await pub.from("audit_log").insert({ admin_id: signedIn.user.id, action: "admin.login" });
        return { ok: true as const, access_token: signedIn.session.access_token, refresh_token: signedIn.session.refresh_token };
      }
    }

    // Only the first-admin bootstrap needs the privileged server key. Keep the
    // existing setup available when it is configured, but do not make every
    // local login fail when the key is intentionally absent.
    if (!process.env["SUPABASE_SERVICE_ROLE_KEY"]) return invalid;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let { data: acct } = await supabaseAdmin.from("admin_accounts").select("user_id").eq("username", username).maybeSingle();
    if (!acct) {
      const envU = (process.env["ADMIN_USERNAME"] ?? "").toLowerCase().trim();
      const envP = process.env["ADMIN_PASSWORD"] ?? "";
      if (!envU || !envP || username !== envU || data.password !== envP) return invalid;
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email, password: envP, email_confirm: true, user_metadata: { display_name: username },
      });
      if (error || !created.user) return { ok: false as const, error: "Could not create admin account." };
      const { error: accountError } = await supabaseAdmin.from("admin_accounts").insert({ user_id: created.user.id, username });
      const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
      if (accountError || roleError) return { ok: false as const, error: "Could not finish admin account setup." };
      acct = { user_id: created.user.id };
    }

    const { data: u } = await supabaseAdmin.auth.admin.getUserById(acct.user_id);
    const accountEmail = u.user?.email;
    if (!accountEmail) return invalid;

    const { data: s, error } = await pub.auth.signInWithPassword({ email: accountEmail, password: data.password });
    if (error || !s.session) return invalid;
    const { data: role } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", acct.user_id).eq("role", "admin").maybeSingle();
    if (!role) return invalid;
    await supabaseAdmin.from("audit_log").insert({ admin_id: acct.user_id, action: "admin.login" });
    return { ok: true as const, access_token: s.session.access_token, refresh_token: s.session.refresh_token };
  });

/** Signed APK download link, records history. */
export const getApkDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ appId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: app } = await context.supabase.from("apps").select("id, kind, apk_path, version_name, slug").eq("id", data.appId).maybeSingle();
    if (!app || app.kind !== "apk" || !app.apk_path) throw new Error("This APK is not available.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin.from("profiles").select("is_blocked").eq("id", context.userId).maybeSingle();
    if (prof?.is_blocked) throw new Error("Your account is blocked.");
    const { data: signed, error } = await supabaseAdmin.storage.from("apks").createSignedUrl(app.apk_path, 300, { download: `${app.slug}-${app.version_name ?? "latest"}.apk` });
    if (error || !signed) throw new Error("Could not prepare the download.");
    await supabaseAdmin.from("downloads").insert({ user_id: context.userId, app_id: app.id, version_name: app.version_name });
    const { data: cur } = await supabaseAdmin.from("apps").select("download_count").eq("id", app.id).single();
    await supabaseAdmin.from("apps").update({ download_count: (cur?.download_count ?? 0) + 1 }).eq("id", app.id);
    return { url: signed.signedUrl };
  });

/** Records a website open (public). */
export const recordWebsiteOpen = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ appId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: app } = await supabaseAdmin.from("apps").select("id, kind, is_published, open_count").eq("id", data.appId).maybeSingle();
    if (!app || app.kind !== "website" || !app.is_published) return { ok: false };
    await supabaseAdmin.from("website_opens").insert({ app_id: app.id });
    await supabaseAdmin.from("apps").update({ open_count: app.open_count + 1 }).eq("id", app.id);
    return { ok: true };
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: authData, error: authError }, { data: profiles, error: profilesError }, { data: roles, error: rolesError }, { data: dls, error: downloadsError }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 }),
      supabaseAdmin.from("profiles").select("*").limit(500),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("downloads").select("user_id"),
    ]);
    if (authError || profilesError || rolesError || downloadsError) {
      throw new Error(authError?.message ?? profilesError?.message ?? rolesError?.message ?? downloadsError?.message ?? "Could not load users.");
    }
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
    return (authData.users ?? []).map((u) => {
      const profile = profileById.get(u.id);
      return {
        id: u.id,
        email: profile?.email ?? u.email ?? null,
        display_name: profile?.display_name ?? u.user_metadata?.display_name ?? null,
        is_blocked: profile?.is_blocked ?? false,
        created_at: profile?.created_at ?? u.created_at,
        is_admin: (roles ?? []).some((r) => r.user_id === u.id && r.role === "admin"),
        downloads: (dls ?? []).filter((d) => d.user_id === u.id).length,
      };
    });
  });

export const adminSetBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), blocked: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot block yourself.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ is_blocked: data.blocked }).eq("id", data.userId);
    await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: data.blocked ? "876000h" : "none" });
    await supabaseAdmin.from("audit_log").insert({ admin_id: context.userId, action: data.blocked ? "user.block" : "user.unblock", target: data.userId });
    return { ok: true };
  });

/** Admin changes own username and/or password. Requires current password. */
export const adminUpdateCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      currentPassword: z.string().min(1).max(200),
      newUsername: z.string().trim().max(64).regex(/^[a-zA-Z0-9._-]*$/, "Username can use letters, numbers, . _ - only").optional(),
      newPassword: z.string().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const email = u.user?.email;
    if (!email) throw new Error("Account not found.");
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const pub = createClient(process.env["SUPABASE_URL"]!, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: authErr } = await pub.auth.signInWithPassword({ email, password: data.currentPassword });
    if (authErr) throw new Error("Current password is incorrect.");
    const newU = data.newUsername?.toLowerCase();
    if (newU) {
      const { data: taken } = await supabaseAdmin.from("admin_accounts").select("user_id").eq("username", newU).maybeSingle();
      if (taken && taken.user_id !== context.userId) throw new Error("That username is already taken.");
      const { error } = await supabaseAdmin.from("admin_accounts").update({ username: newU }).eq("user_id", context.userId);
      if (error) throw new Error("Could not update username.");
    }
    if (data.newPassword) {
      if (data.newPassword.length < 8) throw new Error("New password must be at least 8 characters.");
      const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, { password: data.newPassword });
      if (error) throw new Error(error.message);
    }
    await supabaseAdmin.from("audit_log").insert({ admin_id: context.userId, action: "admin.credentials.update", details: { username: !!newU, password: !!data.newPassword } });
    return { ok: true };
  });
