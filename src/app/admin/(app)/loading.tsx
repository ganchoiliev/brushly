/* Shared skeleton for every admin screen — shows instantly while server
   components fetch. */
export default function AdminLoading() {
  return (
    <div aria-busy="true">
      <div className="sticky top-0 z-30 border-b border-admin-hairline bg-admin-canvas/95">
        <div className="flex h-16 items-center px-4 md:px-8">
          <div className="h-7 w-36 animate-pulse rounded-sm bg-admin-raised" />
        </div>
      </div>
      <div className="space-y-3 px-4 py-5 md:max-w-2xl md:px-8">
        <div className="h-12 animate-pulse rounded-sm bg-admin-card" />
        <div className="h-28 animate-pulse rounded-sm bg-admin-card" />
        <div className="h-16 animate-pulse rounded-sm bg-admin-card" />
        <div className="h-16 animate-pulse rounded-sm bg-admin-card" />
        <div className="h-16 animate-pulse rounded-sm bg-admin-card" />
      </div>
    </div>
  )
}
