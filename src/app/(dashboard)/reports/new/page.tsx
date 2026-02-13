import { SignatureCheckDialog } from "@/components/custom/SignatureCheckDialog"

// ... inside default function ...

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
