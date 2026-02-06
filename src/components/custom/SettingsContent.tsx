'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SignatureUpload } from "@/components/custom/SignatureUpload"
import { updateUserProfile, updateSignature, updatePassword } from "@/app/actions/user"
import { User, Lock, FileSignature } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function SettingsContent({ user }: { user: { username: string, name: string | null, signature: string | null } }) {
    const router = useRouter()

    const handleProfileSubmit = async (formData: FormData) => {
        const result = await updateUserProfile(formData)
        if (result.success) {
            toast.success(result.message)
            router.refresh()
        } else {
            toast.error(result.message)
        }
    }

    const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const result = await updatePassword(formData)

        if (result.success) {
            toast.success(result.message)
            e.currentTarget.reset()
        } else {
            toast.error(result.message)
        }
    }

    const handleSignatureUpdate = async (signature: string | null) => {
        const result = await updateSignature(signature)
        if (result.success) {
            toast.success(result.message)
            router.refresh()
        } else {
            toast.error(result.message)
            throw new Error(result.message)
        }
    }

    return (
        <div className="grid gap-6 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold">Ayarlar</h1>
                <p className="text-muted-foreground">Profil ve güvenlik ayarlarınızı yönetin</p>
            </div>

            {/* Profile Settings */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        <CardTitle>Profil Bilgileri</CardTitle>
                    </div>
                    <CardDescription>Adınızı ve kişisel bilgilerinizi güncelleyin</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleProfileSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Ad Soyad</Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={user.name || ""}
                                placeholder="Adınız Soyadınız"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="username">Kullanıcı Adı</Label>
                            <Input
                                id="username"
                                value={user.username}
                                disabled
                                className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">Kullanıcı adı değiştirilemez</p>
                        </div>
                        <Button type="submit">Profili Güncelle</Button>
                    </form>
                </CardContent>
            </Card>

            {/* Signature Settings */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <FileSignature className="h-5 w-5" />
                        <CardTitle>İmza</CardTitle>
                    </div>
                    <CardDescription>Raporlarda kullanılacak imzanızı yükleyin</CardDescription>
                </CardHeader>
                <CardContent>
                    <SignatureUpload
                        currentSignature={user.signature}
                        onSignatureUpdate={handleSignatureUpdate}
                    />
                </CardContent>
            </Card>

            {/* Password Settings */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        <CardTitle>Şifre Değiştir</CardTitle>
                    </div>
                    <CardDescription>Hesap güvenliğiniz için güçlü bir şifre kullanın</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">Mevcut Şifre</Label>
                            <Input
                                id="currentPassword"
                                name="currentPassword"
                                type="password"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">Yeni Şifre</Label>
                            <Input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                minLength={8}
                                required
                            />
                            <p className="text-xs text-muted-foreground">En az 8 karakter</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                minLength={8}
                                required
                            />
                        </div>
                        <Button type="submit">Şifreyi Değiştir</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
