// app/[locale]/page.tsx
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import SampleControls from "@/components/SampleControls"
import { type Locale } from "@/i18n"
import { getAuthUserWithCategories } from "@/lib/authUser"

export default async function HomePage({
  params,
}: {
  params: { locale: Locale }
}) {
  const { locale } = await params

  // Ensure user exists (Clerk + Prisma + default categories)
  const { user } = await getAuthUserWithCategories()

  // --- Fetch data for this user ---

  // Recent personal expenses (no group)
  const recentPersonal = await prisma.expense.findMany({
    where: {
      userId: user.id,
      groupId: null,
    },
    orderBy: { date: "desc" },
    take: 5,
    include: {
      category: true,
    },
  })

  // Groups where this user is a member
  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    include: {
      group: true,
    },
    orderBy: {
      group: {
        createdAt: "desc",
      },
    },
  })

  const groups = memberships.map((m) => m.group)
  const groupIds = groups.map((g) => g.id)

  // Recent group expenses across all groups the user is in
  const recentGroupExpenses =
    groupIds.length === 0
      ? []
      : await prisma.expense.findMany({
          where: {
            groupId: {
              in: groupIds,
            },
          },
          orderBy: { date: "desc" },
          take: 5,
          include: {
            group: true,
            user: true, // payer
          },
        })

  // For "Add group expense" quick action:
  // - If user has groups, go to the newest one
  // - Otherwise, send them to the Groups page
  const primaryGroup = groups[0] ?? null
  const addGroupExpenseHref = primaryGroup
    ? `/${locale}/groups/${primaryGroup.id}`
    : `/${locale}/groups`

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">
            Welcome to monee
          </h1>
          <p className="text-sm text-gray-600">
            Track your own spending and shared group expenses in one place.
          </p>
        </div>
        <SampleControls locale={locale} />
      </div>

      {/* Quick actions */}
      <section className="rounded-md border bg-white p-4 space-y-3">
        <h2 className="text-sm font-medium text-gray-800">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${locale}/expenses/new`}
            className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            + Add personal expense
          </Link>

          <Link
            href={addGroupExpenseHref}
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            + Add group expense
            {primaryGroup && (
              <span className="ml-2 text-xs text-gray-500">
                ({primaryGroup.name})
              </span>
            )}
          </Link>

          <Link
            href={`/${locale}/groups`}
            className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            View all groups
          </Link>
        </div>
      </section>

      {/* Recent personal expenses */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-800">
            Recent personal expenses
          </h2>
          <Link
            href={`/${locale}/expenses`}
            className="text-xs text-blue-600 hover:underline"
          >
            View all
          </Link>
        </div>

        {recentPersonal.length === 0 ? (
          <p className="text-sm text-gray-600">
            No personal expenses yet. Click{" "}
            <strong>+ Add personal expense</strong> to start tracking.
          </p>
        ) : (
          <ul className="divide-y rounded-md border bg-white">
            {recentPersonal.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {e.date.toISOString().slice(0, 10)}
                    </span>
                    <span className="font-medium truncate">{e.title}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {e.category?.name ?? "Uncategorized"}
                  </div>
                </div>
                <div className="text-right text-sm font-semibold">
                  {e.amount.toString()} {e.currency}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent group expenses */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-800">
            Recent group expenses
          </h2>
          <Link
            href={`/${locale}/groups`}
            className="text-xs text-blue-600 hover:underline"
          >
            View groups
          </Link>
        </div>

        {groupIds.length === 0 ? (
          <p className="text-sm text-gray-600">
            You&apos;re not in any groups yet. Create one on the{" "}
            <strong>Groups</strong> page to start splitting.
          </p>
        ) : recentGroupExpenses.length === 0 ? (
          <p className="text-sm text-gray-600">
            No group expenses yet. Open a group and add the first shared
            expense.
          </p>
        ) : (
          <ul className="divide-y rounded-md border bg-white">
            {recentGroupExpenses.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {e.date.toISOString().slice(0, 10)}
                    </span>
                    <span className="font-medium truncate">{e.title}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {e.group?.name ?? "Unknown group"} • Paid by{" "}
                    {e.user?.name || e.user?.email || "Someone"}
                  </div>
                </div>
                <div className="text-right text-sm font-semibold">
                  {e.amount.toString()} {e.currency}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
