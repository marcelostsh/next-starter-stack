import { createServerClient } from '@/lib/supabase-server'
import type { User, CreateUserInput, UpdateUserInput } from '@/types/user'

/**
 * Repository para acesso a dados de usuários
 *
 * Responsabilidades:
 * - Encapsular queries do Supabase
 * - Retornar dados tipados
 * - Lançar erros em caso de falha
 */
export const usersRepository = {
  /**
   * Busca usuário por ID
   */
  async findById(id: string): Promise<User | null> {
    const supabase = await createServerClient()
    if (!supabase) throw new Error('Supabase não configurado')

    const { data, error } = await supabase.from('users').select('*').eq('id', id).single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Erro ao buscar usuário: ${error.message}`)
    }

    return data
  },

  /**
   * Busca usuário por email
   */
  async findByEmail(email: string): Promise<User | null> {
    const supabase = await createServerClient()
    if (!supabase) throw new Error('Supabase não configurado')

    const { data, error } = await supabase.from('users').select('*').eq('email', email).single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Erro ao buscar usuário: ${error.message}`)
    }

    return data
  },

  /**
   * Lista usuários por organização
   */
  async findByOrganization(organizationId: string): Promise<User[]> {
    const supabase = await createServerClient()
    if (!supabase) throw new Error('Supabase não configurado')

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(`Erro ao listar usuários: ${error.message}`)
    }

    return data ?? []
  },

  /**
   * Busca usuário com sua organização (JOIN)
   */
  async findWithOrganization(
    id: string
  ): Promise<(User & { organization: { id: string; name: string } | null }) | null> {
    const supabase = await createServerClient()
    if (!supabase) throw new Error('Supabase não configurado')

    const { data, error } = await supabase
      .from('users')
      .select(
        `
        *,
        organization:organizations(id, name)
      `
      )
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Erro ao buscar usuário: ${error.message}`)
    }

    return data
  },

  /**
   * Cria novo usuário
   */
  async create(input: CreateUserInput): Promise<User> {
    const supabase = await createServerClient()
    if (!supabase) throw new Error('Supabase não configurado')

    const { data, error } = await supabase
      .from('users')
      .insert({
        ...input,
        role: input.role ?? 'member',
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao criar usuário: ${error.message}`)
    }

    return data
  },

  /**
   * Atualiza usuário
   */
  async update(id: string, input: UpdateUserInput): Promise<User> {
    const supabase = await createServerClient()
    if (!supabase) throw new Error('Supabase não configurado')

    const { data, error } = await supabase
      .from('users')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao atualizar usuário: ${error.message}`)
    }

    return data
  },

  /**
   * Remove usuário
   */
  async delete(id: string): Promise<void> {
    const supabase = await createServerClient()
    if (!supabase) throw new Error('Supabase não configurado')

    const { error } = await supabase.from('users').delete().eq('id', id)

    if (error) {
      throw new Error(`Erro ao remover usuário: ${error.message}`)
    }
  },
}
