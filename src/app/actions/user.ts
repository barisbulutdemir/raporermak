'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import bcrypt from 'bcrypt'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Check if current user is admin
export async function requireAdmin() {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        throw new Error('Unauthorized: Admin access required')
    }
    return session
}

// Approve a pending user
export async function approveUser(userId: string) {
    const session = await requireAdmin()

    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                approved: true,
                approvedBy: session.user.name || 'admin',
                approvedAt: new Date(),
            },
        })

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Error approving user:', error)
        return { success: false, error: 'Failed to approve user' }
    }
}

// Delete a user
export async function deleteUser(userId: string) {
    const session = await requireAdmin()

    if (session.user.id === userId) {
        return { success: false, error: 'Kendi hesabınızı silemezsiniz' }
    }

    try {
        await prisma.user.delete({
            where: { id: userId },
        })

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Error deleting user:', error)
        return { success: false, error: 'Failed to delete user' }
    }
}

// Update user role
export async function updateUserRole(userId: string, role: 'ADMIN' | 'USER') {
    const session = await requireAdmin()

    if (session.user.id === userId) {
        return { success: false, error: 'Kendi rolünüzü değiştiremezsiniz' }
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { role },
        })

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Error updating user role:', error)
        return { success: false, error: 'Failed to update user role' }
    }
}

// Reset user password (admin only)
export async function resetUserPassword(userId: string, newPassword: string) {
    await requireAdmin()

    if (newPassword.length < 4) {
        return { success: false, error: 'Password must be at least 4 characters' }
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        })

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Error resetting password:', error)
        return { success: false, error: 'Failed to reset password' }
    }
}

// Create user (admin only, auto-approved)
export async function createUser(data: {
    username: string
    password: string
    name: string
    role: 'ADMIN' | 'USER'
}) {
    const session = await requireAdmin()

    if (data.password.length < 4) {
        return { success: false, error: 'Password must be at least 4 characters' }
    }

    try {
        const hashedPassword = await bcrypt.hash(data.password, 10)

        const user = await prisma.user.create({
            data: {
                username: data.username,
                password: hashedPassword,
                name: data.name,
                role: data.role,
                approved: true, // Admin-created users are auto-approved
                approvedBy: session.user.name || 'admin',
                approvedAt: new Date(),
            },
        })

        revalidatePath('/admin/users')
        return { success: true, user }
    } catch (error: any) {
        console.error('Error creating user:', error)
        if (error.code === 'P2002') {
            return { success: false, error: 'Username already exists' }
        }
        return { success: false, error: 'Failed to create user' }
    }
}

// Get all users (admin only)
export async function getAllUsers() {
    const session = await requireAdmin()

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                approved: true,
                approvedBy: true,
                approvedAt: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: [
                { approved: 'asc' }, // Pending users first
                { createdAt: 'desc' },
            ],
        })

        return { success: true, users, currentUserId: session.user.id }
    } catch (error) {
        console.error('Error fetching users:', error)
        return { success: false, error: 'Failed to fetch users', users: [] }
    }
}

// Register new user (public, requires approval)
export async function registerUser(data: {
    username: string
    password: string
    name: string
}) {
    if (data.password.length < 4) {
        return { success: false, error: 'Password must be at least 4 characters' }
    }

    if (!data.username || data.username.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters' }
    }

    try {
        const hashedPassword = await bcrypt.hash(data.password, 10)

        await prisma.user.create({
            data: {
                username: data.username,
                password: hashedPassword,
                name: data.name,
                role: 'USER',
                approved: false, // Requires admin approval
            },
        })

        return {
            success: true,
            message: 'Registration successful! Your account is pending admin approval.'
        }
    } catch (error: any) {
        console.error('Error registering user:', error)
        if (error.code === 'P2002') {
            return { success: false, error: 'Username already exists' }
        }
        return { success: false, error: 'Failed to register user' }
    }
}

// Update user profile (name) - self-service
export async function updateUserProfile(formData: FormData) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'Unauthorized' }
    }

    const name = formData.get('name') as string

    if (!name || name.trim().length === 0) {
        return { success: false, error: 'Name is required' }
    }

    try {
        await prisma.user.update({
            where: { username: session.user.username },
            data: { name: name.trim() },
        })

        revalidatePath('/settings')
        return { success: true }
    } catch (error) {
        console.error('Error updating profile:', error)
        return { success: false, error: 'Failed to update profile' }
    }
}

// Update user salary - self-service
export async function updateSalary(salary: number | null) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        await prisma.user.update({
            where: { username: session.user.username },
            data: { monthlySalary: salary },
        })

        revalidatePath('/settings')
        revalidatePath('/dashboard/profile')
        return { success: true }
    } catch (error) {
        console.error('Error updating salary:', error)
        return { success: false, error: 'Failed to update salary' }
    }
}

// Update user signature - self-service
export async function updateSignature(signature: string | null) {

    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        await prisma.user.update({
            where: { username: session.user.username },
            data: { signature },
        })

        revalidatePath('/settings')
        return { success: true }
    } catch (error) {
        console.error('Error updating signature:', error)
        return { success: false, error: 'Failed to update signature' }
    }
}

// Update user password - self-service
export async function updatePassword(formData: FormData) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'Unauthorized' }
    }

    const currentPassword = formData.get('currentPassword') as string
    const newPassword = formData.get('newPassword') as string

    if (!currentPassword || !newPassword) {
        return { success: false, error: 'All fields are required' }
    }

    if (newPassword.length < 4) {
        return { success: false, error: 'New password must be at least 4 characters' }
    }

    try {
        // Get current user with password
        const user = await prisma.user.findUnique({
            where: { username: session.user.username },
        })

        if (!user) {
            return { success: false, error: 'User not found' }
        }

        // Verify current password
        const passwordsMatch = await bcrypt.compare(currentPassword, user.password)
        if (!passwordsMatch) {
            return { success: false, error: 'Current password is incorrect' }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // Update password
        await prisma.user.update({
            where: { username: session.user.username },
            data: { password: hashedPassword },
        })

        revalidatePath('/settings')
        return { success: true }
    } catch (error) {
        console.error('Error updating password:', error)
        return { success: false, error: 'Failed to update password' }
    }
}

// Update user details (admin only)
export async function updateUserDetails(userId: string, data: { username: string; name: string }) {
    await requireAdmin()

    if (data.username.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters' }
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                username: data.username,
                name: data.name
            }
        })

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error: any) {
        console.error('Error updating user details:', error)
        if (error.code === 'P2002') {
            return { success: false, error: 'Username already exists' }
        }
        return { success: false, error: 'Failed to update user details' }
    }
}

// Toggle user active status (admin only)
export async function toggleUserStatus(userId: string, isActive: boolean) {
    const session = await requireAdmin()

    if (session.user.id === userId) {
        return { success: false, error: 'Kendi hesabınızı pasife alamazsınız' }
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { isActive },
        })

        revalidatePath('/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Error toggling user status:', error)
        return { success: false, error: 'Failed to update user status' }
    }
}
