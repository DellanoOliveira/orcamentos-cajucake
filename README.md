# Calculadora de Orçamentos — CajuCake

Sistema interno da CajuCake com três páginas, todas protegidas por login:

| Página | Para quê |
|---|---|
| **Orçamentos** (`index.html`) | Monta orçamentos de bolos e produtos, gera texto e imagem para WhatsApp |
| **Relatórios** (`relatorios.html`) | Balanço de estoque, salvo no banco para toda a equipe |
| **Cadastros** (`admin.html`) | Tamanhos, tipos e preços de bolo, bolos de corte, seções e produtos, adicionais, estoque e usuários |

Front-end em JavaScript puro (módulos ES, sem build) com [Shoelace](https://shoelace.style).
Back-end em **PHP 8.1+** com **MySQL** (HostGator) ou SQLite (testes no computador).

## Estrutura

```
index.html / relatorios.html / admin.html
css/styles.css               estilos + tema
data/fotos-reais.json        índice das fotos reais (GERADO pelo script, não editar à mão)
img/fotos-reais/             fotos reais dos bolos (hoje: imagens provisórias .svg)
js/
  api.js                     comunicação com a API + janela de login
  app.js                     calculadora de orçamentos
  config.js                  nome da marca, cores, tipos de bolo padrão
  orcamento.js               cálculo do orçamento + texto para WhatsApp
  sugestao.js                sugestões automáticas (andares e bolos de corte)
  desenho-bolo.js            desenho do bolo em canvas
  imagem-orcamento.js        imagem PNG compartilhável
  fotos-reais.js             busca de fotos reais (exata ou mais parecida)
  componentes.js / util.js   peças compartilhadas
  relatorios/                página de relatórios (estoque.js = balanço de estoque)
  admin/                     página de cadastros (editor.js = editor genérico, precos.js)
api/
  index.php                  rotas da API
  instalar.php               instalador (cria tabelas, importa dados, cria o 1º usuário)
  config.exemplo.php         modelo de configuração → copiar para config.php
  lib/                       banco, login, catálogo, estoque, cadastros (bloqueada para a web)
  dados-iniciais/            dados importados na instalação (bloqueada para a web)
  dados/                     sessões e banco SQLite local (bloqueada, fora do Git)
scripts/
  servidor-local.php         servidor para testes no computador
  gerar-manifesto-fotos.js   atualiza data/fotos-reais.json
legado/                      versões anteriores (somente referência)
```

## Publicar no HostGator (primeira vez)

1. **Criar o banco** — cPanel → *Bancos de dados MySQL*:
   - Crie um banco (ex.: `cajucake`). O nome final terá o prefixo da conta, ex.: `usuario_cajucake`.
   - Crie um usuário de banco com senha forte.
   - Em *Adicionar usuário ao banco*, ligue os dois e marque **Todos os privilégios**.
2. **Versão do PHP** — cPanel → *Selecionar versão do PHP*: 8.1 ou mais nova (a conta já usa 8.2).
3. **Enviar os arquivos** para a pasta do site (ex.: `public_html/orcamentos/`), pelo
   *Gerenciador de Arquivos* (envie um .zip e use *Extrair*) ou FTP. Não precisa enviar `.git/`, `legado/` nem `old_version/`.
4. **Configurar** — no Gerenciador de Arquivos, copie `api/config.exemplo.php` para `api/config.php`
   e edite com o nome do banco, usuário e senha do passo 1.
5. **Instalar** — abra `https://seu-site/api/instalar.php`, informe seu nome, login e senha.
   As tabelas são criadas e os preços, produtos e itens de estoque atuais são importados.
   Depois disso o instalador se bloqueia sozinho.
6. Abra o site e entre com o usuário criado. Cadastre a equipe em **Cadastros → Usuários**.

> Use o site com **https** (o HostGator oferece SSL grátis pelo cPanel → *SSL/TLS Status*),
> para que a senha não trafegue aberta.

### Atualizações seguintes

Envie apenas os arquivos alterados. **Nunca** sobrescreva `api/config.php` nem a pasta `api/dados/`.
Ao publicar, aumente o `?v=` nos `<script>`/`<link>` dos `.html` para evitar cache antigo.

### Backup

Os dados ficam no MySQL. Faça backup pelo cPanel → *Backup* (ou *phpMyAdmin* → *Exportar*).

## Rodar no computador

Com PHP 8.1+ instalado:

1. Copie `api/config.exemplo.php` para `api/config.php` e use o bloco **SQLite** (não precisa de MySQL).
2. Na pasta do projeto:

```bash
php -S 127.0.0.1:8080 scripts/servidor-local.php
```

3. Abra http://127.0.0.1:8080/api/instalar.php para criar o banco local e o usuário, e depois http://127.0.0.1:8080

## Cadastros

Tudo o que antes ficava em arquivos JSON agora é cadastrado em **⚙️ Cadastros**:

- **Bolos**: tabela de preços (tamanho × tipo), tamanhos e tipos de bolo. Um tipo pode ter
  "Preço baseado em" outro (ex.: *Fake 5cm* = 0,5 × *Fake*), calculado automaticamente.
  O campo "Desenho" escolhe a decoração usada no desenho do bolo.
- **Bolos de Corte**, **Adicionais**: listas simples.
- **Produtos**: cada **seção** vira uma aba na calculadora (ex.: Doces & Salgados, Bebidas).
- **Estoque**: cada **seção** vira uma aba no balanço. "Por tamanho de bolo" conta cada item em
  cada tamanho (ex.: sabores); "Lista" conta cada item uma vez, com grupos opcionais.
- **Usuários**: quem pode entrar no sistema.

"Remover" apenas arquiva o cadastro: ele some das telas, mas o histórico continua no banco.
Cada alteração de estoque fica registrada (quem, quando, de quanto para quanto) na tabela
`estoque_movimentos`.

## Fotos reais

As fotos seguem o padrão `img/fotos-reais/<tipo>/<tamanhos>.<ext>`:

| Arquivo                                 | Significado                              |
|-----------------------------------------|------------------------------------------|
| `img/fotos-reais/pasta/10-20-30.jpg`    | pasta americana, andares 10, 20 e 30 cm  |
| `img/fotos-reais/naked/20.jpg`          | naked cake de um andar, 20 cm            |
| `img/fotos-reais/corte/25.jpg`          | bolo de corte de 25 cm                   |
| `img/fotos-reais/pasta/10-20-30_2.jpg`  | segunda foto da mesma composição         |

O `<tipo>` é o **Código** do tipo de bolo em Cadastros. Para adicionar ou trocar fotos:

1. Coloque a foto (`.jpg`, `.png`, `.webp`) na pasta do tipo com o nome dos tamanhos.
   Pode manter o `.svg` provisório de mesmo nome — a foto real tem prioridade.
2. Rode `node scripts/gerar-manifesto-fotos.js`.
3. Publique `img/fotos-reais/` e `data/fotos-reais.json`.

Se não houver foto exata, a calculadora mostra a mais parecida, marcada como "Semelhante".
Legendas opcionais: `img/fotos-reais/legendas.json` → `{ "pasta/10-20-30.jpg": "Aniversário da Alice" }`.

## Novos relatórios

Crie um arquivo em `js/relatorios/` seguindo o modelo de `estoque.js` e adicione-o na lista
`RELATORIOS` em `js/relatorios/app.js`.
