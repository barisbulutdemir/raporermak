'use client'

import Link from 'next/link'
import {
    LayoutDashboard,
    FilePlus,
    Settings,
    Users
} from 'lucide-react'
import { ModeToggle } from "@/components/mode-toggle"
import { UserNav } from "@/components/user-nav"

interface MobileNavProps {
    userName: string
    userRole: string
    enableThemeSwitch?: boolean
}

export function MobileNav({ userName, userRole, enableThemeSwitch = true }: MobileNavProps) {
    const isAdmin = userRole === 'ADMIN'

    return (
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 border-b bg-background h-[60px]">
            <nav className="flex items-center justify-center gap-2 h-full px-4">
                <Link
                    href="/dashboard"
                    className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <LayoutDashboard className="h-6 w-6" />
                    <span className="text-xs">Ana Sayfa</span>
                </Link>
                <Link
                    href="/reports/new"
                    className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <FilePlus className="h-6 w-6" />
                    <span className="text-xs">Yeni</span>
                </Link>
                <Link
                    href="/settings"
                    className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <Settings className="h-6 w-6" />
                    <span className="text-xs">Ayarlar</span>
                </Link>
                {isAdmin && (
                    <>
                        <Link
                            href="/admin/users"
                            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Users className="h-6 w-6" />
                            <span className="text-xs">Kullanıcılar</span>
                        </Link>
                        <Link
                            href="/admin/settings"
                            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Settings className="h-6 w-6" />
                            <span className="text-xs">Genel Ayarlar</span>
                        </Link>
                    </>
                )}
                <div className="flex items-center gap-2">
                    {enableThemeSwitch && <ModeToggle />}
                    <UserNav userName={userName} />
                </div>
            </nav>
        </div>
    )
}
