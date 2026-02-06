import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { SettingsContent } from "@/components/custom/SettingsContent"

export default async function SettingsPage() {
    const session = await auth()
    if (!session?.user?.name) {
        redirect("/login")
    }

    const user = await prisma.user.findUnique({
        where: { username: session.user.name }
    })

    if (!user) {
        redirect("/login")
    }

    return <SettingsContent user={user} />
}
