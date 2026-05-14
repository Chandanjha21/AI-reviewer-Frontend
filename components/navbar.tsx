'use client'

import { Bell, LogOut, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/components/auth/auth-provider'

export function Navbar() {
  const router = useRouter()
  const { signOut, user } = useAuth()

  function handleLogout() {
    signOut()
    router.replace('/login')
  }

  return (
    <div className="flex items-center justify-between h-16 px-6 border-b border-border bg-card">
      {/* Left: Search Bar */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search leads, emails..."
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-secondary text-sm border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4 ml-6">
        {/* Notifications */}
        <button className="relative p-2 hover:bg-secondary rounded-lg transition-colors">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
        </button>

        {/* Profile Menu */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/40">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold text-white">
            {getInitials(user?.name)}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium leading-none">{user?.name || 'Signed out'}</p>
            <p className="mt-1 text-[11px] capitalize leading-none text-muted-foreground">{user?.role || 'No role'}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </div>
  )
}

function getInitials(name?: string) {
  if (!name) return '--'

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
