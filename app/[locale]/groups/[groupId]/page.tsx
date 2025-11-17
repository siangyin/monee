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
import GroupExpenseForm from "@/components/groups/GroupExpenseForm"

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

  // Load group expenses (with shares for balances)
  const expenses = await prisma.expense.findMany({
    where: { groupId: group.id },
    include: { user: true, shares: true },
    orderBy: { date: "desc" },
  })

  // Load last saved FX rates that end in this group's currency
  const fxRates = await prisma.fxRate.findMany({
    where: { quote: group.defaultCurr },
    orderBy: { asOfDate: "desc" },
    take: 50,
  })

  // Build a "latest by base currency" map (e.g. { JPY: {rate, asOfDate}, ... })
  const latestRateByBase: Record<string, { rate: number; asOfDate: Date }> = {}

  for (const r of fxRates) {
    if (!latestRateByBase[r.base]) {
      latestRateByBase[r.base] = {
        rate: Number(r.rate),
        asOfDate: r.asOfDate,
      }
    }
  }

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

  // Build a small human string of saved rates, excluding the default currency
  const savedRatesSummary = Object.entries(latestRateByBase)
    .filter(([base]) => base !== group.defaultCurr)
    .map(([base, info]) => {
      const rateStr = info.rate.toFixed(4)
      return `${base}→${group.defaultCurr} ≈ ${rateStr}`
    })
    .join(" · ")

  return (
    <main className="space-y-6">
      {/* Header / breadcrumb + editable name */}
      <div className="flex items-center justify-between gap-3">
        <div className="w-full max-w-xl">
          <div className="mb-1 text-xs text-gray-500">
            <Link href={`/${locale}/groups`} className="hover:underline">
              Groups
            </Link>{" "}
            / <span>{group.name}</span>
          </div>

          {isAdmin ? (
            <form
              action={handleUpdateName}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <input
                type="text"
                name="name"
                defaultValue={group.name}
                className="flex-1 rounded-md border px-3 py-2 text-lg font-semibold md:text-2xl"
              />
              <button
                type="submit"
                className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
              >
                Save
              </button>
            </form>
          ) : (
            <h1 className="text-2xl font-semibold md:text-3xl">{group.name}</h1>
          )}

          <p className="mt-1 text-xs text-gray-500">
            Default currency:{" "}
            <span className="font-medium">{group.defaultCurr}</span>
          </p>
        </div>
      </div>

      {/* Layout: left = expenses & form; right = balances & members */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        {/* Left: add expense + expenses list */}
        <section className="space-y-4">
          {/* Reusable group expense form */}
          <GroupExpenseForm
            groupDefaultCurr={group.defaultCurr}
            today={today}
            categories={categories}
            members={members}
            savedRatesSummary={savedRatesSummary}
            action={handleCreateExpense}
          />

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

                      {/* Delete button */}
                      <form
                        action={deleteGroupExpense.bind(null, locale, group.id)}
                        className="ml-1"
                      >
                        <input type="hidden" name="expenseId" value={e.id} />
                        <button
                          type="submit"
                          className="rounded-md p-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-600"
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
            <h2 className="mb-2 text-sm font-medium text-gray-800">Balances</h2>

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
            <h2 className="mb-2 text-sm font-medium text-gray-800">Members</h2>
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
                  <label className="mb-1 block text-[11px] text-gray-500">
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
