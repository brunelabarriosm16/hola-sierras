import { Search } from "lucide-react"

export type AdminStatusFilter = "all" | "activo" | "borrador" | "oculto"

type AdminContentFiltersProps = {
  search: string
  status: AdminStatusFilter
  total: number
  visible: number
  placeholder?: string
  onSearchChange: (value: string) => void
  onStatusChange: (value: AdminStatusFilter) => void
}

const statusOptions: Array<{ value: AdminStatusFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "activo", label: "Visibles" },
  { value: "borrador", label: "Borradores" },
  { value: "oculto", label: "Ocultos" },
]

export function AdminContentFilters({
  search,
  status,
  total,
  visible,
  placeholder = "Buscar",
  onSearchChange,
  onStatusChange,
}: AdminContentFiltersProps) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          <Search className="h-4 w-4 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onStatusChange(option.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  status === option.value
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="text-sm text-slate-500">
            {visible} de {total}
          </div>
        </div>
      </div>
    </div>
  )
}
