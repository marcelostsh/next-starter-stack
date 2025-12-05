'use client'

import { useAuth } from '@/contexts/auth-context'
import { useOrganization } from '@/contexts/organization-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const { organization, loading: orgLoading } = useOrganization()

  if (authLoading || orgLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Bem-vindo</CardTitle>
            <CardDescription>Você está logado como</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{user?.email ?? 'Não logado'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organização</CardTitle>
            <CardDescription>Sua organização atual</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {organization?.name ?? 'Nenhuma organização'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Starter Stack</CardTitle>
            <CardDescription>Template SaaS</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Next.js + Supabase + shadcn/ui</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
