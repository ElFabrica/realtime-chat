# 💬 Realtime Chat: Salas Anônimas e Efêmeras

## 🎯 O Problema que este Projeto Resolve

Em um cenário digital onde quase toda comunicação é rastreada, armazenada e associada a uma identidade permanente, surge uma lacuna crítica: **como permitir interações rápidas, seguras e totalmente anônimas que não deixem rastros?**

Muitas ferramentas de chat focam na persistência de dados, o que é um risco para a privacidade em conversas sensíveis ou casuais. Este projeto resolve esse problema ao fornecer um ambiente onde:
1.  **O Anonimato é o Padrão:** Não há perfis, logins ou rastreamento de identidade.
2.  **A Efemeridade é Garantida:** As salas e mensagens têm um ciclo de vida rigoroso de 5 minutos, após o qual os dados são permanentemente eliminados do Redis.
3.  **O Isolamento é Total:** Cada sala é um silo independente, limitado a apenas 2 participantes, garantindo que a conversa não seja interceptada ou acessada por terceiros.

---

## Visão Geral

Este projeto implementa um sistema de chat em tempo real com foco em **privacidade, anonimato e efemeridade**. A arquitetura é otimizada para alta performance e baixa latência, utilizando tecnologias modernas para gerenciar o estado e a comunicação em tempo real de forma totalmente segura.

## Solução Implementada

O Realtime Chat é uma aplicação Full Stack construída com **Next.js** para o frontend e backend (utilizando Route Handlers para a lógica de proxy), e **ElysiaJS** para a API de chat de alta performance. O coração da solução reside no uso intensivo do **Upstash Redis** para gerenciar o estado das salas, tokens de acesso e a efemeridade das conversas. As principais funcionalidades incluem:

*   **Salas de Chat Isoladas e Temporárias:** Cada sala é criada dinamicamente e configurada para expirar após 5 minutos de inatividade, garantindo a efemeridade das interações.
*   **Controle de Acesso por Proxy:** Um middleware (`proxy.ts`) no Next.js gerencia o acesso às salas, emitindo tokens de autenticação temporários (`nanoid`) armazenados em cookies HTTP-only. Isso garante que apenas dois usuários por vez possam estar em uma sala e que o acesso seja restrito.
*   **Comunicação em Tempo Real com Redis:** O **Upstash Redis** é utilizado para a troca de mensagens em tempo real e para armazenar metadados das salas, como usuários conectados e tempo de criação, com alta eficiência e escalabilidade.
*   **API de Alta Performance:** O **ElysiaJS** oferece uma camada de API leve e extremamente rápida, ideal para lidar com o volume de requisições de um chat em tempo real.
*   **Interface de Usuário Responsiva:** Desenvolvida com **React** e estilizada com **Tailwind CSS**, proporcionando uma experiência de usuário intuitiva e adaptável a diferentes dispositivos.

## Stack Tecnológica

*   **Frontend & Backend (Framework):** [Next.js 16.2.2](https://nextjs.org/) (App Router) com [TypeScript](https://www.typescriptlang.org/)
*   **Backend (API):** [ElysiaJS](https://elysiajs.com/) (Framework HTTP para Node.js)
*   **Banco de Dados em Memória / Cache:** [Upstash Redis](https://upstash.com/redis) (para gerenciamento de estado de salas e mensagens efêmeras)
*   **Comunicação em Tempo Real:** [Upstash Realtime](https://upstash.com/realtime)
*   **Gerenciamento de Estado / Queries:** [TanStack React Query](https://tanstack.com/query/latest)
*   **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
*   **Geração de IDs Únicos:** [Nanoid](https://github.com/ai/nanoid)
*   **Validação de Esquemas:** [Zod](https://zod.dev/)
*   **Manipulação de Datas:** [Date-fns](https://date-fns.org/)

## Arquitetura e Design

O projeto segue uma arquitetura modular, com a lógica de backend desacoplada da interface do usuário. O uso de um **proxy no Next.js** para controlar o acesso às salas antes mesmo de renderizar a interface do chat é um ponto chave. O **Redis** atua como um hub central para a comunicação e o estado efêmero, garantindo que as informações sejam processadas e expiradas rapidamente.

## 💡 Próximos Passos (Branch em Construção)

Uma das evoluções planejadas para este projeto é a integração com o **Telegram**. O objetivo é permitir que os usuários gerenciem **agentes de Inteligência Artificial de atendimento** diretamente através de um bot no Telegram. Esta funcionalidade visa expandir o conceito de comunicação em tempo real para automação e interação com IAs, demonstrando a versatilidade da arquitetura e a visão de produto para soluções inovadoras.

## 🚀 Como Rodar o Projeto Localmente

Siga os passos abaixo para configurar o ambiente de desenvolvimento e executar o projeto em sua máquina.

### Pré-requisitos

Certifique-se de ter instalado em sua máquina:
*   [Node.js](https://nodejs.org/) (versão 18 ou superior)
*   [pnpm](https://pnpm.io/) (ou npm/yarn)
*   Conta no [Upstash](https://upstash.com/) para obter as credenciais do Redis.

### Passo 1: Clonar o Repositório

```bash
git clone https://github.com/ElFabrica/realtime-chat.git
cd realtime-chat
```

### Passo 2: Instalar Dependências

```bash
pnpm install
```

### Passo 3: Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto e adicione as seguintes chaves obtidas em sua conta Upstash:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### Passo 4: Executar o Projeto

Inicie o servidor de desenvolvimento do Next.js:

```bash
pnpm dev
```

O projeto estará disponível em `http://localhost:3000`.

## 🛠️ Scripts Disponíveis

*   `pnpm dev`: Inicia o servidor de desenvolvimento do Next.js.
*   `pnpm build`: Cria a versão de produção da aplicação.
*   `pnpm start`: Inicia o servidor de produção.
*   `pnpm lint`: Executa a verificação de linting do código.

## Demo

[demo online](https://realtime-chat-vert-beta.vercel.app/)
