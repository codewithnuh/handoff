"use client";

import { useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";
import { CreateClientForm } from "./create-client-form";

export type ClientOption = {
  id: string;
  name: string;
  email?: string | null;
};

type ClientComboboxProps = {
  clients: ClientOption[];
  value: string;
  onChange: (clientId: string) => void;
};

export function ClientCombobox({
  clients,
  value,
  onChange,
}: ClientComboboxProps) {
  const [createClientOpen, setCreateClientOpen] = useState(false);

  const selectedClient = clients.find((client) => client.id === value) ?? null;

  return (
    <>
      <Combobox
        items={clients}
        itemToStringValue={(client) => client?.name ?? ""}
        value={selectedClient}
        onValueChange={(client) => {
          onChange(client?.id ?? "");
        }}
      >
        <ComboboxInput
          placeholder={
            clients.length ? "Select a client" : "Create your first client"
          }
        />

        <ComboboxContent>
          {clients.length === 0 ? (
            <ComboboxEmpty>
              <div className="flex flex-col items-center gap-2 p-3">
                <p className="text-sm text-muted-foreground">No clients yet.</p>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCreateClientOpen(true)}
                >
                  <IconPlus className="mr-2 h-4 w-4" />
                  Create client
                </Button>
              </div>
            </ComboboxEmpty>
          ) : (
            <>
              <ComboboxList>
                {(client) => (
                  <ComboboxItem key={client.id} value={client}>
                    <div className="flex flex-col">
                      <span>{client.name}</span>

                      {client.email && (
                        <span className="text-xs text-muted-foreground">
                          {client.email}
                        </span>
                      )}
                    </div>
                  </ComboboxItem>
                )}
              </ComboboxList>

              <div className="border-t p-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setCreateClientOpen(true)}
                >
                  <IconPlus className="mr-2 h-4 w-4" />
                  Create new client
                </Button>
              </div>
            </>
          )}
        </ComboboxContent>
      </Combobox>

      <Dialog open={createClientOpen} onOpenChange={setCreateClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Client</DialogTitle>

            <DialogDescription>
              Add a client to your workspace.
            </DialogDescription>
          </DialogHeader>

          <CreateClientForm
            onCreated={(client) => {
              onChange(client.id);
              setCreateClientOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
