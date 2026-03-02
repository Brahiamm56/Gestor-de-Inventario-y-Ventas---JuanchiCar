import { Skeleton } from "@/components/ui/skeleton"

export default function StockLoading() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
            </div>

            {/* KPI Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex items-center gap-4">
                            <Skeleton className="size-11 rounded-lg" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-6 w-16" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Skeletons */}
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
                {/* Table Toolbar Skeleton */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-full sm:w-[180px]" />
                    <Skeleton className="h-10 w-full sm:w-[160px]" />
                    <Skeleton className="h-10 w-full sm:w-[100px]" />
                    <Skeleton className="h-10 w-full sm:w-[120px]" />
                    <Skeleton className="h-10 w-full sm:w-[160px]" />
                </div>
                {/* Table Rows Skeleton */}
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <div className="p-0">
                        <div className="flex bg-slate-50 border-b border-slate-200 px-4 py-3">
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="divide-y divide-slate-100">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="flex px-4 py-4 gap-4">
                                    <Skeleton className="h-5 flex-1" />
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-5 w-16" />
                                    <Skeleton className="h-5 w-16" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
