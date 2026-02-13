'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface SignatureCheckDialogProps {
    hasSignature: boolean
}

export function SignatureCheckDialog({ hasSignature }: SignatureCheckDialogProps) {
    const [open, setOpen] = useState(false)
    const router = useRouter()

    useEffect(() => {
        if (!hasSignature) {
            setOpen(true)
        }
    }, [hasSignature])

    const handleConfirm = () => {
        setOpen(false)
        router.push('/dashboard/profile')
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>İmza Eksik</AlertDialogTitle>
                    <AlertDialogDescription>
                        Rapor oluşturabilmek için önce profilinizde bir imza tanımlamanız gerekmektedir.
                        Lütfen profil sayfasına giderek imzanızı çizin veya yükleyin.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={handleConfirm}>
                        Profile Git
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
