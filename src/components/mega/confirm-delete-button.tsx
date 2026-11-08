"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function ConfirmDeleteButton({
  action,
  id,
  redirectTo,
  title,
  description,
  triggerLabel = "Excluir",
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  redirectTo?: string;
  title: string;
  description?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function confirmar() {
    setPending(true);
    const fd = new FormData();
    fd.set("id", id);
    try {
      await action(fd);
      toast.success("Excluído.");
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir.");
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "destructive", size: "sm" })}>{triggerLabel}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={pending} onClick={confirmar}>
            Confirmar exclusão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
