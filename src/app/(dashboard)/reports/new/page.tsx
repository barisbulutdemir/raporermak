import { ReportForm } from "@/components/custom/ReportForm"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { SignatureCheckDialog } from "@/components/custom/SignatureCheckDialog"

export default async function NewReportPage() {
    const session = await auth()

    // Fetch user's name and saved signature
    const user = await prisma.user.findUnique({
        where: { username: session?.user?.name || '' },
        select: {
            name: true,
            signature: true
        }
    })

    return (
        <div className="mx-auto grid w-full max-w-[900px] gap-6">
            <SignatureCheckDialog hasSignature={!!user?.signature} />
            <div className="flex items-center gap-4">
                <h1 className="text-2xl font-semibold">Yeni Servis Raporu Oluştur</h1>
            </div>
            <ReportForm
                defaultUserName={user?.name || ''}
                defaultSignature={user?.signature || undefined}
            />
        </div>
    )
}
