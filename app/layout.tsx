import type React from "react"
import type { Metadata } from "next"
import { Bricolage_Grotesque } from "next/font/google"
import "./globals.css"
import { TasksProvider } from "@/contexts/tasks-context"

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
})

export const metadata: Metadata = {
  title: "Motorminds",
  description: "Mechanic Task Management System",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={bricolage.variable}>
      <body className="font-sans bg-[#151515] text-white">
        <TasksProvider>{children}</TasksProvider>
      </body>
    </html>
  )
}



import './globals.css'