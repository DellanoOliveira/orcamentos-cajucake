// Relatório: Balanço de Estoque, em duas seções (abas):
//   Bolos    -> por tamanho e sabor. Tamanhos: os mesmos do orçamento (data/bolos.json).
//   Recheios -> itens agrupados. Sabores e recheios ficam em data/estoque.json.
import { ARQUIVOS_DADOS } from '../config.js';
import { carregarJSON, escaparHTML, lerPreferencia, salvarPreferencia } from '../util.js';
import { contador, sincronizarContador } from '../componentes.js';

const CHAVE_SALVA = 'relatorio-estoque';

let tamanhos = [];
let sabores = [];
let gruposRecheio = [];
let quantidades = new Map();   // bolos: "20:branco" | recheios: "r:geleia-morango"
let mostrarZerados = false;
let raiz = null;
let avisar = () => {};

const chaveBolo = (tamanho, sabor) => tamanho + ':' + sabor;
const chaveRecheio = (id) => 'r:' + id;
const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);

export default {
    id: 'estoque',
    titulo: 'Balanço de Estoque',
    emoji: '📦',

    async iniciar(container, aoMudar) {
        raiz = container;
        avisar = aoMudar;
        const [bolos, estoque] = await Promise.all([
            carregarJSON(ARQUIVOS_DADOS.bolos),
            carregarJSON(ARQUIVOS_DADOS.estoque)
        ]);
        tamanhos = bolos.bolos.map((b) => b.tamanho);
        sabores = estoque.sabores;
        gruposRecheio = estoque.recheios || [];

        // última contagem salva neste aparelho
        const salvo = lerPreferencia(CHAVE_SALVA, {});
        mostrarZerados = !!salvo.mostrarZerados;
        const restaurar = (k) => quantidades.set(k, +(salvo.quantidades?.[k]) || 0);
        for (const t of tamanhos) sabores.forEach((s) => restaurar(chaveBolo(t, s.id)));
        for (const grupo of gruposRecheio) grupo.itens.forEach((item) => restaurar(chaveRecheio(item.id)));

        renderizar();
        ligarEventos();
        sincronizar();
    },

    resumo() {
        const { bolos, recheios } = totais();
        return plural(bolos, 'bolo', 'bolos') + ' · ' + plural(recheios, 'recheio', 'recheios');
    },

    gerarTexto({ data, observacoes }) {
        const { bolos, recheios } = totais();
        let texto = '📦 *Balanço de Estoque*\n';
        texto += '📅 ' + data + '\n';

        // ---- bolos
        texto += '\n🎂 *BOLOS*\n';
        for (const sabor of sabores) {
            const itens = tamanhos
                .map((t) => ({ nome: t + ' cm', quantidade: quantidades.get(chaveBolo(t, sabor.id)) }));
            texto += secao(sabor.emoji + ' *' + sabor.plural + '*', itens);
        }

        // ---- recheios
        if (gruposRecheio.length) {
            texto += '\n🍯 *RECHEIOS*\n';
            for (const grupo of gruposRecheio) {
                const itens = grupo.itens
                    .map((item) => ({ nome: item.emoji + ' ' + item.nome, quantidade: quantidades.get(chaveRecheio(item.id)) }));
                texto += secao('*' + grupo.grupo + '*', itens, '');
            }
        }

        texto += '___________________\n';
        texto += '*Total: ' + plural(bolos, 'bolo', 'bolos') + ' · ' + plural(recheios, 'recheio', 'recheios') + '*\n';
        if (observacoes) texto += '📝 _' + observacoes + '_\n';
        return texto.trim();
    },

    limpar() {
        for (const k of quantidades.keys()) quantidades.set(k, 0);
        mudou();
    }
};

/** Título + lista "• nome: qtd". Sem itens contados (e sem listar zerados) vira "sem estoque". */
function secao(titulo, itens, marcador = '• ') {
    const visiveis = itens.filter((i) => mostrarZerados || i.quantidade > 0);
    const subtotal = itens.reduce((soma, i) => soma + i.quantidade, 0);
    if (!subtotal && !mostrarZerados) {
        return titulo + ': sem estoque\n';
    }
    let texto = titulo + ' (' + subtotal + ')\n';
    for (const item of visiveis) {
        texto += marcador + item.nome + ': ' + item.quantidade + (item.quantidade ? '' : ' ⚠️') + '\n';
    }
    return texto;
}

function totais() {
    let bolos = 0;
    let recheios = 0;
    for (const [k, q] of quantidades) {
        if (k.startsWith('r:')) recheios += q;
        else bolos += q;
    }
    return { bolos, recheios };
}

// =====================================================================
// Tela
// =====================================================================

