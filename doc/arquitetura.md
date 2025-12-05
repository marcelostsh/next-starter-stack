# Arquitetura

Documentação técnica da estrutura do projeto, padrões e decisões de arquitetura.

## Stack Técnica

### Core

| Camada    | Tecnologia                          |
| --------- | ----------------------------------- |
| Framework | Next.js 15 + React 19 + TypeScript  |
| Banco     | Supabase (PostgreSQL)               |
| Auth      | Supabase Auth (Google + Magic Link) |

### Frontend

| Camada        | Tecnologia               |
| ------------- | ------------------------ |
| UI            | Tailwind CSS + shadcn/ui |
| Validação     | Zod                      |
| Estado global | React Context            |
| Gráficos      | Recharts                 |

### Backend

| Camada   | Tecnologia                                                                       |
| -------- | -------------------------------------------------------------------------------- |
| Cálculos | decimal.js _(precisão exata em centavos — JS nativo usa float e perde precisão)_ |
| API      | Next.js API Routes + Server Actions                                              |

## Estrutura de Pastas

```
src/
├── app/
│   ├── (auth)/                      # Route Group: páginas públicas
│   │   └── login/
│   │       └── page.tsx             # /login
│   │
│   ├── (dashboard)/                 # Route Group: páginas protegidas
│   │   ├── layout.tsx               # Layout com sidebar
│   │   ├── page.tsx                 # / (home do dashboard)
│   │   └── [domínio]/               # Páginas por domínio
│   │       ├── page.tsx             # /[domínio]
│   │       └── [id]/
│   │           └── page.tsx         # /[domínio]/:id
│   │
│   ├── actions/                     # Server Actions (mutações)
│   │   └── [domínio].ts
│   │
│   └── api/                         # API Routes (endpoints HTTP)
│       └── webhooks/
│           └── [serviço]/route.ts
│
├── components/
│   ├── ui/                          # shadcn/ui
│   ├── layout/                      # Sidebar, Header
│   └── [domínio]/                   # Componentes por domínio
│
├── contexts/
│   ├── auth-context.tsx             # Usuário logado
│   └── organization-context.tsx     # Organização atual (multi-tenant)
│
├── hooks/
│   └── use-notifications.ts         # Wrapper do toast
│
├── lib/
│   ├── supabase.ts                  # Cliente Supabase (browser)
│   ├── supabase-server.ts           # Cliente Supabase (server)
│   │
│   ├── repositories/                # Data Access Layer (DAL)
│   │   └── [domínio]-repository.ts
│   │
│   ├── services/                    # Regras de negócio
│   │   └── [domínio]-service.ts
│   │
│   └── [clients externos].ts        # Clients de APIs externas
│
└── types/                           # Models/Interfaces
    ├── index.ts                     # Re-export de todos
    └── [domínio].ts
```

## Camadas

| Camada             | Pasta                             | Responsabilidade                               |
| ------------------ | --------------------------------- | ---------------------------------------------- |
| **Páginas**        | `app/(auth)/`, `app/(dashboard)/` | UI, renderização                               |
| **Server Actions** | `app/actions/`                    | Entry point, validação Zod, orquestra services |
| **API Routes**     | `app/api/`                        | Webhooks externos, download de arquivos        |
| **Componentes**    | `components/`                     | UI reutilizável                                |
| **Services**       | `lib/services/`                   | Regras de negócio, orquestra repositories      |
| **Repositories**   | `lib/repositories/`               | Acesso ao banco (DAL)                          |
| **Clients**        | `lib/[client].ts`                 | Chamadas a APIs externas                       |
| **Types**          | `types/`                          | Models, interfaces, inputs                     |

## Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  Componente                                                 │
│      │                                                      │
│      │ importa e chama direto (não é HTTP explícito)        │
│      ▼                                                      │
├─────────────────────────────────────────────────────────────┤
│                        BACKEND                              │
│  Server Action (app/actions/)                               │
│      │ valida input com Zod                                 │
│      ▼                                                      │
│  Service (lib/services/)                                    │
│      │ aplica regras de negócio                             │
│      ▼                                                      │
│  Repository (lib/repositories/)                             │
│      │ monta query                                          │
│      ▼                                                      │
│  Supabase Client (lib/supabase-server.ts)                   │
│      │                                                      │
│      ▼                                                      │
│  PostgreSQL                                                 │
└─────────────────────────────────────────────────────────────┘
```

### Regras de Comunicação

| De              | Para            | Como                    |
| --------------- | --------------- | ----------------------- |
| Frontend        | Backend próprio | Server Action (RPC)     |
| Backend         | Banco de dados  | Repository → Supabase   |
| Backend         | API externa     | Client (`lib/[api].ts`) |
| Sistema externo | Backend próprio | API Route (HTTP)        |

## Padrões

### Repository

Cada repository expõe métodos sob demanda. Não criar método que não será usado.

```typescript
// lib/repositories/example-repository.ts
export const exampleRepository = {
  // Queries - criar conforme necessidade
  findById(id: string): Promise<Example | null>,
  findByOrganization(orgId: string): Promise<Example[]>,
  findWithRelations(orgId: string): Promise<ExampleWithRelations[]>,

  // CRUD
  create(data: CreateExampleInput): Promise<Example>,
  update(id: string, data: UpdateExampleInput): Promise<Example>,
  delete(id: string): Promise<void>,
}
```

**Regras:**

- Query simples → método específico (`findById`, `findByOrganization`)
- Query com JOIN → método específico (`findWithRelations`)
- Não criar métodos especulativos
- Não repetir query em múltiplos lugares

### Services (Regras de Negócio)

Services orquestram repositories e aplicam lógica complexa.

```typescript
// lib/services/example-service.ts
import { Decimal } from "decimal.js";
import { exampleRepository } from "@/lib/repositories/example-repository";
import { relatedRepository } from "@/lib/repositories/related-repository";

