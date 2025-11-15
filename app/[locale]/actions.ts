"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createSampleData(locale: string) {
  // upsert a demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@monee.local" },
    update: {},
    create: { email: "demo@monee.local", name: "Demo User" },
  })

  // create a simple group if not exists
  const name = "Demo Group"
  const slug = "demo-" + Math.random().toString(36).slice(2, 7)

  await prisma.group.create({
    data: {
      name,
      slug,
      createdById: user.id,
      members: {
        create: [{ userId: user.id, role: "ADMIN" }],
      },
    },
  })

  // refresh the current locale page so new data shows up
  revalidatePath(`/${locale}`)
}
