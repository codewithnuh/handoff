"use client";

/**
 * SettingsForm — profile identity + password management for the
 * signed-in user.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
  changePassword,
  updateProfile,
} from "@/lib/actions/account";

interface SettingsFormProps {
  name: string;
  email: string;
  /** Caller's standing in the active workspace */
  workspaceRole: "OWNER" | "ADMIN" | "MEMBER" | null;
  workspaceName: string;
}

export function SettingsForm({
  name: initialName,
  email,
  workspaceRole,
  workspaceName,
}: SettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveProfile = async () => {
    if (!name.trim() || savingName) return;
    setSavingName(true);
    try {
      const result = await updateProfile({ name: name.trim() });
      if (!result.success) {
        toast.add({ type: "error", title: "Couldn't save", description: result.message });
        return;
      }
      toast.add({ type: "success", title: "Profile updated" });
      router.refresh();
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (savingPassword) return;
    if (newPassword.length < 8) {
      toast.add({
        type: "error",
        title: "New password is too short",
        description: "Use at least 8 characters.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.add({ type: "error", title: "Passwords don't match" });
      return;
    }
    setSavingPassword(true);
    try {
      const result = await changePassword({ currentPassword, newPassword });
      if (!result.success) {
        toast.add({ type: "error", title: "Couldn't update password", description: result.message });
        return;
      }
      toast.add({
        type: "success",
        title: "Password updated",
        description: "Other devices were signed out.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              {initialName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{initialName}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
            {workspaceRole && (
              <Badge
                variant={
                  workspaceRole === "OWNER"
                    ? "outline"
                    : workspaceRole === "ADMIN"
                      ? "default"
                      : "secondary"
                }
                className="ml-auto shrink-0"
              >
                {workspaceRole.charAt(0) + workspaceRole.slice(1).toLowerCase()} ·{" "}
                {workspaceName}
              </Badge>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-name">Display name</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={savingName || !name.trim() || name === initialName}
            >
              {savingName ? "Saving…" : "Save"}
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-email">Email</Label>
            <Input id="settings-email" value={email} disabled />
            <p className="text-[10px] text-muted-foreground">
              Your email is your identity on Handoff — invites and portal
              access are tied to it.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleChangePassword();
            }}
            className="grid gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              variant="outline"
              className="w-fit"
              disabled={
                savingPassword ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
            >
              {savingPassword ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
