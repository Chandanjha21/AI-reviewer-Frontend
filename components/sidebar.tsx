'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BookOpen, ChevronLeft, ChevronRight, LayoutDashboard, ListTodo, LogOut, Settings, Users } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { label: 'Work Queue', href: '/queue', icon: ListTodo, roles: ['admin', 'reviewer'] },
  { label: 'Leads', href: '/leads', icon: Users, roles: ['admin', 'reviewer'] },
  { label: 'Users & Roles', href: '/users', icon: Settings, roles: ['admin'] },
  { label: 'Audit Logs', href: '/audit', icon: BookOpen, roles: ['admin', 'reviewer']},
  // { label: 'Settings', href: '/settings', icon: Cog, roles: ['admin'] },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { signOut, user } = useAuth()
  const visibleNavItems = navItems.filter((item) => {
    if (!user) return false
    return item.roles?.includes(user.role)
  })

  const handleLogout = () => {
    signOut()
    router.replace('/login')
  }

  return (
    <div className={cn(
      'flex flex-col border-r border-border transition-all duration-200',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center text-white text-sm font-semibold">
              AI
            </div>
            <span className="font-semibold text-sm">Workbench</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-secondary rounded-md transition-colors"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-secondary'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border space-y-1">
        <button
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Log out' : undefined}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>

        <div className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground',
          collapsed && 'justify-center'
        )}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/50 to-accent/50 flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {getInitials(user?.name)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.name || 'Signed out'}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{user?.role || 'No role'}</p>
            </div>
          )}
        </div>
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
