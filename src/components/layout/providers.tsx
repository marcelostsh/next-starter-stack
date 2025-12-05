'use client'

import { AuthProvider } from '@/contexts/auth-context'
import { OrganizationProvider } from '@/contexts/organization-context'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <OrganizationProvider>
        {children}
        <Toaster />
      </OrganizationProvider>
    </AuthProvider>
  )
}
