import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function VendorSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="relative h-48">
        <Skeleton className="w-full h-full" />
        <div className="absolute top-4 left-4">
          <Skeleton className="w-12 h-12 rounded-full" />
        </div>
        <div className="absolute top-4 right-4">
          <Skeleton className="w-16 h-6 rounded-full" />
        </div>
      </div>
      
      <CardContent className="p-4">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3 mb-3" />
        
        <div className="flex gap-1 mb-3">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-14" />
        </div>
        
        <Skeleton className="h-4 w-20" />
      </CardContent>
    </Card>
  );
}