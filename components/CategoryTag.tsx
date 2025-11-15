"use client"

export default function CategoryTag({
  name,
  color,
}: {
  name: string
  color?: string | null
}) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
      style={{
        backgroundColor: color ?? "#e5e7eb", // fallback gray
        color: "#111", // readable text
      }}
    >
      {name}
    </span>
  )
}
