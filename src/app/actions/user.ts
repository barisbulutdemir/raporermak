"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"

export async function updateUserProfile(formData: FormData) {
    const session = await auth()
    if (!session?.user?.name) {
        return { success: false, message: "Oturum bulunamadı" }
    }

    const name = formData.get("name") as string

    if (!name || name.trim().length === 0) {
        return { success: false, message: "Ad soyad boş olamaz" }
    }

    try {
        await prisma.user.update({
            where: { username: session.user.name },
            data: { name: name.trim() }
        })

        revalidatePath("/settings")
        revalidatePath("/dashboard")
        return { success: true, message: "Profil güncellendi" }
    } catch (error) {
        console.error("Profile update error:", error)
        return { success: false, message: "Güncelleme sırasında hata oluştu" }
    }
}

export async function updateSignature(signatureData: string | null) {
    const session = await auth()
    if (!session?.user?.name) {
        return { success: false, message: "Oturum bulunamadı" }
    }

    try {
        await prisma.user.update({
            where: { username: session.user.name },
            data: { signature: signatureData }
        })

        revalidatePath("/settings")
        revalidatePath("/reports/new")
        return { success: true, message: "İmza güncellendi" }
    } catch (error) {
        console.error("Signature update error:", error)
        return { success: false, message: "İmza güncellenirken hata oluştu" }
    }
}

export async function updatePassword(formData: FormData) {
    const session = await auth()
    if (!session?.user?.name) {
        return { success: false, message: "Oturum bulunamadı" }
    }

    const currentPassword = formData.get("currentPassword") as string
    const newPassword = formData.get("newPassword") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (!currentPassword || !newPassword || !confirmPassword) {
        return { success: false, message: "Tüm alanları doldurun" }
    }

    if (newPassword.length < 8) {
        return { success: false, message: "Yeni şifre en az 8 karakter olmalı" }
    }

    if (newPassword !== confirmPassword) {
        return { success: false, message: "Yeni şifreler eşleşmiyor" }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { username: session.user.name }
        })

        if (!user || !user.password) {
            return { success: false, message: "Kullanıcı bulunamadı" }
        }

        const isValidPassword = await bcrypt.compare(currentPassword, user.password)
        if (!isValidPassword) {
            return { success: false, message: "Mevcut şifre yanlış" }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await prisma.user.update({
            where: { username: session.user.name },
            data: { password: hashedPassword }
        })

        revalidatePath("/settings")
        return { success: true, message: "Şifre başarıyla değiştirildi" }
    } catch (error) {
        console.error("Password update error:", error)
        return { success: false, message: "Şifre değiştirme sırasında hata oluştu" }
    }
}
