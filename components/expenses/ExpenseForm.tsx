// components/expenses/ExpenseForm.tsx
"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { Locale } from "@/i18n"
import { expenseCurrencies } from "@/lib/validation/expense"
import { createExpense, updateExpense } from "@/app/actions/expenses"

type ExpenseFormProps = {
  locale: Locale
  mode: "create" | "edit"
  initialData?: {
    id: string
    title: string
    amount: number
    currency: string
    fxToBase: number
    date: string // "YYYY-MM-DD"
    note: string | null
    categoryId: string | null
    photoUrl: string | null
  }
  categories: {
    id: string
    name: string
    color: string | null
  }[]
  baseCurrency: string
  savedRatesByCurrency?: Record<string, number>
}

export default function ExpenseForm({
  locale,
  mode,
  initialData,
  categories,
  baseCurrency,
  savedRatesByCurrency = {},
}: ExpenseFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // --- Form state ---

  const [title, setTitle] = useState(initialData?.title ?? "")
  const [amountText, setAmountText] = useState(
    initialData ? String(initialData.amount) : ""
  )
  const [currency, setCurrency] = useState<string>(
    initialData?.currency ?? baseCurrency
  )
  const [fxToBase, setFxToBase] = useState<number>(
    initialData?.fxToBase ?? (currency === baseCurrency ? 1 : 0)
  )
  const [date, setDate] = useState(
    initialData?.date ?? new Date().toISOString().slice(0, 10)
  )
  const [note, setNote] = useState(initialData?.note ?? "")
  const [categoryId, setCategoryId] = useState<string>(
    initialData?.categoryId ?? ""
  )
  const [photoUrl, setPhotoUrl] = useState<string>(initialData?.photoUrl ?? "")

  const [error, setError] = useState<string | null>(null)

  // --- Auto-fill fxToBase from saved rates when currency changes ---

  useEffect(() => {
    // If same as base, rate is always 1.0
    if (currency === baseCurrency) {
      setFxToBase(1)
      return
    }

    // Use saved rate if we have one
    const saved = savedRatesByCurrency[currency]
    if (saved && saved > 0) {
      setFxToBase(saved)
      return
    }

    // Otherwise keep whatever user has typed (no-op)
  }, [currency, baseCurrency, savedRatesByCurrency])

  // --- Derived: approximate base amount ---

  const numericAmount = Number(amountText)
  const hasValidAmount =
    !Number.isNaN(numericAmount) && numericAmount > 0 && fxToBase > 0

  const approxBase = hasValidAmount
    ? Number((numericAmount * fxToBase).toFixed(2))
    : null

  // --- Submit handler ---

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const parsedAmount = Number(amountText)

    if (!title.trim()) {
      setError("Please enter a title.")
      return
    }

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount.")
      return
    }

    if (Number.isNaN(fxToBase) || fxToBase <= 0) {
      setError("Please enter a valid rate to base currency.")
      return
    }

    const payload = {
      title: title.trim(),
      amount: parsedAmount,
      currency,
      fxToBase,
      date,
      note: note.trim() === "" ? null : note.trim(),
      categoryId: categoryId || null,
      photoUrl: photoUrl.trim() === "" ? null : photoUrl.trim(),
    }

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createExpense(locale, payload)
        } else if (mode === "edit" && initialData?.id) {
          await updateExpense(locale, initialData.id, payload)
        } else {
          throw new Error("Missing expense id for edit mode.")
        }

        router.push(`/${locale}/expenses`)
        router.refresh()
      } catch (err) {
        console.error(err)
        setError("Something went wrong while saving. Please try again.")
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-md border bg-white p-4 text-sm"
    >
      {/* Title */}
      <div className="space-y-1">
        <label className="block text-xs text-gray-600">Title</label>
        <input
          type="text"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Coffee, Groceries, Grab ride"
          className="w-full rounded-md border px-3 py-2 text-sm"
          required
        />
      </div>

      {/* Amount + Currency */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1 space-y-1">
          <label className="block text-xs text-gray-600">
            Amount ({currency})
          </label>
          <input
            type="number"
            name="amount"
            min="0"
            step="0.01"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-md border px-3 py-2 text-sm"
            required
          />
        </div>

        <div className="w-full sm:w-40 space-y-1">
          <label className="block text-xs text-gray-600">Currency</label>
          <select
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            {expenseCurrencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* FX to base */}
      <div className="space-y-1">
        <label className="block text-xs text-gray-600">
          Rate to base ({baseCurrency})
        </label>
        <input
          type="number"
          name="fxToBase"
          min="0"
          step="0.0001"
          value={Number.isNaN(fxToBase) ? "" : fxToBase}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (e.target.value === "") {
              setFxToBase(0)
            } else if (Number.isFinite(v) && v >= 0) {
              setFxToBase(v)
            }
          }}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />

        <p className="text-[11px] text-gray-500">
          {currency === baseCurrency ? (
            <>Same as base currency, using 1.0000.</>
          ) : savedRatesByCurrency[currency] ? (
            <>
              Using saved rate:&nbsp;
              <span className="font-medium">
                1 {currency} ≈ {savedRatesByCurrency[currency].toFixed(4)}{" "}
                {baseCurrency}
              </span>
            </>
          ) : (
            <>
              No saved rate for {currency} → {baseCurrency}. Enter one manually.
            </>
          )}
        </p>

        {hasValidAmount && approxBase !== null && (
          <p className="text-[11px] text-emerald-700 mt-1">
            ≈ <span className="font-semibold">{approxBase.toFixed(2)}</span>{" "}
            {baseCurrency}
          </p>
        )}
      </div>

      {/* Date + Category */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="space-y-1">
          <label className="block text-xs text-gray-600">Date</label>
          <input
            type="date"
            name="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="flex-1 space-y-1">
          <label className="block text-xs text-gray-600">Category</label>
          <select
            name="categoryId"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Note */}
      <div className="space-y-1">
        <label className="block text-xs text-gray-600">Note (optional)</label>
        <textarea
          name="note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a short note, e.g. who joined, special remark..."
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      {/* Photo URL */}
      <div className="space-y-1">
        <label className="block text-xs text-gray-600">
          Photo URL (optional)
        </label>
        <input
          type="url"
          name="photoUrl"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          placeholder="Paste an image URL for quick visual reference"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />

        {photoUrl.trim() !== "" && (
          <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1">Preview:</div>
            {/* Use <img> to avoid next/image domain config issues */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt="Expense photo preview"
              className="h-24 w-24 rounded-md object-cover border border-gray-200"
            />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
            ? "Create expense"
            : "Save changes"}
        </button>
      </div>
    </form>
  )
}
