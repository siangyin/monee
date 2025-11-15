// app/[locale]/page.tsx
// "use client"

import { prisma } from "@/lib/prisma"
import SampleControls from "@/components/SampleControls"
import { type Locale } from "@/i18n"

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params

  // fetch a few groups to show (newest first)
  const groups = await prisma.group.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      members: {
        include: { user: true },
      },
    },
  })

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-semibold">Welcome to monee</h1>
        <SampleControls locale={locale} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recent groups</h2>
        {groups.length === 0 ? (
          <p className="text-sm text-gray-600">
            No groups yet. Click <strong>Create sample data</strong> to seed
            one.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {groups.map((g) => (
              <li key={g.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{g.name}</div>
                    <div className="text-xs text-gray-600">slug: {g.slug}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {g.members.length} member{g.members.length === 1 ? "" : "s"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
