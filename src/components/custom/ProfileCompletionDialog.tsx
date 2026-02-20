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

interface ProfileCompletionDialogProps {
    hasSignature: boolean
    hasSalary: boolean
}

export function ProfileCompletionDialog({ hasSignature, hasSalary }: ProfileCompletionDialogProps) {
    const [open, setOpen] = useState(false)
    const router = useRouter()

    useEffect(() => {
        if (!hasSignature || !hasSalary) {
            setOpen(true)
        }
    }, [hasSignature, hasSalary])

    const handleConfirm = () => {
        setOpen(false)
        router.push('/dashboard/profile')
    }

    const getMissingFields = () => {
        const missing = []
        if (!hasSignature) missing.push("imza")
        if (!hasSalary) missing.push("maaş bilgisi")
        return missing.join(" ve ")
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Profil Bilgileri Eksik</AlertDialogTitle>
                    <AlertDialogDescription>
                        Rapor oluşturabilmek için profilinizde {getMissingFields()} tanımlamanız gerekmektedir.
                        Lütfen profil sayfasına giderek eksik bilgileri tamamlayın.
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
