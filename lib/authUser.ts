// lib/authUser.ts
import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

const DEFAULT_CATEGORIES = [
  { name: "Food & Drinks", color: "#fee2e2" },
  { name: "Transport", color: "#dbeafe" },
  { name: "Accommodation", color: "#fef3c7" },
  { name: "Shopping", color: "#fef9c3" },
  { name: "Bills & Utilities", color: "#e5e7eb" },
  { name: "Entertainment", color: "#ede9fe" },
  { name: "Others", color: "#dcfce7" },
]

export async function getAuthUserWithCategories() {
  const { userId } = await auth()

  // Not signed in → go to Clerk sign-in page
  if (!userId) {
    redirect("/sign-in")
  }

  // Try to find existing Prisma user by clerkId
  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  // If not found, create a new Prisma user from Clerk data
  if (!user) {
    const clerkUser = await currentUser()

    const email =
      clerkUser?.emailAddresses[0]?.emailAddress ??
      clerkUser?.primaryEmailAddress?.emailAddress

    if (!email) {
      throw new Error("Clerk user has no email; cannot create Prisma user.")
    }

    user = await prisma.user.create({
      data: {
        clerkId: userId,
        email,
        name: clerkUser?.username ?? clerkUser?.fullName ?? null,
        imageUrl: clerkUser?.imageUrl ?? null,
      },
    })
  }

  // Ensure this user has categories
  let categories = await prisma.category.findMany({
    where: {
      userId: user.id,
      isActive: true,
    },
    orderBy: { name: "asc" },
  })

  if (categories.length === 0) {
    categories = await prisma.$transaction(
      DEFAULT_CATEGORIES.map((c) =>
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
