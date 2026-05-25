'use client'

import { Heart } from "lucide-react"

type EventLikeButtonProps = {
  count: number
  liked: boolean
  onClick: () => void
  disabled?: boolean
  className?: string
}

export function EventLikeButton({
  count,
  liked,
  onClick,
  disabled = false,
  className = "",
}: EventLikeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      aria-pressed={liked}
    >
      <Heart
        className={`h-4 w-4 ${liked ? "fill-current" : ""}`}
      />
      {count}
    </button>
  )
}
