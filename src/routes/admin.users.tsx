import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminListUsers, adminSetBlocked } from "@/lib/market.functions";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });

function UsersPage() {
  const qc = useQueryClient();
  const { data = [], isLoading, isError, error } = useQuery({ queryKey: ["admin-users"], queryFn: () => adminListUsers() });
  const block = useMutation({
    mutationFn: (v: { userId: string; blocked: boolean }) => adminSetBlocked({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Users</h1>
      <div className="glass-panel overflow-x-auto rounded-2xl">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground"><tr><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Downloads</th><th className="p-3">Joined</th><th className="p-3" /></tr></thead>
          <tbody>
            {isLoading && <tr><td className="p-3 text-muted-foreground" colSpan={5}>Loading…</td></tr>}
            {isError && <tr><td className="p-3 text-destructive" colSpan={5}>{error instanceof Error ? error.message : "Could not load users."}</td></tr>}
            {!isLoading && !isError && data.length === 0 && <tr><td className="p-3 text-muted-foreground" colSpan={5}>No users found.</td></tr>}
            {data.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3"><div className="font-medium">{u.display_name ?? "—"}</div><div className="text-xs text-muted-foreground">{u.email}</div></td>
                <td className="p-3">{u.is_admin ? "Admin" : "User"}{u.is_blocked && <span className="ml-2 text-destructive">Blocked</span>}</td>
                <td className="p-3">{u.downloads}</td>
                <td className="p-3">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-3 text-right">
                  {!u.is_admin && (
                    <Button size="sm" variant={u.is_blocked ? "outline" : "destructive"} onClick={() => block.mutate({ userId: u.id, blocked: !u.is_blocked })}>
                      {u.is_blocked ? "Unblock" : "Block"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
