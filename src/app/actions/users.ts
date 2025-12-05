'use server'

import { z } from 'zod'
import { usersService } from '@/services/users-service'
import type { User } from '@/types/user'

/**
 * Server Actions para usuários
 *
 * Responsabilidades:
 * - Validar input com Zod
 * - Chamar services
 * - Retornar { success, data } ou { success: false, error }
 * - Nunca lançar erros (sempre retornar objeto)
 */

// Schemas de validação
const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  organization_id: z.string().uuid().optional(),
  role: z.enum(['admin', 'member']).optional(),
})

const updateUserSchema = z.object({
  email: z.string().email('Email inválido').optional(),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  role: z.enum(['admin', 'member']).optional(),
})

// Tipos de retorno
type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Busca usuário por ID
 */
export async function getUserById(id: string): Promise<ActionResult<User | null>> {
  try {
    const user = await usersService.getById(id)
    return { success: true, data: user }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar usuário',
    }
  }
}

/**
 * Lista usuários de uma organização
 */
export async function getUsersByOrganization(
  organizationId: string
): Promise<ActionResult<User[]>> {
  try {
    const users = await usersService.listByOrganization(organizationId)
    return { success: true, data: users }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao listar usuários',
    }
  }
}

/**
 * Cria novo usuário
 */
export async function createUser(
  input: z.infer<typeof createUserSchema>
): Promise<ActionResult<User>> {
  try {
    // Validação
    const validated = createUserSchema.parse(input)

    // Criação
    const user = await usersService.create(validated)
    return { success: true, data: user }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar usuário',
    }
  }
}

/**
 * Atualiza usuário
 */
export async function updateUser(
  id: string,
  input: z.infer<typeof updateUserSchema>
): Promise<ActionResult<User>> {
  try {
    // Validação
    const validated = updateUserSchema.parse(input)

    // Atualização
    const user = await usersService.update(id, validated)
    return { success: true, data: user }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar usuário',
    }
  }
}

/**
 * Remove usuário
 */
export async function deleteUser(id: string): Promise<ActionResult<void>> {
  try {
    await usersService.delete(id)
    return { success: true, data: undefined }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao remover usuário',
    }
  }
}

/**
 * Promove usuário a admin
 */
export async function promoteUserToAdmin(id: string): Promise<ActionResult<User>> {
  try {
    const user = await usersService.promoteToAdmin(id)
    return { success: true, data: user }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao promover usuário',
    }
  }
}

/**
 * Rebaixa admin a membro
 */
export async function demoteUserToMember(id: string): Promise<ActionResult<User>> {
  try {
    const user = await usersService.demoteToMember(id)
    return { success: true, data: user }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao rebaixar usuário',
    }
  }
}
