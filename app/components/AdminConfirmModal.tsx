'use client'

import { AlertTriangle, X } from "lucide-react"

type AdminConfirmModalProps = {
  isOpen: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: "danger" | "primary"
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function AdminConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
  isLoading = false,
}: AdminConfirmModalProps) {
  if (!isOpen) return null

  const confirmClasses =
    confirmVariant === "danger"
      ? "bg-red-600 hover:bg-red-500"
      : "bg-blue-600 hover:bg-blue-500"

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-50 p-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="text-slate-500 transition hover:text-slate-900"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm leading-7 text-slate-600">{description}</p>
        </div>

        <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-xl px-4 py-3 font-medium text-white transition disabled:opacity-60 ${confirmClasses}`}
          >
            {isLoading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
