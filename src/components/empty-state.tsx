import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  body,
  actionHref = "/",
  actionLabel = "Back to newest",
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
      <h2 className="font-heading text-2xl italic">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      <Link
        href={actionHref}
        className={cn(buttonVariants({ variant: "outline" }), "mt-6")}
      >
        {actionLabel}
      </Link>
    </div>
  );
}

export function ErrorState({
  title = "Could not load galleries",
  body,
}: {
  title?: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
      <h2 className="font-heading text-2xl italic">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      <form className="mt-6">
        <Button type="submit" variant="outline">
          Try again
        </Button>
      </form>
    </div>
  );
}
