"use client";

/**
 * LinksPage — centralised tracking of all team and client invitation
 * links for the current workspace. Shows status, allows bulk revoke,
 * copy link, and individual revoke.
 */

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Link2,
  Copy,
  Check,
  Trash2,
  Search,
  Users,
  Folder,
  Filter,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  revokeLink,
  bulkRevokeLinks,
  type TrackedLink,
  type LinkStatus,
} from "@/lib/actions/links";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const STATUS_CONFIG: Record<
  LinkStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  ACTIVE: { label: "Active", variant: "default" },
  EXPIRED: { label: "Expired", variant: "secondary" },
  ACCEPTED: { label: "Accepted", variant: "outline" },
  REVOKED: { label: "Revoked", variant: "destructive" },
};

const TYPE_CONFIG = {
  team: { label: "Team", icon: Users, color: "text-blue-500" },
  client: { label: "Client", icon: Folder, color: "text-emerald-500" },
};

// ──────────────────────────────────────────────
// Skeleton
// ──────────────────────────────────────────────

export function LinksPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-48" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// ──────────────────────────────────────────────
// Page Component
// ──────────────────────────────────────────────

interface LinksPageProps {
  teamLinks: TrackedLink[];
  clientLinks: TrackedLink[];
}

export function LinksPage({ teamLinks, clientLinks }: LinksPageProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "team" | "client">("all");
  const [statusFilter, setStatusFilter] = useState<LinkStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [bulkRevokeConfirm, setBulkRevokeConfirm] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const allLinks = useMemo(
    () => [...teamLinks, ...clientLinks],
    [teamLinks, clientLinks],
  );

  const filteredLinks = useMemo(() => {
    return allLinks.filter((link) => {
      if (filter !== "all" && link.type !== filter) return false;
      if (statusFilter !== "all" && link.status !== statusFilter) return false;
      if (
        searchQuery &&
        !link.email.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !link.contextName.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [allLinks, filter, statusFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: allLinks.length,
    active: allLinks.filter((l) => l.status === "ACTIVE").length,
    accepted: allLinks.filter((l) => l.status === "ACCEPTED").length,
    expired: allLinks.filter((l) => l.status === "EXPIRED").length,
    team: teamLinks.length,
    client: clientLinks.length,
  }), [allLinks, teamLinks, clientLinks]);

  // ── Copy ──
  const copyLink = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.add({ type: "success", title: "Link copied" });
    } catch {
      toast.add({ type: "error", title: "Failed to copy link" });
    }
  };

  // ── Revoke single ──
  const handleRevoke = async (id: string, type: "team" | "client") => {
    setIsRevoking(true);
    try {
      const result = await revokeLink({ id, type });
      if (result.success) {
        toast.add({ type: "success", title: result.message });
        setRevokeConfirmId(null);
        router.refresh();
      } else {
        toast.add({ type: "error", title: result.message });
      }
    } catch {
      toast.add({ type: "error", title: "Failed to revoke link" });
    } finally {
      setIsRevoking(false);
    }
  };

  // ── Bulk revoke ──
  const handleBulkRevoke = async () => {
    if (selectedIds.size === 0) return;
    setIsRevoking(true);
    try {
      const ids = Array.from(selectedIds);
      const result = await bulkRevokeLinks({ ids, type: filter === "team" ? "team" : "client" });
      if (result.success) {
        toast.add({ type: "success", title: result.message });
        setSelectedIds(new Set());
        setBulkRevokeConfirm(false);
        router.refresh();
      } else {
        toast.add({ type: "error", title: result.message });
      }
    } catch {
      toast.add({ type: "error", title: "Failed to revoke links" });
    } finally {
      setIsRevoking(false);
    }
  };

  // ── Select ──
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLinks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLinks.map((l) => l.id)));
    }
  };

  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(d));

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Links</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track all team and client invitation links for your workspace.
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total },
          { label: "Active", value: stats.active },
          { label: "Accepted", value: stats.accepted },
          { label: "Expired", value: stats.expired },
          { label: "Team / Client", value: `${stats.team} / ${stats.client}` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center border border-border rounded-md">
          {(["all", "team", "client"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setSelectedIds(new Set()); }}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as LinkStatus | "all")}
        >
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <Filter className="mr-1 h-3 w-3" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
        </div>

        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkRevokeConfirm(true)}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Revoke ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* ── Links Table ── */}
      <Card>
        <CardContent className="p-0">
          {filteredLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Link2 className="h-8 w-8 mb-2" />
              <p className="text-sm">No links found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Header row */}
              <div className="grid grid-cols-[32px_1fr_120px_100px_100px_80px] gap-3 items-center px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
                <Checkbox
                  checked={selectedIds.size === filteredLinks.length && filteredLinks.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span>Email &middot; Context</span>
                <span>Type</span>
                <span>Status</span>
                <span>Expires</span>
                <span className="text-right">Actions</span>
              </div>

              {/* Data rows */}
              {filteredLinks.map((link) => {
                const tc = TYPE_CONFIG[link.type];
                const sc = STATUS_CONFIG[link.status];
                return (
                  <div
                    key={link.id}
                    className="grid grid-cols-[32px_1fr_120px_100px_100px_80px] gap-3 items-center px-4 py-3 hover:bg-muted/20 transition-colors"
                  >
                    <Checkbox
                      checked={selectedIds.has(link.id)}
                      onCheckedChange={() => toggleSelect(link.id)}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {link.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {link.contextName}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <tc.icon className={`h-3.5 w-3.5 ${tc.color}`} />
                      <span className="text-xs">{tc.label}</span>
                    </div>
                    <Badge variant={sc.variant} className="w-fit text-xs">
                      {sc.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(link.expiresAt)}
                    </span>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => copyLink(link.acceptUrl, link.id)}
                        title="Copy invite link"
                      >
                        {copiedId === link.id ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      {link.status === "ACTIVE" && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setRevokeConfirmId(link.id)}
                          title="Revoke link"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Revoke Single Confirm ── */}
      <Dialog
        open={revokeConfirmId !== null}
        onOpenChange={(v) => !v && setRevokeConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke invitation?</DialogTitle>
            <DialogDescription>
              This will permanently revoke the invitation link. The recipient
              will no longer be able to use it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeConfirmId(null)}
              disabled={isRevoking}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const link = allLinks.find((l) => l.id === revokeConfirmId);
                if (link) handleRevoke(link.id, link.type);
              }}
              disabled={isRevoking}
            >
              {isRevoking ? "Revoking..." : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Revoke Confirm ── */}
      <Dialog open={bulkRevokeConfirm} onOpenChange={setBulkRevokeConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke {selectedIds.size} invitation(s)?</DialogTitle>
            <DialogDescription>
              This will permanently revoke all selected invitation links.
              Recipients will no longer be able to use them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkRevokeConfirm(false)}
              disabled={isRevoking}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkRevoke}
              disabled={isRevoking}
            >
              {isRevoking ? "Revoking..." : `Revoke ${selectedIds.size}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
