# Calculadora de Orçamentos — CajuCake

Calculadora de orçamentos de bolos e doces. JavaScript puro (módulos ES), sem etapa de build:
basta publicar a pasta no servidor.

## Estrutura

```
index.html                 calculadora de orçamentos
relatorios.html            relatórios para WhatsApp (ex.: balanço de estoque)
css/styles.css             estilos + tema (cores da marca aplicadas ao Shoelace)
data/                      dados editáveis (preços, fatias, produtos)
  bolos.json               bolos decorados: tamanho → tipos (pasta, glacê, naked, fake, torta)
  bolos-corte.json         bolos de corte (seção própria, completam as fatias)
  outros-produtos.json     doces e salgados ("passo" = quanto o botão + soma)
  servicos.json            adicionais ("desconto": true subtrai do total)
  estoque.json             sabores usados no balanço de estoque
  fotos-reais.json         índice das fotos reais (GERADO pelo script, não editar à mão)
js/
  app.js                   ponto de entrada: estado, tela e eventos
  config.js                nome da marca, cores, nomes dos tipos de bolo
  orcamento.js             cálculo do orçamento + texto para WhatsApp
  sugestao.js              sugestões automáticas (andares e bolos de corte)
  desenho-bolo.js          desenho do bolo em canvas (proporcional ao diâmetro)
  imagem-orcamento.js      gera a imagem PNG compartilhável
  fotos-reais.js           serviço de fotos reais (busca exata ou mais parecida)
  util.js                  formatação de moeda/data, carregamento de JSON
  componentes.js           peças de interface usadas nas duas páginas
  relatorios/app.js        página de relatórios (lista de relatórios disponíveis)
  relatorios/estoque.js    relatório: balanço de estoque
img/fotos-reais/           fotos reais dos bolos (hoje: imagens provisórias .svg)
scripts/
  gerar-manifesto-fotos.js atualiza data/fotos-reais.json
legado/                    versões anteriores (somente referência)
```

Interface: [Shoelace](https://shoelace.style) (componentes web via CDN).

## Rodar localmente

Os dados são carregados via `fetch`, então é preciso um servidor (abrir o arquivo direto não funciona):

```bash
python -m http.server 8080
```

ou `npx serve .` — depois acesse http://localhost:8080

## Fotos reais

As fotos seguem o padrão `img/fotos-reais/<tipo>/<tamanhos>.<ext>`:

| Arquivo                                 | Significado                              |
|-----------------------------------------|------------------------------------------|
| `img/fotos-reais/pasta/10-20-30.jpg`    | pasta americana, andares 10, 20 e 30 cm  |
| `img/fotos-reais/naked/20.jpg`          | naked cake de um andar, 20 cm            |
| `img/fotos-reais/corte/25.jpg`          | bolo de corte de 25 cm                   |
| `img/fotos-reais/pasta/10-20-30_2.jpg`  | segunda foto da mesma composição         |

Para adicionar ou trocar fotos:

1. Coloque a foto (`.jpg`, `.png`, `.webp`) na pasta do tipo com o nome dos tamanhos.
   Pode manter o `.svg` provisório de mesmo nome — a foto real tem prioridade.
2. Rode `node scripts/gerar-manifesto-fotos.js`.
3. Publique `img/fotos-reais/` e `data/fotos-reais.json`.

Se não houver foto exata para o orçamento, a calculadora mostra a mais parecida
(mesmo tipo, mesma quantidade de andares e tamanhos próximos), marcada como "Semelhante".

Legendas opcionais: `img/fotos-reais/legendas.json` → `{ "pasta/10-20-30.jpg": "Aniversário da Alice" }`.

## Alterar preços

Edite os arquivos em `data/`. Para mudar nome da marca, cores da imagem ou nomes dos tipos, edite `js/config.js`.
Ao publicar uma nova versão, aumente o `?v=` em `index.html` para evitar cache antigo.

## Relatórios

A página `relatorios.html` gera mensagens para WhatsApp que não são orçamentos.

- **Balanço de Estoque**: abas Bolos (por tamanho e sabor, mesmos tamanhos do orçamento) e Recheios.
  Sabores e recheios ficam em `data/estoque.json`. A última contagem fica salva no aparelho.

Para criar um novo relatório, crie um arquivo em `js/relatorios/` seguindo o modelo de
`estoque.js` e adicione-o na lista `RELATORIOS` em `js/relatorios/app.js`.
