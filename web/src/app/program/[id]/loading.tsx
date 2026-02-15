import { Skeleton } from "@/components/ui/Skeleton";

export default function ProgramLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <div>
        <Skeleton className="mb-2 h-8 w-72" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="mt-2 h-3 w-64" />
      </div>
      <div className="flex gap-0 border-b border-sol-border pb-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
