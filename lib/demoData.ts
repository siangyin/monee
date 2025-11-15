// lib/demoData.ts
import { prisma } from "@/lib/prisma"

const DEMO_EMAIL = "demo@monee.local"

export async function getDemoUserWithCategories() {
  // Ensure demo user exists
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Demo User",
    },
  })

  // Fetch active categories
  let categories = await prisma.category.findMany({
    where: {
      userId: user.id,
      isActive: true,
    },
    orderBy: { name: "asc" },
  })

  // If none, seed some defaults
  if (categories.length === 0) {
    const defaults = [
      { name: "Food & Drinks", color: "#fee2e2" },       // light red
      { name: "Transport", color: "#dbeafe" },           // light blue
      { name: "Home & Utilities", color: "#fef3c7" },       // light amber
      { name: "Personal", color: "#fef9c3" },
      { name: "Shopping", color: "#fef9c3" },
      { name: "Health", color: "#fef9c3" },
      { name: "Travel", color: "#fef9c3" },
      { name: "Bills & Utilities", color: "#e5e7eb" },   // gray
      { name: "Entertainment", color: "#ede9fe" },       // lilac
      { name: "Others", color: "#dcfce7" },              // green
    ]

    categories = await prisma.$transaction(
      defaults.map((c) =>
        prisma.category.create({
          data: {
            userId: user.id,
            name: c.name,
            color: c.color,
          },
        })
      )
    )
  }

  return { user, categories }
}
