import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { ReportList } from "@/components/custom/ReportList"

export default async function ReportsPage() {
    const session = await auth()
    if (!session?.user?.name) return null

    const reports = await prisma.serviceReport.findMany({
        where: {
            user: { username: session.user.name }
        },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
    })

    return (
        <ReportList reports={reports as any} />
    )
}
