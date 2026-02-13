import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { SignatureUpload } from "@/components/custom/SignatureUpload"
import { Separator } from "@/components/ui/separator"
import { updateSignature } from "@/app/actions/user"

export default async function ProfilePage() {
    const session = await auth()

    if (!session?.user?.username) {
        return <div>Kullanıcı bulunamadı.</div>
    }

    const user = await prisma.user.findUnique({
        where: { username: session.user.username },
        select: {
            id: true,
            name: true,
            username: true,
            role: true,
            signature: true
        }
    })

    if (!user) {
        return <div>Kullanıcı verisi yüklenemedi.</div>
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Profilim</h3>
                <p className="text-sm text-muted-foreground">
                    Hesap bilgilerinizi ve imzanızı buradan yönetebilirsiniz.
                </p>
            </div>
            <Separator />

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Ad Soyad</label>
                        <div className="p-3 border rounded-md bg-muted text-sm">{user.name}</div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Kullanıcı Adı</label>
                        <div className="p-3 border rounded-md bg-muted text-sm">{user.username}</div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Rol</label>
                        <div className="p-3 border rounded-md bg-muted text-sm">{user.role}</div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">İmza</label>
                        <SignatureUpload
                            currentSignature={user.signature}
                            onSignatureUpdate={updateSignature}
                        />
                        <p className="text-xs text-muted-foreground">
                            Servis raporlarında kullanılacak imzanızı buradan yükleyebilir veya çizebilirsiniz.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
