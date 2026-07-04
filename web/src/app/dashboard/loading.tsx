export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-neutral-200 border-t-brand" />
        <p className="text-sm text-neutral-500">Loading your dashboard…</p>
      </div>
    </div>
  );
}
