'use client'

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { X, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import SignatureCanvas from "react-signature-canvas"

export function SignatureUpload({
    currentSignature,
    onSignatureUpdate
}: {
    currentSignature?: string | null
    onSignatureUpdate: (signature: string | null) => Promise<any>
}) {
    const [signature, setSignature] = useState<string | null>(currentSignature || null)
    const [uploading, setUploading] = useState(false)
    const sigCanvas = useRef<SignatureCanvas>(null)

    const handleClear = () => {
        sigCanvas.current?.clear()
    }

    const handleSave = async () => {
        if (sigCanvas.current?.isEmpty()) {
            toast.error("Lütfen önce imzanızı çizin")
            return
        }

        const signatureData = sigCanvas.current?.toDataURL('image/png')
        if (!signatureData) return

        setUploading(true)
        try {
            const result = await onSignatureUpdate(signatureData)
            if (result && !result.success) {
                toast.error(result.error || "İmza kaydedilirken hata oluştu")
                return
            }
            setSignature(signatureData)
            toast.success("İmza kaydedildi")
        } catch (error) {
            toast.error("İmza kaydedilirken hata oluştu")
        } finally {
            setUploading(false)
        }
    }

    const handleRemove = async () => {
        setUploading(true)
        try {
            const result = await onSignatureUpdate(null)
            if (result && !result.success) {
                toast.error(result.error || "İmza silinirken hata oluştu")
                return
            }
            setSignature(null)
            sigCanvas.current?.clear()
            toast.success("İmza silindi")
        } catch (error) {
            toast.error("İmza silinirken hata oluştu")
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="space-y-4">
            <Label>İmza</Label>

            {signature ? (
                <div className="space-y-2">
                    <div className="relative border rounded-lg p-4 bg-muted/20 flex items-center justify-center h-32">
                        <img
                            src={signature}
                            alt="İmza"
                            className="max-h-24 max-w-full object-contain"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setSignature(null)
                                sigCanvas.current?.clear()
                            }}
                            className="flex-1"
                        >
                            Yeniden Çiz
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={handleRemove}
                            disabled={uploading}
                            className="flex-1"
                        >
                            <X className="mr-2 h-4 w-4" />
                            Sil
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="border-2 rounded-lg bg-white">
                        <SignatureCanvas
                            ref={sigCanvas}
                            canvasProps={{
                                className: 'w-full h-40 rounded-lg',
                                style: { touchAction: 'none' }
                            }}
                            backgroundColor="white"
                            penColor="black"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleClear}
                            className="flex-1"
                        >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Temizle
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={uploading}
                            className="flex-1"
                        >
                            İmzayı Kaydet
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                        Yukarıdaki alana imzanızı çizin
                    </p>
                </div>
            )}
        </div>
    )
}
