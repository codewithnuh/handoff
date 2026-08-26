"use client";

import { useState } from "react";
import { Send, Link2, Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { inviteClient } from "@/lib/actions/invitation";

export function InviteClientDialog({
  projectId,
  clientName,
  clientEmail,
}: {
  projectId: string;
  clientName: string;
  clientEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(clientEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await inviteClient({
        projectId,
        email: email.trim(),
      });

      if (!result.success) {
        toast.add({
          type: "error",
          title: "Couldn't create invitation",
          description: result.message,
        });
        return;
      }

      setInviteLink(result.data.acceptUrl);
      toast.add({
        type: "success",
        title: "Invitation created",
        description: "Copy the link and share it with your client.",
      });
    } catch (error) {
      toast.add({
        type: "error",
        title: "Something went wrong",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.add({
        type: "success",
        title: "Link copied",
        description: "Paste it into a message to share with your client.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.add({
        type: "error",
        title: "Couldn't copy",
        description: "Please copy the link manually.",
      });
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setInviteLink(null);
      setCopied(false);
      setEmail(clientEmail);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Send className="mr-1.5 h-3.5 w-3.5" />
        Invite
      </DialogTrigger>
      <DialogContent className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Invite client to project</DialogTitle>
          <DialogDescription>
            Generate a portal link for {clientName}. Copy it and send it however
            you like.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
              <Link2 className="size-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground truncate flex-1 font-mono">
                {inviteLink}
              </p>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleCopyLink(inviteLink)}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="size-4 text-green-600" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This link expires in 7 days. Share it via email, Slack, or any
              messaging app.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-email">Client email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {inviteLink ? "Done" : "Cancel"}
          </DialogClose>
          {!inviteLink && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !email.trim()}
            >
              {isSubmitting ? "Creating..." : "Create Link"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