function renderizar() {
    raiz.innerHTML = `
      <div class="painel-sugestao">
        <div class="painel-sugestao__titulo">
          <sl-icon name="box-seam"></sl-icon>
          Contagem do estoque
          <small>marque cada item e ajuste a quantidade</small>
        </div>
        <sl-switch size="small" data-estoque="zerados" ${mostrarZerados ? 'checked' : ''}>
          Listar itens zerados na mensagem
        </sl-switch>
      </div>

      <sl-tab-group class="subabas">
        <sl-tab slot="nav" panel="bolos">🎂 Bolos <sl-badge pill variant="neutral" data-badge="bolos">0</sl-badge></sl-tab>
        <sl-tab slot="nav" panel="recheios">🍯 Recheios <sl-badge pill variant="neutral" data-badge="recheios">0</sl-badge></sl-tab>

        <sl-tab-panel name="bolos">
          <div class="grade grade--estoque">
            ${tamanhos.map((t) => `
              <article class="cartao-item cartao-estoque" data-tamanho="${t}">
                <div class="cartao-estoque__topo">
                  <span class="cartao-item__tamanho">${t}<small>cm</small></span>
                  <span class="cartao-estoque__total" data-campo="total"></span>
                </div>
                ${sabores.map((s) => `
                  <div class="linha-sabor" data-chave="${chaveBolo(t, s.id)}">
                    <button type="button" class="linha-sabor__marcar" data-acao="marcar" aria-pressed="false">
                      <sl-icon name="check-circle-fill"></sl-icon>
                      <span>${s.emoji} ${escaparHTML(s.nome)}</span>
                    </button>
                    ${contador('estoque', chaveBolo(t, s.id))}
                  </div>`).join('')}
              </article>`).join('')}
          </div>
        </sl-tab-panel>

        <sl-tab-panel name="recheios">
          ${gruposRecheio.map((grupo) => `
            <h3 class="titulo-grupo">${escaparHTML(grupo.grupo)}</h3>
            <div class="lista">
              ${grupo.itens.map((item) => `
                <div class="linha linha--estoque" data-chave="${chaveRecheio(item.id)}">
                  <span class="linha__emoji" aria-hidden="true">${item.emoji}</span>
                  <button type="button" class="linha-sabor__marcar" data-acao="marcar" aria-pressed="false">
                    <sl-icon name="check-circle-fill"></sl-icon>
                    <span class="linha__nome">${escaparHTML(item.nome)}</span>
                  </button>
                  ${contador('estoque', chaveRecheio(item.id))}
                </div>`).join('')}
            </div>`).join('')}
        </sl-tab-panel>
      </sl-tab-group>`;
}

function ligarEventos() {
    raiz.addEventListener('click', (evento) => {
        const delta = evento.target.closest('.contador [data-delta]');
        if (delta) {
            const k = delta.closest('.contador').dataset.chave;
            definir(k, quantidades.get(k) + +delta.dataset.delta);
            return;
        }
        const marcar = evento.target.closest('[data-acao="marcar"]');
        if (marcar) {
            const k = marcar.closest('[data-chave]').dataset.chave;
            definir(k, quantidades.get(k) > 0 ? 0 : 1);
        }
    });

    raiz.addEventListener('change', (evento) => {
        const input = evento.target.closest('.contador input');
        if (input) definir(input.closest('.contador').dataset.chave, parseInt(input.value, 10) || 0);
    });

    raiz.addEventListener('sl-change', (evento) => {
        if (evento.target.dataset.estoque === 'zerados') {
            mostrarZerados = evento.target.checked;
            mudou();
        }
    });
}

function definir(k, quantidade) {
    quantidades.set(k, Math.max(0, Math.min(9999, Math.round(quantidade))));
    mudou();
}

function mudou() {
    salvarPreferencia(CHAVE_SALVA, { quantidades: Object.fromEntries(quantidades), mostrarZerados });
    sincronizar();
    avisar();
}

function sincronizar() {
    // cada linha (sabor de um tamanho ou item de recheio)
    for (const linha of raiz.querySelectorAll('[data-chave]:not(.contador)')) {
        const q = quantidades.get(linha.dataset.chave);
        linha.classList.toggle('selecionado', q > 0);
        linha.querySelector('[data-acao="marcar"]').setAttribute('aria-pressed', String(q > 0));
        sincronizarContador(linha, q);
    }

    // total por tamanho
    for (const cartao of raiz.querySelectorAll('[data-tamanho]')) {
        const total = sabores.reduce((soma, s) => soma + quantidades.get(chaveBolo(cartao.dataset.tamanho, s.id)), 0);
        cartao.classList.toggle('selecionado', total > 0);
        cartao.querySelector('[data-campo="total"]').textContent = total ? total + ' no total' : '';
    }

    // contadores das abas
    const contagem = { bolos: 0, recheios: 0 };
    for (const [k, q] of quantidades) {
        if (q > 0) contagem[k.startsWith('r:') ? 'recheios' : 'bolos']++;
    }
    for (const [nome, n] of Object.entries(contagem)) {
        const badge = raiz.querySelector(`[data-badge="${nome}"]`);
        badge.textContent = n;
        badge.variant = n ? 'primary' : 'neutral';
    }
}
