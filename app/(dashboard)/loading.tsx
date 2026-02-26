"use client"

import { Loader2 } from "lucide-react"

export default function DashboardLoading() {
    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
            {/* Header skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <div className="h-8 w-64 rounded-lg bg-slate-200 animate-pulse" />
                    <div className="h-4 w-40 rounded-lg bg-slate-100 animate-pulse mt-2" />
                </div>
                <div className="h-10 w-36 rounded-xl bg-slate-200 animate-pulse" />
            </div>

            {/* KPI Cards skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex flex-col justify-between bg-white border border-gray-100 rounded-3xl p-6 shadow-sm"
                    >
                        <div className="flex items-start justify-between">
                            <div className="space-y-2">
                                <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
                                <div className="h-8 w-32 rounded bg-slate-200 animate-pulse" />
                                <div className="h-3 w-28 rounded bg-slate-100 animate-pulse" />
                            </div>
                            <div className="w-12 h-12 rounded-full bg-slate-100 animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm"
                    >
                        <div className="h-4 w-32 rounded bg-slate-200 animate-pulse mb-4" />
                        <div className="h-40 rounded-lg bg-slate-50 animate-pulse flex items-center justify-center">
                            <Loader2 className="size-6 text-slate-300 animate-spin" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
