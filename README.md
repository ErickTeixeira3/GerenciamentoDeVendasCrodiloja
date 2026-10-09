# Crodiloja - Sistema de Gerenciamento de Vendas (PDV) 🐊

Sistema de Ponto de Venda (PDV) rápido e moderno voltado para feiras e eventos, integrado em tempo real com o **Firebase** e otimizado para celulares, tablets (Samsung Galaxy Tab S6 Lite) e computadores.

Acesse online: [https://crodiloja-599eb.web.app](https://crodiloja-599eb.web.app)

---

## 🚀 Funcionalidades

- **PDV de Venda Rápida:**
  - Seleção e memorização de evento/feira ativo.
  - Filtro horizontal de categorias táteis e busca instantânea de produtos.
  - Adição rápida com 1 toque no card do produto.
  - Carrinho com ajuste de quantidades, cálculo de desconto (em R$ ou %) e formas de pagamento (Pix, Dinheiro, Débito e Crédito).
  - Painel lateral fixo em tablets/computadores e barra inferior deslizante em smartphones.
- **Histórico & Métricas de Vendas:**
  - Consulta em tempo real das vendas com data/hora e itens.
  - Métricas automáticas: Faturamento Total, Quantidade de Pedidos, Peças Vendidas e **Lucro Bruto Estimado** (com base no Preço de Custo).
  - Opção para excluir/cancelar registros de vendas incorretos.
- **Catálogo de Produtos & Custos:**
  - Cadastro e edição de produtos com nome, categoria, preço de venda e preço de custo.
  - Cálculo automático de margem de lucro (%) por item.
  - Exclusão e edição de produtos.
- **Gestão de Categorias e Eventos:**
  - Criação, edição de nome e exclusão de categorias e feiras/eventos.
- **Segurança & Autenticação:**
  - Protegido por Firebase Authentication (E-mail e Senha).
  - Regras de segurança no Firestore para garantir acesso apenas a usuários autenticados.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** [React 19](https://react.dev/), [Vite](https://vite.dev/)
- **Backend / Database:** [Firebase Firestore](https://firebase.google.com/docs/firestore)
- **Autenticação:** [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Hospedagem:** [Firebase Hosting](https://firebase.google.com/docs/hosting)
- **Ícones:** [Lucide React](https://lucide.dev/)

---

## 💻 Como Rodar Localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/ErickTeixeira3/GerenciamentoDeVendasCrodiloja.git
   cd GerenciamentoDeVendasCrodiloja
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev -- --host
   ```
   Acesse no navegador: `http://localhost:5173` ou pelo IP local no seu tablet/smartphone.

---

## 📦 Como Publicar Atualizações (Deploy)

Para compilar e publicar novas versões no Firebase Hosting:

1. Gerar o build de produção:
   ```bash
   npm run build
   ```

2. Publicar no Firebase:
   ```bash
   npm run deploy
   ```
