// components/expenses/ExpenseForm.tsx
"use client"
import Image from "next/image"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import {
  createExpenseSchema,
  type CreateExpenseInput,
  expenseCurrencies,
} from "@/lib/validation/expense"
import { createExpense, updateExpense } from "@/app/actions/expenses"

type Mode = "create" | "edit"

type ExpenseInitial = {
  id: string
  title: string
  amount: number
  currency: (typeof expenseCurrencies)[number]
  fxToBase: number
  date: string // yyyy-mm-dd
  note?: string | null
  categoryId?: string | null
  photoUrl?: string | null
}

type CategoryOption = {
  id: string
  name: string
  color?: string | null
}

export default function ExpenseForm({
  locale,
  mode,
  initialData,
  categories,
}: {
  locale: string
  mode: Mode
  initialData?: ExpenseInitial
  categories: CategoryOption[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const form = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          amount: initialData.amount,
          currency: initialData.currency,
          fxToBase: initialData.fxToBase,
          date: initialData.date,
          categoryId: initialData.categoryId ?? null,
          note: initialData.note ?? "",
          photoUrl: initialData.photoUrl ?? undefined,
        }
      : {
          title: "",
          amount: 0,
          currency: "SGD",
          fxToBase: 1,
          date: new Date().toISOString().slice(0, 10),
          categoryId: null,
          note: "",
          photoUrl: undefined,
        },
  })

  const amount = form.watch("amount")
  const fxToBase = form.watch("fxToBase")
  const rawPhoto = form.watch("photoUrl")
  const photoUrl =
    typeof rawPhoto === "string" && rawPhoto.trim().length > 0
      ? rawPhoto.trim()
      : ""

  const normalized =
    amount && fxToBase ? Number((amount * fxToBase).toFixed(2)) : 0

  function onSubmit(values: CreateExpenseInput) {
    startTransition(async () => {
      try {
        if (mode === "create") {
          await createExpense(locale, values)
          toast.success("Expense created")
        } else {
          if (!initialData) {
            toast.error("Missing expense id")
            return
          }
          await updateExpense(locale, initialData.id, values)
          toast.success("Expense updated")
        }

        router.push(`/${locale}/expenses`)
      } catch (err) {
        console.error(err)
        toast.error("Failed to save expense")
      }
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-1">
        <label className="text-sm font-medium">Title</label>
        <input
          type="text"
          {...form.register("title")}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Coffee at Starbucks"
        />
        {form.formState.errors.title && (
          <p className="text-xs text-red-600">
            {form.formState.errors.title.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Amount</label>
          <input
            type="number"
            step="0.01"
            {...form.register("amount", { valueAsNumber: true })}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          {form.formState.errors.amount && (
            <p className="text-xs text-red-600">
              {form.formState.errors.amount.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Currency</label>
          <select
            {...form.register("currency")}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Select</option>
            {expenseCurrencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {form.formState.errors.currency && (
            <p className="text-xs text-red-600">
              {form.formState.errors.currency.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">
          Rate to base (your main currency)
        </label>
        <input
          type="number"
          step="0.0001"
          {...form.register("fxToBase", { valueAsNumber: true })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        {form.formState.errors.fxToBase && (
          <p className="text-xs text-red-600">
            {form.formState.errors.fxToBase.message}
          </p>
        )}
        {normalized > 0 && (
          <p className="text-xs text-gray-600 mt-1">
            ≈ {normalized.toFixed(2)} (base currency)
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Date</label>
        <input
          type="date"
          {...form.register("date")}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        {form.formState.errors.date && (
          <p className="text-xs text-red-600">
            {form.formState.errors.date.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Category</label>
        <select
          {...form.register("categoryId")}
          className="w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {form.formState.errors.categoryId && (
          <p className="text-xs text-red-600">
            {form.formState.errors.categoryId.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Photo URL (optional)</label>
        <input
          type="url"
          {...form.register("photoUrl")}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="https://example.com/receipt.jpg"
        />
        {form.formState.errors.photoUrl && (
          <p className="text-xs text-red-600">
            {form.formState.errors.photoUrl.message}
          </p>
        )}

        {/* Live preview */}
        {photoUrl && (
          <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1">Preview:</div>

            <img
              src={photoUrl}
              alt="Expense photo preview"
              className="h-24 w-24 rounded-md object-cover border border-gray-200"
            />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Note (optional)</label>
        <textarea
          rows={3}
          {...form.register("note")}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Who, where, why..."
        />
        {form.formState.errors.note && (
          <p className="text-xs text-red-600">
            {form.formState.errors.note.message}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending
            ? "Saving..."
            : mode === "create"
            ? "Save expense"
            : "Save changes"}
        </button>
      </div>
    </form>
  )
}
