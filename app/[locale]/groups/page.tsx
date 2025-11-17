// app/[locale]/groups/page.tsx
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { type Locale } from "@/i18n"
import { getAuthUserWithCategories } from "@/lib/authUser"
import { createGroup } from "@/app/actions/groups"

type PageProps = {
  params: Promise<{ locale: Locale }>
}

export default async function GroupsPage({ params }: PageProps) {
  const { locale } = await params

  // Ensure user exists and is signed in
  const { user } = await getAuthUserWithCategories()

  // Fetch groups where this user is a member
  const memberships = await prisma.groupMember.findMany({
    where: {
      userId: user.id,
    },
    include: {
      group: true,
    },
    orderBy: {
      group: {
        createdAt: "desc",
      },
    },
  })

  const handleCreateGroup = createGroup.bind(null, locale)

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Groups</h1>
          <p className="text-sm text-gray-600">Shared expenses with friends.</p>
        </div>
      </div>

      {/* Create group form */}
      <section className="rounded-md border bg-white p-4 space-y-3">
        <h2 className="text-sm font-medium">Create a new group</h2>

        <form
          action={handleCreateGroup}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <input
            type="text"
            name="name"
            required
            placeholder="Group name"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white mt-2 sm:mt-0"
          >
            Create
          </button>
        </form>
      </section>

      {/* List of groups */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-800">Your groups</h2>

        {memberships.length === 0 ? (
          <p className="text-sm text-gray-600">
            You&apos;re not in any groups yet. Create one above to start
            splitting expenses.
          </p>
        ) : (
          <ul className="divide-y rounded-md border bg-white">
            {memberships.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <Link
                    href={`/${locale}/groups/${m.group.id}`}
                    className="font-medium hover:underline"
                  >
                    {m.group.name}
                  </Link>
                  <div className="mt-0.5 text-xs text-gray-500">
                    Role: {m.role.toLowerCase()} • Currency:{" "}
                    {m.group.defaultCurr}
                  </div>
                </div>

                <div className="text-xs text-gray-400">
                  {/* Placeholder for future balances / stats */}
                  {m.group.slug}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
