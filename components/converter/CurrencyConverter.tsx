// components/converter/CurrencyConverter.tsx
"use client"

import { useEffect, useState } from "react"
import { expenseCurrencies } from "@/lib/validation/expense"
import { saveFxRate } from "@/app/actions/fxRates"

type SavedRate = {
  id: string
  base: string
  quote: string
  rate: number
  asOfDate: string
}

type Props = {
  locale: string
  baseCurrency: string
  savedRates: SavedRate[]
}

export default function CurrencyConverter({
  locale,
  baseCurrency,
  savedRates,
}: Props) {
  const base = baseCurrency

  // 🔹 Decide initial spending currency & initial rate from savedRates
  const initialSpendingCurrency =
    savedRates.find((r) => r.base === baseCurrency)?.quote ?? baseCurrency

  const initialRate =
    savedRates
      .find(
        (r) => r.base === baseCurrency && r.quote === initialSpendingCurrency
      )
      ?.rate?.toString() ?? ""

  const [amount, setAmount] = useState<string>("")
  const [spendingCurrency, setSpendingCurrency] = useState<string>(
    initialSpendingCurrency
  )
  const [rate, setRate] = useState<string>(initialRate)
  const [result, setResult] = useState<number | null>(null)

  const quote = spendingCurrency

  // 🔹 Auto-update rate when user changes spending currency
  useEffect(() => {
    const match = savedRates.find(
      (r) => r.base === baseCurrency && r.quote === spendingCurrency
    )
    if (match) {
      setRate(match.rate.toString())
    }
    // If no saved rate for this pair, we keep whatever is currently in `rate`
  }, [spendingCurrency, baseCurrency, savedRates])

  // 🔹 Auto-convert whenever amount or rate changes
  useEffect(() => {
    const amt = Number(amount)
    const r = Number(rate)
    if (!Number.isFinite(amt) || amt <= 0 || !Number.isFinite(r) || r <= 0) {
      setResult(null)
      return
    }
    setResult(Number((amt * r).toFixed(2)))
  }, [amount, rate])

  // Bind server action with locale for the save form
  const handleSaveRate = saveFxRate.bind(null, locale)

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {/* Left: converter form */}
      <section className="rounded-md border bg-white p-4 space-y-4 text-sm">
        <div>
          <h2 className="text-sm font-medium">Convert spending</h2>
        </div>

        {/* Live result */}
        <div className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs">
          <div className="text-gray-600 mb-1">Result</div>
          {result !== null ? (
            <div className="text-sm font-semibold">
              {amount || 0} {quote} ≈ {result.toFixed(2)} {base}
            </div>
          ) : (
            <div className="text-[11px] text-gray-500">
              Enter amount and a valid rate to see the converted value.
            </div>
          )}
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
          {/* Amount & currency */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <label className="block text-xs text-gray-600">
                Amount in spending currency
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs text-gray-600">
                Spending currency
              </label>
              <select
                value={spendingCurrency}
                onChange={(e) => setSpendingCurrency(e.target.value)}
                className="rounded-md border px-3 py-2 text-sm"
              >
                {expenseCurrencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rate input */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-600">
              Rate (1 {quote} = how many {base}?)
            </label>
            <input
              type="number"
              min="0"
              step="0.00000001"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder={`e.g. 0.0098 (1 ${quote} = 0.0098 ${base})`}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </form>

        {/* Save rate form (server action) */}
        <form
          action={handleSaveRate}
          className="mt-4 flex flex-col gap-2 border-t pt-3 text-xs sm:flex-row sm:items-center"
        >
          {/* Hidden fields to send to server */}
          <input type="hidden" name="base" value={base} />
          <input type="hidden" name="quote" value={quote} />
          <input type="hidden" name="rate" value={rate} />

          <div className="flex-1 text-[11px] text-gray-500">
            Save this rate so you can reuse it when adding expenses.
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
          >
            Save rate (1 {quote} = {rate || "?"} {base})
          </button>
        </form>
      </section>

      {/* Right: saved rates */}
      <section className="rounded-md border bg-white p-4 text-sm space-y-3">
        <h2 className="text-sm font-medium">Saved rates</h2>

        {savedRates.length === 0 ? (
          <p className="text-xs text-gray-500">
            You don&apos;t have any saved rates yet. After you enter a rate on
            the left, click &ldquo;Save rate&rdquo; to store it.
          </p>
        ) : (
          <ul className="space-y-2 text-xs">
            {savedRates.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <div className="font-medium">
                    1 {r.quote} = {r.rate.toFixed(6)} {r.base}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Saved on {new Date(r.asOfDate).toLocaleString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
