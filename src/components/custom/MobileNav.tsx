'use client'

import Link from 'next/link'
import {
    LayoutDashboard,
    FilePlus,
    Settings
} from 'lucide-react'

interface MobileNavProps {
    userName: string
}

export function MobileNav({ userName }: MobileNavProps) {
    return (
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 border-b bg-background h-[60px]">
            <nav className="flex items-center justify-center gap-8 h-full px-4">
                <Link
                    href="/dashboard"
                    className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <LayoutDashboard className="h-6 w-6" />
                    <span className="text-xs">Panel</span>
                </Link>
                <Link
                    href="/reports/new"
                    className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <FilePlus className="h-6 w-6" />
                    <span className="text-xs">Yeni Rapor</span>
                </Link>
                <Link
                    href="/settings"
                    className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <Settings className="h-6 w-6" />
                    <span className="text-xs">Ayarlar</span>
                </Link>
            </nav>
        </div>
    )
}
