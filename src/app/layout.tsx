import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Expense App",
  description:
    "Personal + group expenses with budgets and splitwise-style settle up",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
