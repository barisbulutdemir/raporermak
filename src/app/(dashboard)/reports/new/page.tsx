import { ReportForm } from "@/components/custom/ReportForm"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ProfileCompletionDialog } from "@/components/custom/ProfileCompletionDialog"
import { getExchangeRates } from "@/app/actions/exchangeRates"

export default async function NewReportPage() {
    const session = await auth()

    // Fetch user's name, signature, and salary
    const user = await prisma.user.findUnique({
        where: { username: session?.user?.name || '' },
        select: {
            name: true,
            signature: true,
            monthlySalary: true
        }
    })

    // Fetch today's exchange rates for the fee card
    const exchangeRates = await getExchangeRates(new Date()).catch(() => null)

    return (
        <div className="mx-auto grid w-full max-w-[900px] gap-6">
            <ProfileCompletionDialog hasSignature={!!user?.signature} hasSalary={!!user?.monthlySalary} />
            <div className="flex items-center gap-4">
                <h1 className="text-2xl font-semibold">Yeni Servis Raporu Oluştur</h1>
            </div>
            <ReportForm
                defaultUserName={user?.name || ''}
                defaultSignature={user?.signature || undefined}
                monthlySalary={user?.monthlySalary}
                exchangeRates={exchangeRates}
            />
        </div>
    )
}
