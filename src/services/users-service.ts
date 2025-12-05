import { usersRepository } from '@/repositories/users-repository'
import type { User, CreateUserInput, UpdateUserInput } from '@/types/user'

/**
 * Service para regras de negócio de usuários
 *
 * Responsabilidades:
 * - Validações de negócio
 * - Orquestrar múltiplos repositories
 * - Retornar null em caso de "não encontrado"
 * - Lançar erros em caso de violação de regras
 */
export const usersService = {
  /**
   * Busca usuário por ID
   * Retorna null se não encontrado
   */
  async getById(id: string): Promise<User | null> {
    return usersRepository.findById(id)
  },

  /**
   * Busca usuário por email
   * Retorna null se não encontrado
   */
  async getByEmail(email: string): Promise<User | null> {
    return usersRepository.findByEmail(email)
  },

  /**
   * Lista usuários de uma organização
   */
  async listByOrganization(organizationId: string): Promise<User[]> {
    return usersRepository.findByOrganization(organizationId)
  },

  /**
   * Busca usuário com dados da organização
   */
  async getWithOrganization(id: string) {
    return usersRepository.findWithOrganization(id)
  },

  /**
   * Cria novo usuário
   * Valida se email já existe
   */
  async create(input: CreateUserInput): Promise<User> {
    // Validação de negócio: email único
    const existing = await usersRepository.findByEmail(input.email)
    if (existing) {
      throw new Error('Email já cadastrado')
    }

    return usersRepository.create(input)
  },

  /**
   * Atualiza usuário
   * Valida se usuário existe e se email é único
   */
  async update(id: string, input: UpdateUserInput): Promise<User> {
    // Verifica se existe
    const user = await usersRepository.findById(id)
    if (!user) {
      throw new Error('Usuário não encontrado')
    }

    // Se está alterando email, valida unicidade
    if (input.email && input.email !== user.email) {
      const existing = await usersRepository.findByEmail(input.email)
      if (existing) {
        throw new Error('Email já cadastrado')
      }
    }

    return usersRepository.update(id, input)
  },

  /**
   * Remove usuário
   * Valida se usuário existe e não é admin único
   */
  async delete(id: string): Promise<void> {
    const user = await usersRepository.findById(id)
    if (!user) {
      throw new Error('Usuário não encontrado')
    }

    // Regra de negócio: não pode remover último admin
    if (user.role === 'admin' && user.organization_id) {
      const orgUsers = await usersRepository.findByOrganization(user.organization_id)
      const admins = orgUsers.filter((u) => u.role === 'admin')

      if (admins.length === 1) {
        throw new Error('Não é possível remover o único administrador da organização')
      }
    }

    await usersRepository.delete(id)
  },

  /**
   * Promove usuário a admin
   */
  async promoteToAdmin(id: string): Promise<User> {
    return usersRepository.update(id, { role: 'admin' })
  },

  /**
   * Rebaixa admin a membro
   * Valida se não é último admin
   */
  async demoteToMember(id: string): Promise<User> {
    const user = await usersRepository.findById(id)
    if (!user) {
      throw new Error('Usuário não encontrado')
    }

    if (user.role !== 'admin') {
      throw new Error('Usuário já é membro')
    }

    // Regra de negócio: não pode rebaixar último admin
    if (user.organization_id) {
      const orgUsers = await usersRepository.findByOrganization(user.organization_id)
      const admins = orgUsers.filter((u) => u.role === 'admin')

      if (admins.length === 1) {
        throw new Error('Não é possível rebaixar o único administrador da organização')
      }
    }

    return usersRepository.update(id, { role: 'member' })
  },
}
