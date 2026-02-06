import { auth, signOut } from "@/auth"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    LayoutDashboard,
    FilePlus,
    LogOut,
    User as UserIcon,
    Settings
} from "lucide-react"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    if (!session?.user) {
        redirect("/login")
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex sm:w-64 transition-all">
                <div className="flex items-center gap-2 border-b px-4 py-4 h-[60px]">
                    <span className="font-bold text-lg hidden sm:inline-block">ERMAK Rapor</span>
                    <span className="font-bold text-lg sm:hidden">ER</span>
                </div>
                <nav className="flex flex-col gap-4 px-2 sm:py-5">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground sm:h-auto h-9 w-9 sm:w-auto justify-center sm:justify-start rounded-md transition-colors hover:bg-muted"
                    >
                        <LayoutDashboard className="h-5 w-5" />
                        <span className="hidden sm:inline">Panel</span>
                    </Link>
                    <Link
                        href="/reports/new"
                        className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground sm:h-auto h-9 w-9 sm:w-auto justify-center sm:justify-start rounded-md transition-colors hover:bg-muted"
                    >
                        <FilePlus className="h-5 w-5" />
                        <span className="hidden sm:inline">Yeni Rapor</span>
                    </Link>
                    <Link
                        href="/settings"
                        className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground sm:h-auto h-9 w-9 sm:w-auto justify-center sm:justify-start rounded-md transition-colors hover:bg-muted"
                    >
                        <Settings className="h-5 w-5" />
                        <span className="hidden sm:inline">Ayarlar</span>
                    </Link>
                </nav>
                <div className="mt-auto flex flex-col items-center sm:items-start gap-4 px-2 py-5">
                    <div className="flex items-center gap-4 px-2.5">
                        <UserIcon className="h-5 w-5" />
                        <span className="hidden sm:inline text-sm font-medium">{session.user.name}</span>
                    </div>
                    <form
                        action={async () => {
                            "use server"
                            await signOut()
                        }}
                        className="w-full"
                    >
                        <Button variant="ghost" className="w-full justify-start gap-4 px-2.5 text-red-500 hover:text-red-600 hover:bg-red-50">
                            <LogOut className="h-5 w-5" />
                            <span className="hidden sm:inline">Çıkış Yap</span>
                        </Button>
                    </form>
                </div>
            </aside>
            <div className="flex flex-col sm:gap-4 sm:pl-64 sm:py-4">
                <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
