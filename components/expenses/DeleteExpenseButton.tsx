// components/expenses/DeleteExpenseButton.tsx
"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { deleteExpense } from "@/app/actions/expenses"

export default function DeleteExpenseButton({
  id,
  locale,
}: {
  id: string
  locale: string
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    // prevent the parent <Link> from navigating
    e.preventDefault()
    e.stopPropagation()

    if (!window.confirm("Delete this expense?")) return

    startTransition(async () => {
      try {
        await deleteExpense(locale, id)
        toast.success("Expense deleted")
        router.refresh()
      } catch (err) {
        console.error(err)
        toast.error("Failed to delete expense")
      }
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="p-1 text-zinc-400 hover:text-black rounded-md disabled:opacity-50"
      aria-label="Delete"
    >
      <Trash2 size={16} />
    </button>
  )
}
