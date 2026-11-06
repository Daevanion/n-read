"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const COOKIE = "eronikki_age=1; Max-Age=31536000; Path=/; SameSite=Lax";

export function AgeGate({
  initialOk,
  children,
}: {
  initialOk: boolean;
  children: ReactNode;
}) {
  const [allowed, setAllowed] = useState(initialOk);
  const [checked, setChecked] = useState(false);
  const [declined, setDeclined] = useState(false);

  if (allowed) return <>{children}</>;

  if (declined) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="font-heading text-3xl italic">eronikki</p>
          <p className="mt-4 text-muted-foreground">
            This reader is only for adults. Close the tab if you are under 18.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">
          18+
        </p>
        <h1 className="font-heading mt-3 text-3xl italic">eronikki</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          A manga reader for galleries on nhentai. The catalog is adult. You
          must be 18 or older to open it. Galleries tagged as involving minors
          are hidden here, including lolicon, shotacon, kodomo, and the
          related tags.
        </p>
        <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm">
          <Checkbox
            checked={checked}
            onCheckedChange={(value) => setChecked(value === true)}
            className="mt-0.5"
          />
          <span>I am 18 or older, and I want to continue.</span>
        </label>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setDeclined(true)}>
            I am under 18
          </Button>
          <Button
            disabled={!checked}
            onClick={() => {
              document.cookie = COOKIE;
              setAllowed(true);
            }}
          >
            Enter the reader
          </Button>
        </div>
      </div>
    </main>
  );
}