export const exampleService = {
  async processItems(orgId: string, period: string) {
    // 1. Busca dados de múltiplos repositories
    const items = await exampleRepository.findByOrganization(orgId);
    const related = await relatedRepository.findByPeriod(orgId, period);

    // 2. Aplica regras de negócio
    const processed = items.map((item) => {
      // lógica complexa aqui
      return {
        ...item,
        calculated: new Decimal(item.value).times(1.1).toNumber(),
      };
    });

    // 3. Persiste resultado se necessário
    await exampleRepository.updateMany(processed);

    return processed;
  },
};
```

### Types (Models)

Types definem a estrutura dos dados em todas as camadas.

```typescript
// types/example.ts
export type Example = {
  id: string;
  organization_id: string;
  name: string;
  value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// Inputs para criação/atualização
export type CreateExampleInput = Omit<
  Example,
  "id" | "created_at" | "updated_at"
>;
export type UpdateExampleInput = Partial<CreateExampleInput>;

// Com relações (para queries com JOIN)
export type ExampleWithRelations = Example & {
  related: Related[];
};
```

```typescript
// types/index.ts - Re-export centralizado
export * from "./example";
export * from "./related";
```

### Server Actions vs API Routes

| Usar               | Quando                                                                    |
| ------------------ | ------------------------------------------------------------------------- |
| **Server Actions** | CRUD interno, formulários, mutações do app                                |
| **API Routes**     | Webhooks externos, download de arquivos, integrações que terceiros chamam |

---

## Guia de Desenvolvimento

### Convenções de Código

| Convenção           | Padrão                                       |
| ------------------- | -------------------------------------------- |
| Aspas               | Simples (`'string'`)                         |
| Ponto-e-vírgula     | Não usar                                     |
| Indentação          | 2 espaços                                    |
| Nomes de arquivo    | kebab-case (`example-repository.ts`)         |
| Nomes de componente | PascalCase (`ExampleForm.tsx`)               |
| Nomes de função     | camelCase (`getExamples`)                    |
| Nomes de tipo       | PascalCase (`Example`, `CreateExampleInput`) |

### Variáveis de Ambiente

Criar arquivo `.env.local` na raiz do projeto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Adicionar conforme necessidade do projeto
# EXTERNAL_API_KEY=xxx
# STRIPE_SECRET_KEY=sk_xxx
# RESEND_API_KEY=re_xxx
```

### Schemas Zod

Schemas ficam junto com as Actions que os utilizam.

```typescript
// app/actions/examples.ts
import { z } from "zod";

const createExampleSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  value: z.number().min(0, "Valor deve ser positivo"),
  organization_id: z.string().uuid(),
});

const updateExampleSchema = createExampleSchema.partial().extend({
  id: z.string().uuid(),
});
```

### Exemplo Completo de Fluxo

#### 1. Type (Model)

```typescript
// types/example.ts
export type Example = {
  id: string;
  organization_id: string;
  name: string;
  value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateExampleInput = Omit<
  Example,
  "id" | "created_at" | "updated_at"
>;
export type UpdateExampleInput = Partial<CreateExampleInput>;
```

#### 2. Repository (Acesso ao Banco)

```typescript
// lib/repositories/example-repository.ts
import { createClient } from "@/lib/supabase-server";
import type { Example, CreateExampleInput, UpdateExampleInput } from "@/types";

export const exampleRepository = {
  async findById(id: string): Promise<Example | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("examples")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  },

  async findByOrganization(orgId: string): Promise<Example[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("examples")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("name");

    if (error) throw new Error(error.message);
    return data;
  },

  async create(input: CreateExampleInput): Promise<Example> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("examples")
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async update(id: string, input: UpdateExampleInput): Promise<Example> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("examples")
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("examples")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw new Error(error.message);
  },
};
```

#### 3. Server Action (Entry Point)

```typescript
// app/actions/examples.ts
"use server";

import { z } from "zod";
import { exampleRepository } from "@/lib/repositories/example-repository";
import { revalidatePath } from "next/cache";

// Schema de validação
const createExampleSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  value: z.number().min(0, "Valor deve ser positivo"),
  organization_id: z.string().uuid(),
});

// Types de retorno
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Actions
export async function getExamples(orgId: string) {
  return exampleRepository.findByOrganization(orgId);
}

export async function getExampleById(id: string) {
  return exampleRepository.findById(id);
}

export async function createExample(
  input: z.infer<typeof createExampleSchema>
): Promise<ActionResult<Example>> {
  // 1. Valida input
  const parsed = createExampleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  // 2. Chama repository
  try {
    const example = await exampleRepository.create({
      ...parsed.data,
      is_active: true,
    });

    // 3. Revalida cache da página
    revalidatePath("/examples");

    return { success: true, data: example };
  } catch (err) {
    return { success: false, error: "Erro ao criar item" };
  }
}

export async function updateExample(
  id: string,
  input: Partial<z.infer<typeof createExampleSchema>>
): Promise<ActionResult<Example>> {
  try {
    const example = await exampleRepository.update(id, input);
    revalidatePath("/examples");
    return { success: true, data: example };
  } catch (err) {
    return { success: false, error: "Erro ao atualizar item" };
  }
}

export async function deleteExample(id: string): Promise<ActionResult<void>> {
  try {
    await exampleRepository.delete(id);
    revalidatePath("/examples");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: "Erro ao excluir item" };
  }
}
```

#### 4. Componente (UI)

```typescript
// components/examples/example-form.tsx
"use client";

import { useState } from "react";
import { createExample } from "@/app/actions/examples";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Props = {
  organizationId: string;
  onSuccess?: () => void;
};

export function ExampleForm({ organizationId, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [value, setValue] = useState(0);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await createExample({
      name,
      value,
      organization_id: organizationId,
    });

    setLoading(false);

    if (result.success) {
      toast.success("Item criado");
      setName("");
      setValue(0);
      onSuccess?.();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        type="number"
        placeholder="Valor"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
```

#### 5. Página (Composição)

```typescript
// app/(dashboard)/examples/page.tsx
import { getExamples } from "@/app/actions/examples";
import { ExampleForm } from "@/components/examples/example-form";
import { ExampleTable } from "@/components/examples/example-table";
import { getOrganizationId } from "@/lib/auth";

export default async function ExamplesPage() {
  const orgId = await getOrganizationId();
  const examples = await getExamples(orgId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Exemplos</h1>

      <ExampleForm organizationId={orgId} />

      <ExampleTable examples={examples} />
    </div>
  );
}
```

### Tratamento de Erros

| Camada         | Como tratar                                 |
| -------------- | ------------------------------------------- |
| **Repository** | Lança `Error` com mensagem                  |
| **Service**    | Lança `Error` ou retorna `null`             |
| **Action**     | Retorna `{ success: false, error: string }` |
| **Componente** | Exibe toast com `toast.error()`             |

```typescript
// Padrão de retorno de Action
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### Como Adicionar Nova Funcionalidade

Exemplo: adicionar novo domínio ao projeto.

**Passo 1:** Criar type em `types/[domínio].ts`

**Passo 2:** Criar repository em `lib/repositories/[domínio]-repository.ts`

- Apenas métodos que serão usados

**Passo 3:** Criar actions em `app/actions/[domínio].ts`

- Schema Zod para validação
- Actions que chamam repository

**Passo 4:** Criar componentes em `components/[domínio]/`

- `[domínio]-form.tsx` (formulário)
- `[domínio]-table.tsx` (listagem)
- `[domínio]-card.tsx` (card individual)

**Passo 5:** Criar página em `app/(dashboard)/[domínio]/page.tsx`

- Composição dos componentes

**Passo 6:** Se precisar de lógica complexa, criar service em `lib/services/[domínio]-service.ts`

### Tabelas no Supabase

Para cada domínio, criar tabela com estrutura base:

```sql
CREATE TABLE examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para queries por organização
CREATE INDEX idx_examples_organization ON examples(organization_id);

-- RLS (Row Level Security)
ALTER TABLE examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization examples"
  ON examples FOR SELECT
  USING (organization_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  ));
```
