// Relatório: Balanço de Estoque de bolos (por tamanho e sabor).
// Tamanhos: os mesmos do orçamento (data/bolos.json). Sabores: data/estoque.json.
import { ARQUIVOS_DADOS } from '../config.js';
import { carregarJSON, escaparHTML, lerPreferencia, salvarPreferencia } from '../util.js';
import { contador, sincronizarContador } from '../componentes.js';

const CHAVE_SALVA = 'relatorio-estoque';

let tamanhos = [];
let sabores = [];
let quantidades = new Map();   // "20:branco" -> quantidade
let mostrarZerados = false;
let raiz = null;
let avisar = () => {};

const chave = (tamanho, sabor) => tamanho + ':' + sabor;

export default {
    id: 'estoque',
    titulo: 'Balanço de Estoque',
    emoji: '📦',
    unidade: ['bolo', 'bolos'],

    async iniciar(container, aoMudar) {
        raiz = container;
        avisar = aoMudar;
        const [bolos, estoque] = await Promise.all([
            carregarJSON(ARQUIVOS_DADOS.bolos),
            carregarJSON(ARQUIVOS_DADOS.estoque)
        ]);
        tamanhos = bolos.bolos.map((b) => b.tamanho);
        sabores = estoque.sabores;

        // última contagem salva neste aparelho
        const salvo = lerPreferencia(CHAVE_SALVA, {});
        mostrarZerados = !!salvo.mostrarZerados;
        for (const t of tamanhos) {
            for (const s of sabores) quantidades.set(chave(t, s.id), +(salvo.quantidades?.[chave(t, s.id)]) || 0);
        }

        renderizar();
        ligarEventos();
        sincronizar();
    },

    total() {
        return [...quantidades.values()].reduce((soma, q) => soma + q, 0);
    },

    gerarTexto({ data, observacoes }) {
        let texto = '📦 *Balanço de Estoque*\n';
        texto += '📅 ' + data + '\n';

        for (const sabor of sabores) {
            const itens = tamanhos
                .map((t) => ({ tamanho: t, quantidade: quantidades.get(chave(t, sabor.id)) }))
                .filter((i) => mostrarZerados || i.quantidade > 0);
            const subtotal = itens.reduce((soma, i) => soma + i.quantidade, 0);

            texto += '\n' + sabor.emoji + ' *' + sabor.plural + '*';
            if (!subtotal && !mostrarZerados) {
                texto += ': sem estoque\n';
                continue;
            }
            texto += ' (' + subtotal + ')\n';
            for (const item of itens) {
                texto += '• ' + item.tamanho + ' cm: ' + item.quantidade + (item.quantidade ? '' : ' ⚠️') + '\n';
            }
        }

        const total = this.total();
        texto += '___________________\n';
        texto += '*Total em estoque: ' + total + (total === 1 ? ' bolo' : ' bolos') + '*\n';
        if (observacoes) texto += '📝 _' + observacoes + '_\n';
        return texto.trim();
    },

    limpar() {
        for (const k of quantidades.keys()) quantidades.set(k, 0);
        mudou();
    }
};

function renderizar() {
    raiz.innerHTML = `
      <div class="painel-sugestao">
        <div class="painel-sugestao__titulo">
          <sl-icon name="box-seam"></sl-icon>
          Contagem do estoque
          <small>marque cada bolo e ajuste a quantidade</small>
        </div>
        <sl-switch size="small" data-estoque="zerados" ${mostrarZerados ? 'checked' : ''}>
          Listar tamanhos zerados na mensagem
        </sl-switch>
      </div>
      <div class="grade grade--estoque">
        ${tamanhos.map((t) => `
          <article class="cartao-item cartao-estoque" data-tamanho="${t}">
            <div class="cartao-estoque__topo">
              <span class="cartao-item__tamanho">${t}<small>cm</small></span>
              <span class="cartao-estoque__total" data-campo="total"></span>
            </div>
            ${sabores.map((s) => `
              <div class="linha-sabor" data-sabor="${s.id}">
                <button type="button" class="linha-sabor__marcar" data-acao="marcar" aria-pressed="false">
                  <sl-icon name="check-circle-fill"></sl-icon>
                  <span>${s.emoji} ${escaparHTML(s.nome)}</span>
                </button>
                ${contador('estoque', chave(t, s.id))}
              </div>`).join('')}
          </article>`).join('')}
      </div>`;
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
            const linha = marcar.closest('.linha-sabor');
            const k = chave(linha.closest('[data-tamanho]').dataset.tamanho, linha.dataset.sabor);
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
    for (const cartao of raiz.querySelectorAll('[data-tamanho]')) {
        const t = cartao.dataset.tamanho;
        let totalTamanho = 0;
        for (const linha of cartao.querySelectorAll('.linha-sabor')) {
            const q = quantidades.get(chave(t, linha.dataset.sabor));
            totalTamanho += q;
            linha.classList.toggle('selecionado', q > 0);
            linha.querySelector('[data-acao="marcar"]').setAttribute('aria-pressed', String(q > 0));
            sincronizarContador(linha, q);
        }
        cartao.classList.toggle('selecionado', totalTamanho > 0);
        cartao.querySelector('[data-campo="total"]').textContent = totalTamanho ? totalTamanho + ' no total' : '';
    }
}
