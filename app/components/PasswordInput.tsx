'use client'

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

type PasswordInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  placeholder?: string
  required?: boolean
  minLength?: number
  inputClassName?: string
}

export function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  required,
  minLength,
  inputClassName = "w-full outline-none",
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-900">{label}</label>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
        <input
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClassName}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
        />
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={isVisible ? "Ocultar contrasena" : "Mostrar contrasena"}
          title={isVisible ? "Ocultar contrasena" : "Mostrar contrasena"}
        >
          {isVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  )
}
