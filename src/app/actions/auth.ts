'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData, { redirectTo: '/dashboard' })
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Hatalı kullanıcı adı veya şifre.'
                default:
                    return `Bir sorun oluştu: ${error.type}`
            }
        }
        throw error
    }
}

import { redirect } from 'next/navigation'

export async function logout() {
    await signOut({ redirect: false })
    redirect("/login")
}
