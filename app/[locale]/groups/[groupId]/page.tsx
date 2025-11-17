// app/[locale]/groups/[groupId]/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { type Locale } from "@/i18n"
import { getAuthUserWithCategories } from "@/lib/authUser"
import {
  createGroupExpenseEqualSplit,
  updateGroupName,
  addGroupMemberByEmail,
  deleteGroupExpense,
} from "@/app/actions/groups"
import { expenseCurrencies } from "@/lib/validation/expense"

type PageProps = {
  params: Promise<{ locale: Locale; groupId: string }>
}

export default async function GroupDetailPage({ params }: PageProps) {
  const { locale, groupId } = await params

  // Ensure user is signed in & in Prisma, and get their categories
  const { user, categories } = await getAuthUserWithCategories()

  // Fetch the group that this user is a member of
  const membership = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId: user.id,
    },
    include: {
      group: true,
    },
  })

  if (!membership) {
    notFound()
  }

  const group = membership.group

  // Load all members of this group
  const members = await prisma.groupMember.findMany({
    where: { groupId: group.id },
    include: { user: true },
    orderBy: { role: "asc" },
  })

  // Load group expenses
  const expenses = await prisma.expense.findMany({
    where: { groupId: group.id },
    include: { user: true, shares: true },
    orderBy: { date: "desc" },
  })

  const isAdmin = membership.role === "ADMIN"

  const handleUpdateName = updateGroupName.bind(null, locale, group.id)
  const handleCreateExpense = createGroupExpenseEqualSplit.bind(
    null,
    locale,
    group.id
  )
  const handleAddMember = addGroupMemberByEmail.bind(null, locale, group.id)

  // --- Balances calculation using ExpenseShare ---

  // How much each member has paid (as payer)
  const totalPaidBy: Record<string, number> = {}
  // How much each member owes (sum of shares)
  const totalOwesBy: Record<string, number> = {}

  for (const m of members) {
    totalPaidBy[m.userId] = 0
    totalOwesBy[m.userId] = 0
  }

  let totalGroupAmount = 0

  for (const e of expenses) {
    const paid = Number(e.amountInBase ?? e.amount)
    totalGroupAmount += paid

    // Track who paid
    if (totalPaidBy[e.userId] === undefined) {
      totalPaidBy[e.userId] = 0
    }
    totalPaidBy[e.userId] += paid

    // Track who owes based on shares
    if (e.shares && e.shares.length > 0) {
      for (const s of e.shares) {
        const shareAmount = Number(s.amount)
        if (totalOwesBy[s.userId] === undefined) {
          totalOwesBy[s.userId] = 0
        }
        totalOwesBy[s.userId] += shareAmount
      }
    } else {
      // Fallback: no shares → equal split among all members
      const count = members.length || 1
      const equalShare = paid / count
      for (const m of members) {
        totalOwesBy[m.userId] += equalShare
      }
    }
  }

  const memberCount = members.length || 1
  const fairSharePerPerson =
    memberCount > 0 ? totalGroupAmount / memberCount : 0

  const balances = members.map((m) => {
    const paid = totalPaidBy[m.userId] ?? 0
    const owes = totalOwesBy[m.userId] ?? 0
    const net = paid - owes
    return {
      userId: m.userId,
      nameOrEmail: m.user.name || m.user.email,
      net,
    }
  })

  // Default date = today (YYYY-MM-DD), for the date input
  const today = new Date().toISOString().slice(0, 10)

  return (
    <main className="space-y-6">
      {/* Header / breadcrumb + editable name */}
      <div className="flex items-center justify-between gap-3">
        <div className="w-full max-w-xl">
          <div className="text-xs text-gray-500 mb-1">
            <Link href={`/${locale}/groups`} className="hover:underline">
              Groups
            </Link>{" "}
            / <span>{group.name}</span>
          </div>

          {isAdmin ? (
            <form
              action={handleUpdateName}
              className="flex flex-col sm:flex-row sm:items-center gap-2"
            >
              <input
                type="text"
                name="name"
                defaultValue={group.name}
                className="flex-1 rounded-md border px-3 py-2 text-lg md:text-2xl font-semibold"
              />
              <button
                type="submit"
                className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
              >
                Save
              </button>
            </form>
          ) : (
            <h1 className="text-2xl md:text-3xl font-semibold">{group.name}</h1>
          )}

          <p className="text-xs text-gray-500 mt-1">
            Default currency: {group.defaultCurr}
          </p>
        </div>
      </div>

      {/* Layout: left = expenses & form; right = balances & members */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        {/* Left: add expense + expenses list */}
        <section className="space-y-4">
          {/* Add group expense form */}
          <div className="rounded-md border bg-white p-4 space-y-3">
            <h2 className="text-sm font-medium">Add group expense</h2>

            <form action={handleCreateExpense} className="space-y-3 text-sm">
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

              <div className="flex flex-col gap-3 sm:flex-row">
                {/* Amount + currency */}
                <div className="flex-1 space-y-1">
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
                      defaultValue={group.defaultCurr}
                      className="w-28 rounded-md border px-2 py-2 text-xs"
                    >
                      {expenseCurrencies.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    E.g. pay in JPY, but balances are kept in{" "}
                    <span className="font-medium">{group.defaultCurr}</span>.
                  </p>
                </div>

                {/* FX + date */}
                <div className="space-y-1">
                  <label className="block text-xs text-gray-600">
                    FX to {group.defaultCurr}
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
                    1 spending currency =&nbsp;
                    <span className="font-mono">X</span> {group.defaultCurr}.
                    Leave empty if same currency.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs text-gray-600">Date</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={today}
                    className="rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Category select */}
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
                  <label className="block text-xs text-gray-600">
                    Split mode
                  </label>
                  <span className="text-[10px] text-gray-400">
                    Equal is the default. Use Percent or Manual when needed.
                  </span>
                </div>

                {/* Real splitMode control */}
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
                <div className="rounded-md border bg-gray-50 px-3 py-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-700">
                      Percent per member (when using Percent)
                    </span>
                    <span className="text-[10px] text-gray-500">
                      We&apos;ll normalise – aim for around 100% total.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {members.map((m) => (
                      <div
                        key={m.userId}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-xs text-gray-700 truncate">
                          {m.user.name || m.user.email}
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            name={`percent_${m.userId}`}
                            min="0"
                            step="0.01"
                            placeholder="0"
                            className="w-16 rounded-md border px-2 py-1 text-xs text-right"
                          />
                          <span className="text-[11px] text-gray-500">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Manual per member inputs */}
                <div className="rounded-md border bg-gray-50 px-3 py-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-700">
                      Manual amounts (when using Manual)
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Enter amounts in {group.defaultCurr}. We&apos;ll check the
                      total.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {members.map((m) => (
                      <div
                        key={m.userId}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-xs text-gray-700 truncate">
                          {m.user.name || m.user.email}
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            name={`manual_${m.userId}`}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className="w-20 rounded-md border px-2 py-1 text-xs text-right"
                          />
                          <span className="text-[11px] text-gray-500">
                            {group.defaultCurr}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs text-gray-600">
                  Note (optional)
                </label>
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

          {/* Group expenses list */}
          <div className="rounded-md border bg-white">
            <div className="border-b px-3 py-2 text-sm font-medium">
              Group expenses
            </div>
            {expenses.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-600">
                No group expenses yet. Add one above to get started.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {expenses.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {e.date.toISOString().slice(0, 10)}
                        </span>
                        <span className="font-medium">{e.title}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Paid by {e.user.name || e.user.email}
                      </div>
                    </div>

                    <div className="ml-3 flex items-center gap-2">
                      {/* Amount */}
                      <div className="text-right text-sm font-semibold">
                        <div>
                          {e.amount.toString()} {e.currency}
                        </div>
                        <div className="mt-0.5 text-[10px] text-gray-500">
                          ≈{" "}
                          {Number(
                            (e.amountInBase ?? e.amount).toString()
                          ).toFixed(2)}{" "}
                          {group.defaultCurr}
                        </div>
                      </div>

                      {/* Edit link */}
                      {/* <Link
                        href={`/${locale}/expenses/edit?id=${e.id}&groupId=${group.id}`}
                        className="rounded-md p-1 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        aria-label="Edit expense"
                      >
                        ✎
                      </Link> */}

                      {/* Delete button */}
                      <form
                        action={deleteGroupExpense.bind(null, locale, group.id)}
                        className="ml-1"
                      >
                        <input type="hidden" name="expenseId" value={e.id} />
                        <button
                          type="submit"
                          className="rounded-md p-1 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50"
                          aria-label="Delete expense"
                        >
                          ✕
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Right: balances & members */}
        <section className="space-y-4">
          {/* Balances card */}
          <div className="rounded-md border bg-white p-4">
            <h2 className="text-sm font-medium text-gray-800 mb-2">Balances</h2>

            {expenses.length === 0 ? (
              <p className="text-xs text-gray-500">
                No expenses yet. Once you add some group expenses, we&apos;ll
                show how much each person is up or down.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="mb-2 text-gray-500">
                  Total spent:{" "}
                  <span className="font-semibold">
                    {totalGroupAmount.toFixed(2)} {group.defaultCurr}
                  </span>
                  <br />
                  Fair share per person ({memberCount}):{" "}
                  <span className="font-semibold">
                    {fairSharePerPerson.toFixed(2)} {group.defaultCurr}
                  </span>
                </div>

                <ul className="space-y-1">
                  {balances.map((b) => {
                    const net = b.net
                    const abs = Math.abs(net)

                    if (abs < 0.005) {
                      // ~0, consider settled
                      return (
                        <li
                          key={b.userId}
                          className="flex items-center justify-between text-gray-600"
                        >
                          <span>{b.nameOrEmail}</span>
                          <span className="text-[11px] italic">Settled</span>
                        </li>
                      )
                    }

                    if (net > 0) {
                      // should receive money
                      return (
                        <li
                          key={b.userId}
                          className="flex items-center justify-between text-emerald-700"
                        >
                          <span>{b.nameOrEmail}</span>
                          <span className="text-[11px] font-medium">
                            should receive {abs.toFixed(2)} {group.defaultCurr}
                          </span>
                        </li>
                      )
                    }

                    // net < 0 → owes
                    return (
                      <li
                        key={b.userId}
                        className="flex items-center justify-between text-rose-700"
                      >
                        <span>{b.nameOrEmail}</span>
                        <span className="text-[11px] font-medium">
                          owes {abs.toFixed(2)} {group.defaultCurr}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Members card */}
          <div className="rounded-md border bg-white p-4">
            <h2 className="text-sm font-medium text-gray-800 mb-2">Members</h2>
            <ul className="space-y-1 text-sm">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between">
                  <span>{m.user.name || m.user.email}</span>
                  <span className="text-xs uppercase text-gray-500">
                    {m.role.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>

            {isAdmin && (
              <form
                action={handleAddMember}
                className="mt-3 flex flex-col gap-2 text-xs sm:flex-row sm:items-center"
              >
                <div className="flex-1">
                  <label className="block text-[11px] text-gray-500 mb-1">
                    Add member by email
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="friend@example.com"
                    className="w-full rounded-md border px-3 py-1.5 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-1 inline-flex items-center justify-center rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white sm:mt-5 sm:self-end"
                >
                  Add
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
