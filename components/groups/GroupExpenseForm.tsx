// components/groups/GroupExpenseForm.tsx
import { expenseCurrencies } from "@/lib/validation/expense"
import type { Category, GroupMember, User } from "@prisma/client"

type GroupExpenseFormProps = {
  groupDefaultCurr: string
  today: string
  categories: Category[]
  members: (GroupMember & { user: User })[]
  savedRatesSummary?: string
  action: (formData: FormData) => Promise<void>
}

export default function GroupExpenseForm({
  groupDefaultCurr,
  today,
  categories,
  members,
  savedRatesSummary,
  action,
}: GroupExpenseFormProps) {
  return (
    <div className="space-y-3 rounded-md border bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-gray-900">Add group expense</h2>
        <p className="text-[11px] text-gray-500">
          Multi-currency supported · split however you like.
        </p>
      </div>

      <form action={action} className="space-y-4 text-sm">
        {/* Title */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-600">Title</label>
          <input
            type="text"
            name="title"
            required
            placeholder="e.g. Dinner, Hotel, Taxi"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        {/* Amount + currency + FX + date */}
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
          {/* Amount + currency */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-600">
              Amount (spending currency)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                name="amount"
                min="0"
                step="0.01"
                required
                placeholder="0.00"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <select
                name="currency"
                defaultValue={groupDefaultCurr}
                className="w-24 rounded-md border px-2 py-2 text-xs"
              >
                {expenseCurrencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              Example: paid in JPY but balances kept in{" "}
              <span className="font-medium">{groupDefaultCurr}</span>.
            </p>
          </div>

          {/* FX to base */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-600">
              FX to {groupDefaultCurr}
            </label>
            <input
              type="number"
              name="fxToBase"
              min="0"
              step="0.0001"
              placeholder="1.0000"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              1 spending currency = <span className="font-mono">X</span>{" "}
              {groupDefaultCurr}. Leave empty if same currency.
            </p>

            {savedRatesSummary && (
              <p className="mt-1 text-[11px] text-gray-500">
                Saved rates to {groupDefaultCurr}:{" "}
                <span className="font-mono">{savedRatesSummary}</span>
              </p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1">
            <label className="block text-xs text-gray-600">Date</label>
            <input
              type="date"
              name="date"
              defaultValue={today}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-600">Category</label>
          <select
            name="categoryId"
            defaultValue=""
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

        {/* Split mode + Percent + Manual details */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs text-gray-600">Split mode</label>
            <span className="text-[10px] text-gray-400">
              Equal is default. Use Percent or Manual when needed.
            </span>
          </div>

          {/* Split mode selector */}
          <select
            name="splitMode"
            defaultValue="EQUAL"
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="EQUAL">Equal between all members</option>
            <option value="PERCENT">Percent by person</option>
            <option value="MANUAL">Manual amounts</option>
          </select>

          {/* Percent per member inputs */}
          <div className="space-y-2 rounded-md border bg-gray-50 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-gray-700">
                Percent per member (for Percent mode)
              </span>
              <span className="text-[10px] text-gray-500">
                We&apos;ll normalise – aim for around 100% total.
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate text-xs text-gray-700">
                    {m.user.name || m.user.email}
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      name={`percent_${m.userId}`}
                      min="0"
                      step="0.01"
                      placeholder="0"
                      className="w-16 rounded-md border px-2 py-1 text-right text-xs"
                    />
                    <span className="text-[11px] text-gray-500">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Manual per member inputs */}
          <div className="space-y-2 rounded-md border bg-gray-50 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-gray-700">
                Manual amounts (for Manual mode)
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate text-xs text-gray-700">
                    {m.user.name || m.user.email}
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      name={`manual_${m.userId}`}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-20 rounded-md border px-2 py-1 text-right text-xs"
                    />
                    <span className="text-[11px] text-gray-500">
                      {groupDefaultCurr}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-600">Note (optional)</label>
          <textarea
            name="note"
            rows={2}
            placeholder="Add a note if needed..."
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Add expense
        </button>
      </form>
    </div>
  )
}
