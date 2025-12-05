# Setup do Supabase

Guia para configurar o Supabase no projeto.

## 1. Criar Projeto

1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Anote a URL e as chaves (anon key e service role key)

## 2. Configurar Variáveis de Ambiente

Crie `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Tabelas Base

Execute no SQL Editor do Supabase:

### Organizations (Multi-tenant)

```sql
-- Tabela de organizações (multi-tenant)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_organizations_owner ON organizations(owner_id);

-- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organizations"
  ON organizations FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own organizations"
  ON organizations FOR UPDATE
  USING (owner_id = auth.uid());
```

### Trigger para Updated At

```sql
-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### Criar Organização Automaticamente

```sql
-- Cria organização quando usuário se registra
CREATE OR REPLACE FUNCTION create_organization_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organizations (owner_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_organization_for_new_user();
```

## 4. Configurar Auth

### Providers

No Dashboard do Supabase:

1. Vá em **Authentication > Providers**
2. Ative **Google** (configure OAuth no Google Cloud Console)
3. **Email** já vem ativo (Magic Link)

### Redirect URLs

Em **Authentication > URL Configuration**:

```
Site URL: http://localhost:3000
Redirect URLs:
  - http://localhost:3000/auth/callback
  - https://seu-dominio.com/auth/callback
```

## 5. Template de Tabela

Use este template para criar novas tabelas:

```sql
CREATE TABLE [nome_tabela] (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  -- campos específicos aqui
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para queries por organização
CREATE INDEX idx_[nome_tabela]_organization ON [nome_tabela](organization_id);

-- Trigger para updated_at
CREATE TRIGGER update_[nome_tabela]_updated_at
  BEFORE UPDATE ON [nome_tabela]
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE [nome_tabela] ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization [nome_tabela]"
  ON [nome_tabela] FOR SELECT
  USING (organization_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can insert into own organization"
  ON [nome_tabela] FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can update own organization [nome_tabela]"
  ON [nome_tabela] FOR UPDATE
  USING (organization_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  ));
```

## 6. Tipos do Supabase (Opcional)

Gerar tipos TypeScript automaticamente:

```bash
npx supabase gen types typescript --project-id seu-project-id > src/types/supabase.ts
```

## 7. Verificar Conexão

Teste a conexão no projeto:

```typescript
// Temporário - apenas para teste
import { createClient } from "@/lib/supabase";

const supabase = createClient();
const { data, error } = await supabase.from("organizations").select("*");
console.log({ data, error });
```
