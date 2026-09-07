"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Download, Heart, Share2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const QRIS_SRC = "/qris-dondate.jpeg";

/**
 * Donation sheet.
 *
 * QRIS is the Indonesian national QR payment standard: one code works with
 * every bank and e-wallet app, so a single image covers GoPay, OVO, DANA,
 * ShopeePay and mobile banking without integrating any of them — and without
 * this app ever touching a payment flow or handling anyone's money.
 *
 * The code is shown on a white card in both themes. A QR scanner needs the
 * dark-on-light polarity to read reliably, so this deliberately does not
 * follow the app theme.
 */
export function DonateSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [saving, setSaving] = useState(false);

  /**
   * Saving beats screenshotting: the payer usually has to leave this app to
   * open their banking app, and a screenshot of a partially-scrolled sheet
   * often crops the code.
   */
  async function saveImage() {
    setSaving(true);
    try {
      const response = await fetch(QRIS_SRC);
      const blob = await response.blob();
      const file = new File([blob], "sakina-qris.jpeg", { type: blob.type });

      // Prefer the share sheet on mobile — it offers "Save to Photos", which
      // is where people expect a payment code to end up.
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: "Sakina — QRIS" });
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "sakina-qris.jpeg";
      link.click();
      URL.revokeObjectURL(url);
      toast.success("QRIS saved");
    } catch {
      toast.error("Could not save the code — try a screenshot instead");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92dvh] max-w-lg overflow-y-auto rounded-t-[28px] pb-10"
        aria-describedby={undefined}
      >
        <div className="px-5 pt-2">
          <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
            <Heart className="size-5 fill-rose-500 text-rose-500" aria-hidden />
            Support Sakina
          </SheetTitle>

          <p className="text-muted-foreground mt-2 text-sm">
            The app is free and stays free. Donations only cover hosting — they
            do not unlock anything, because nothing is locked.
          </p>

          {/* White card regardless of theme: scanners need dark-on-light. */}
          <div className="mt-4 rounded-2xl bg-white p-3">
            <Image
              src={QRIS_SRC}
              alt="QRIS payment code for Sakina"
              width={874}
              height={1240}
              className="h-auto w-full rounded-xl"
              priority
            />
          </div>

          <p className="text-muted-foreground mt-3 text-center text-xs">
            Scan with any bank or e-wallet app that supports QRIS.
          </p>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void saveImage()}
              disabled={saving}
              className="bg-primary text-primary-foreground inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full font-semibold disabled:opacity-50"
            >
              {typeof navigator !== "undefined" && "canShare" in navigator ? (
                <Share2 className="size-4" aria-hidden />
              ) : (
                <Download className="size-4" aria-hidden />
              )}
              {saving ? "Saving…" : "Save code"}
            </button>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="bg-muted text-foreground inline-flex min-h-12 items-center justify-center rounded-full px-6 font-medium"
            >
              Close
            </button>
          </div>

          <p className="text-muted-foreground/70 mt-4 text-center text-xs">
            Thank you — and please keep us in your du&rsquo;a.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
