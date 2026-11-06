import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <EmptyState
        title="Page not found"
        body="That gallery, tag, or route does not exist in Koma."
      />
    </main>
  );
}
