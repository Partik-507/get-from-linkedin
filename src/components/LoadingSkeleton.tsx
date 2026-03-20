import { Skeleton } from "@/components/ui/skeleton";

export const CardSkeleton = () => (
  <div className="glass rounded-xl p-6 space-y-4">
    <Skeleton className="h-6 w-32 bg-muted" />
    <Skeleton className="h-4 w-full bg-muted" />
    <Skeleton className="h-4 w-3/4 bg-muted" />
    <div className="flex gap-2 pt-2">
      <Skeleton className="h-9 w-24 bg-muted rounded-lg" />
      <Skeleton className="h-9 w-24 bg-muted rounded-lg" />
    </div>
  </div>
);

export const QuestionSkeleton = () => (
  <div className="glass rounded-xl p-5 space-y-3">
    <Skeleton className="h-5 w-full bg-muted" />
    <div className="flex gap-2">
      <Skeleton className="h-5 w-16 bg-muted rounded-full" />
      <Skeleton className="h-5 w-12 bg-muted rounded-full" />
    </div>
  </div>
);

export const GridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);
