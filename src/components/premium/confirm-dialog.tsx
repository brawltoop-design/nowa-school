"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import { PremiumButton } from "@/components/premium/premium-button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  pending?: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  tone = "danger",
  pending = false,
  onConfirm,
}: ConfirmDialogProps) {
  const confirmToneClass =
    tone === "danger"
      ? "border border-[#d84d3c] bg-[#d84d3c] text-white hover:border-[#c43f2e] hover:bg-[#c43f2e]"
      : undefined;
  const cancelToneClass =
    "h-11 px-5 border border-white/12 bg-white/10 text-white hover:border-white/18 hover:bg-white/14";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/52 backdrop-blur-md data-[state=closed]:animate-out data-[state=open]:animate-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/12 bg-[#070b14]/92 p-6 text-white shadow-[0_28px_90px_rgba(2,6,23,0.46)] outline-none backdrop-blur-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex size-12 items-center justify-center rounded-[1.3rem] border border-white/12 bg-white/10 text-[#ff8d7c]">
              <AlertTriangle className="size-5" />
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex size-10 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white/72 transition duration-200 hover:border-white/18 hover:bg-white/12 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Title className="mt-5 text-2xl font-semibold tracking-tight text-white">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-3 text-sm leading-7 text-white/76">
            {description}
          </Dialog.Description>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <PremiumButton
              type="button"
              tone="secondary"
              className={cancelToneClass}
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </PremiumButton>
            <PremiumButton
              type="button"
              className={
                confirmToneClass ? `h-11 px-5 ${confirmToneClass}` : "h-11 px-5"
              }
              disabled={pending}
              onClick={onConfirm}
              tone={tone === "danger" ? "primary" : "secondary"}
            >
              {pending ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : null}
              {confirmLabel}
            </PremiumButton>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
