import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MainNav } from "@/components/main-nav"
import { SupabaseConnectionTest } from "@/components/supabase-connection-test"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#151515] flex flex-col">
      {/* Top Navigation */}
      <div className="p-4 bg-[#131313]">
        <div className="flex items-center px-6 py-3 bg-[#1a1a1a] rounded-[32px]">
          <div className="flex items-center gap-2 font-semibold text-white">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MOTORMINDS-xT1F9wcHLYqhjkFz1dJwcACLAPUey3.png"
              alt="Motorminds Logo"
              className="h-8 w-8"
            />
            <span>Motorminds</span>
          </div>
          <MainNav />
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white hover:bg-[#2d2d2d] transition-colors duration-200"
            >
              <Bell className="h-5 w-5" />
            </Button>
            <Avatar>
              <AvatarImage src="/placeholder.svg?height=32&width=32" />
              <AvatarFallback>MM</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-6 min-h-0">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white flex items-center gap-2">
            <div className="w-1 h-8 bg-[#b22222]" />
            Dashboard
          </h1>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Welcome to Motorminds</h2>
          <p className="text-gray-300 mb-6">
            This is a simple starting point for your mechanic task management system.
          </p>
          <SupabaseConnectionTest />
        </div>
      </main>
    </div>
  )
}

