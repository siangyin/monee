// app/[locale]/expenses/page.tsx
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { type Locale } from "@/i18n"

import DeleteExpenseButton from "@/components/expenses/DeleteExpenseButton"
import CategoryTag from "@/components/CategoryTag"
import { getAuthUserWithCategories } from "@/lib/authUser"

type PageProps = {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{
    month?: string
    category?: string
  }>
}

export default async function ExpensesPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params
  const { month = "all", category = "all" } = await searchParams

  const { user, categories } = await getAuthUserWithCategories()

  // Build WHERE filter object
  const where: any = {
    userId: user.id,
  }

  const now = new Date()

  // Month filter: all / this-month / last-month
  if (month === "this-month" || month === "last-month") {
    // Start from first day of this month (UTC)
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const end = new Date(start)

    if (month === "this-month") {
      // [this month, next month)
      end.setUTCMonth(start.getUTCMonth() + 1)
    } else {
      // last month: move window back by one month
      start.setUTCMonth(start.getUTCMonth() - 1)
      end.setUTCMonth(start.getUTCMonth() + 1)
    }

    where.date = {
      gte: start,
      lt: end,
    }
  }

  // Category filter: all / specific categoryId
  if (category && category !== "all") {
    where.categoryId = category
  }

  const monthOptions = [
    { value: "all", label: "All time" },
    { value: "this-month", label: "This month" },
    { value: "last-month", label: "Last month" },
  ]

  // Summary + list (both use the same WHERE)
  const [summary, expenses] = await Promise.all([
    prisma.expense.aggregate({
      where,
      _sum: {
        amountInBase: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        category: true,
        photoRef: true,
        group: true,
      },
    }),
  ])

  const totalCount = summary._count._all
  const totalAmountBase = summary._sum.amountInBase
    ? Number(summary._sum.amountInBase)
    : 0

  return (
    <main className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Summary</h1>
          <p className="text-sm text-gray-600">Personal spending overview.</p>
        </div>

        {/* Summary pill on the right (desktop), will stack on mobile */}
        <div className="text-right text-xs md:text-sm">
          <div className="font-medium">
            {totalCount} {totalCount === 1 ? "expense" : "expenses"}
          </div>
          <div className="text-gray-600">
            Total ≈ {totalAmountBase.toFixed(2)} (base)
          </div>
        </div>
      </div>

      {/* Filters */}
      <form
        method="GET"
        className="flex flex-wrap items-center gap-3 rounded-md border bg-white px-3 py-2 text-xs md:text-sm"
      >
        {/* Period filter */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Period</span>
          <select
            name="month"
            defaultValue={month}
            className="rounded-md border px-2 py-1"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Category</span>
          <select
            name="category"
            defaultValue={category}
            className="rounded-md border px-2 py-1"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="ml-auto rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
        >
          Apply
        </button>
      </form>

      {/* Expense list header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-semibold">Expenses</h2>
        <Link
          href={`/${locale}/expenses/new`}
          className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white"
        >
          New expense
        </Link>
      </div>

      {/* Expense list */}
      {expenses.length === 0 ? (
        <p className="text-sm text-gray-600">
          No expenses match the selected filters. Try changing period or
          category, or click <strong>New expense</strong> to add one.
        </p>
      ) : (
        <ul className="divide-y rounded-md border bg-white">
          {expenses.map((e) => (
            <li
              key={e.id}
              className="group border-b last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <Link
                href={`/${locale}/expenses/edit?id=${e.id}`}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                {/* Left side: thumbnail + text */}
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  {/* Thumbnail (if any) */}
                  {e.photoRef.length > 0 && e.photoRef[0]?.url ? (
                    <div className="shrink-0">
                      <img
                        src={e.photoRef[0].url}
                        alt="Expense photo preview"
                        className="h-24 w-24 rounded-md object-cover border border-gray-200"
                      />
                    </div>
                  ) : null}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-500">
                        {e.date.toISOString().slice(0, 10)}
                      </div>
                      <p className="font-medium">{e.title}</p>
                    </div>

                    {/* Category tag (inline under title) */}
                    <div className="mt-1">
                      {e.category ? (
                        <CategoryTag
                          name={e.category.name}
                          color={e.category.color}
                        />
                      ) : e.categoryNameSnapshot ? (
                        <CategoryTag name={e.categoryNameSnapshot} />
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Right: amount pill + icons */}
                <div className="ml-3 flex items-center gap-2">
                  {/* Amount pill */}
                  <div className="text-right">
                    <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-white group-hover:bg-gray-100">
                      {e.amount.toString()}&nbsp;{e.currency}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      ≈ {e.amountInBase.toString()} (base)
                    </div>
                  </div>

                  {/* Icons */}
                  <div className="flex items-center gap-1">
                    <DeleteExpenseButton id={e.id} locale={locale} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
