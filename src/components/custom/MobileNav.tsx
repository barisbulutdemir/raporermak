'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
    LayoutDashboard,
    FilePlus,
    Settings,
    Menu,
    X,
    User as UserIcon
} from 'lucide-react'

interface MobileNavProps {
    userName: string
}

export function MobileNav({ userName }: MobileNavProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b bg-background px-4 h-[60px]">
                <span className="font-bold text-lg">ERMAK Rapor</span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label="Menu"
                >
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
            </div>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-black/50"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Mobile Menu */}
            <div
                className={`md:hidden fixed top-[60px] right-0 bottom-0 z-40 w-64 bg-background border-l transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <nav className="flex flex-col gap-2 p-4">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-4 px-4 py-3 text-muted-foreground hover:text-foreground rounded-md transition-colors hover:bg-muted"
                        onClick={() => setIsOpen(false)}
                    >
                        <LayoutDashboard className="h-5 w-5" />
                        <span>Panel</span>
                    </Link>
                    <Link
                        href="/reports/new"
                        className="flex items-center gap-4 px-4 py-3 text-muted-foreground hover:text-foreground rounded-md transition-colors hover:bg-muted"
                        onClick={() => setIsOpen(false)}
                    >
                        <FilePlus className="h-5 w-5" />
                        <span>Yeni Rapor</span>
                    </Link>
                    <Link
                        href="/settings"
                        className="flex items-center gap-4 px-4 py-3 text-muted-foreground hover:text-foreground rounded-md transition-colors hover:bg-muted"
                        onClick={() => setIsOpen(false)}
                    >
                        <Settings className="h-5 w-5" />
                        <span>Ayarlar</span>
                    </Link>
                </nav>

                <div className="absolute bottom-0 left-0 right-0 border-t p-4 space-y-2">
                    <div className="flex items-center gap-3 px-4">
                        <UserIcon className="h-5 w-5" />
                        <span className="text-sm font-medium">{userName}</span>
                    </div>
                </div>
            </div>
        </>
    )
}
