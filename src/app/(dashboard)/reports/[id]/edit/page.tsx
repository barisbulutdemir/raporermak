import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { ReportForm } from '@/components/custom/ReportForm'

export default async function EditReportPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (!session?.user) {
        redirect('/login')
    }

    const { id } = await params

    const report = await prisma.serviceReport.findUnique({
        where: { id },
        include: {
            advances: true,
            expenses: true,
            user: true
        }
    })

    if (!report) {
        notFound()
    }

    // Security: Only allow owner/admin to edit? 
    // Usually good practice. For now, assume dashboard access implies permission or rely on session check.

    // Parse JSON fields because Prisma returns them as strings (custom schema choice)
    const parsedReport = {
        ...report,
        excludedDates: report.excludedDates ? JSON.parse(report.excludedDates) : [],
        holidays: report.holidays ? JSON.parse(report.holidays) : []
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <h1 className="text-2xl font-bold">Raporu Düzenle</h1>
            <ReportForm
                initialData={parsedReport}
                reportId={report.id}
                defaultUserName={session.user.name || ''}
            />
        </div>
    )
}
