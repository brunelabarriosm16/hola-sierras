type AuthFormStatusProps = {
  tone: "error" | "success" | "notice"
  message: string
}

export function AuthFormStatus({ tone, message }: AuthFormStatusProps) {
  const className =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : tone === "notice"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-700"

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${className}`}>
      {message}
    </div>
  )
}
