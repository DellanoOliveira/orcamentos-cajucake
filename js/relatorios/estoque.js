// Relatório: Balanço de Estoque. Seções, itens e quantidades vêm do banco (api/estoque)
// e cada alteração é salva automaticamente. Seções e itens são cadastrados em admin.html.
//   modo "grade": itens (ex.: sabores) x tamanhos de bolo  -> cartões por tamanho
//   modo "lista": itens agrupados (ex.: Bases e Geleias)    -> linhas
import { escaparHTML, lerPreferencia, salvarPreferencia } from '../util.js';
import { contador, sincronizarContador, notificar } from '../componentes.js';
import { api } from '../api.js';

const ESPERA_SALVAR_MS = 700;

let dados = { tamanhos: [], secoes: [] };
let quantidades = new Map();   // "itemId:tamanho" (lista usa tamanho 0) -> quantidade
let pendentes = new Map();     // alterações ainda não enviadas ao servidor
let temporizador = null;
let salvando = false;
let mostrarZerados = lerPreferencia('estoqueZerados', false);
let raiz = null;
let avisar = () => {};

const chave = (itemId, tamanho = 0) => itemId + ':' + tamanho;

export default {
    id: 'estoque',
    titulo: 'Balanço de Estoque',
    emoji: '📦',

    async iniciar(container, aoMudar) {
        raiz = container;
        avisar = aoMudar;
        await carregar();
        renderizar();
        ligarEventos();
        sincronizar();

        // traz alterações feitas por outras pessoas ao voltar para a aba
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible' && !pendentes.size && !salvando) {
                await carregar();
                sincronizar();
                avisar();
            }
        });
        window.addEventListener('beforeunload', (evento) => {
            if (pendentes.size || salvando) evento.preventDefault();
        });
    },

    resumo() {
        return dados.secoes.map((s) => s.nome + ': ' + totalDaSecao(s)).join(' · ') || '—';
    },

    gerarTexto({ data, observacoes }) {
        let texto = '📦 *Balanço de Estoque*\n';
        texto += '📅 ' + data + '\n';

        for (const secao of dados.secoes) {
            texto += '\n' + secao.emoji + ' *' + secao.nome.toUpperCase() + '*\n';
            if (!secao.itens.length) {
                texto += 'sem itens cadastrados\n';
                continue;
            }
            if (secao.modo === 'grade') {
                for (const item of secao.itens) {
                    const linhas = dados.tamanhos.map((t) => ({ nome: '• ' + t + ' cm', quantidade: quantidades.get(chave(item.id, t)) || 0 }));
                    texto += bloco(item.emoji + ' *' + (item.plural || item.nome) + '*', linhas);
                }
            } else {
                for (const [grupo, itens] of agruparPorGrupo(secao.itens)) {
                    const linhas = itens.map((i) => ({ nome: i.emoji + ' ' + i.nome, quantidade: quantidades.get(chave(i.id)) || 0 }));
                    texto += bloco(grupo ? '*' + grupo + '*' : null, linhas);
                }
            }
        }

        texto += '___________________\n';
        texto += '*Total — ' + this.resumo() + '*\n';
        if (observacoes) texto += '📝 _' + observacoes + '_\n';
        return texto.trim();
    },

    limpar() {
        if (!confirm('Zerar TODAS as quantidades do estoque? Isso vale para toda a equipe.')) return;
        for (const [k, q] of quantidades) {
            if (q !== 0) definir(k, 0, false);
        }
        salvarAgora();
    }
};

async function carregar() {
    dados = await api('estoque');
    quantidades = new Map(Object.entries(dados.quantidades).map(([k, q]) => [k, +q]));
    for (const [k, q] of pendentes) quantidades.set(k, q);
}

/** Título + linhas "nome: qtd". Sem nada contado (e sem listar zerados) vira "sem estoque". */
function bloco(titulo, linhas) {
    const subtotal = linhas.reduce((soma, l) => soma + l.quantidade, 0);
    if (!subtotal && !mostrarZerados) {
        return (titulo ? titulo + ': ' : '') + 'sem estoque\n';
    }
    let texto = titulo ? titulo + ' (' + subtotal + ')\n' : '';
    for (const linha of linhas) {
        if (mostrarZerados || linha.quantidade > 0) {
            texto += linha.nome + ': ' + linha.quantidade + (linha.quantidade ? '' : ' ⚠️') + '\n';
        }
    }
    return texto;
}

function agruparPorGrupo(itens) {
    const grupos = new Map();
    for (const item of itens) {
        const grupo = item.grupo || '';
        if (!grupos.has(grupo)) grupos.set(grupo, []);
        grupos.get(grupo).push(item);
    }
    return grupos;
}

function chavesDaSecao(secao) {
    return secao.modo === 'grade'
        ? secao.itens.flatMap((i) => dados.tamanhos.map((t) => chave(i.id, t)))
        : secao.itens.map((i) => chave(i.id));
}

function totalDaSecao(secao) {
    return chavesDaSecao(secao).reduce((soma, k) => soma + (quantidades.get(k) || 0), 0);
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
          <small>marque cada item e ajuste a quantidade — salva automaticamente</small>
        </div>
        <div class="estoque-barra">
          <sl-switch size="small" data-estoque="zerados" ${mostrarZerados ? 'checked' : ''}>
            Listar itens zerados na mensagem
          </sl-switch>
          <span class="status-salvamento" data-campo="status"></span>
        </div>
      </div>

      ${dados.secoes.length ? `
      <sl-tab-group class="subabas">
        ${dados.secoes.map((s) => `
          <sl-tab slot="nav" panel="estoque-${s.id}">${s.emoji} ${escaparHTML(s.nome)}
            <sl-badge pill variant="neutral" data-badge="${s.id}">0</sl-badge></sl-tab>`).join('')}
        ${dados.secoes.map((s) => `
          <sl-tab-panel name="estoque-${s.id}">
            ${!s.itens.length ? '<p class="mensagem-suave">Nenhum item nesta seção. Cadastre em ⚙️ Cadastros.</p>'
                : s.modo === 'grade' ? renderizarGrade(s) : renderizarLista(s)}
          </sl-tab-panel>`).join('')}
      </sl-tab-group>` : '<p class="mensagem-suave">Nenhuma seção de estoque cadastrada. Cadastre em ⚙️ Cadastros.</p>'}`;
}

function linhaMarcavel(k, rotulo) {
    return `
      <button type="button" class="linha-sabor__marcar" data-acao="marcar" aria-pressed="false">
        <sl-icon name="check-circle-fill"></sl-icon>
        <span>${rotulo}</span>
      </button>
      ${contador('estoque', k)}`;
}

function renderizarGrade(secao) {
    return `
      <div class="grade grade--estoque">
        ${dados.tamanhos.map((t) => `
          <article class="cartao-item cartao-estoque" data-tamanho="${t}" data-secao="${secao.id}">
            <div class="cartao-estoque__topo">
              <span class="cartao-item__tamanho">${t}<small>cm</small></span>
              <span class="cartao-estoque__total" data-campo="total"></span>
            </div>
            ${secao.itens.map((item) => `
              <div class="linha-sabor" data-chave="${chave(item.id, t)}">
                ${linhaMarcavel(chave(item.id, t), item.emoji + ' ' + escaparHTML(item.nome))}
              </div>`).join('')}
          </article>`).join('')}
      </div>`;
}

function renderizarLista(secao) {
    return [...agruparPorGrupo(secao.itens)].map(([grupo, itens]) => `
      ${grupo ? `<h3 class="titulo-grupo">${escaparHTML(grupo)}</h3>` : ''}
      <div class="lista">
        ${itens.map((item) => `
          <div class="linha linha--estoque" data-chave="${chave(item.id)}">
            <span class="linha__emoji" aria-hidden="true">${item.emoji}</span>
            ${linhaMarcavel(chave(item.id), '<span class="linha__nome">' + escaparHTML(item.nome) + '</span>')}
          </div>`).join('')}
      </div>`).join('');
}

function ligarEventos() {
    raiz.addEventListener('click', (evento) => {
        const delta = evento.target.closest('.contador [data-delta]');
        if (delta) {
            const k = delta.closest('.contador').dataset.chave;
            definir(k, (quantidades.get(k) || 0) + +delta.dataset.delta);
            return;
        }
        const marcar = evento.target.closest('[data-acao="marcar"]');
        if (marcar) {
            const k = marcar.closest('[data-chave]').dataset.chave;
            definir(k, quantidades.get(k) > 0 ? 0 : 1);
        }
        if (evento.target.closest('[data-acao="tentar-novamente"]')) {
            salvarAgora();
        }
    });

    raiz.addEventListener('change', (evento) => {
        const input = evento.target.closest('.contador input');
        if (input) definir(input.closest('.contador').dataset.chave, parseInt(input.value, 10) || 0);
    });

    raiz.addEventListener('sl-change', (evento) => {
        if (evento.target.dataset.estoque === 'zerados') {
            mostrarZerados = evento.target.checked;
            salvarPreferencia('estoqueZerados', mostrarZerados);
            avisar();
        }
    });
}

function definir(k, quantidade, agendar = true) {
    const valor = Math.max(0, Math.min(99999, Math.round(quantidade)));
    quantidades.set(k, valor);
    pendentes.set(k, valor);
    sincronizar();
    avisar();
    if (agendar) {
        clearTimeout(temporizador);
        temporizador = setTimeout(salvarAgora, ESPERA_SALVAR_MS);
    }
}

// =====================================================================
// Salvamento
// =====================================================================

async function salvarAgora() {
    clearTimeout(temporizador);
    if (salvando || !pendentes.size) return;

    const lote = new Map(pendentes);
    pendentes.clear();
    salvando = true;
    mostrarStatus('salvando');
    try {
        const itens = [...lote].map(([k, quantidade]) => {
            const [itemId, tamanho] = k.split(':').map(Number);
            return { item_id: itemId, tamanho, quantidade };
        });
        const resposta = await api('estoque/quantidades', { metodo: 'POST', corpo: { itens } });
        dados.ultimaAtualizacao = { em: resposta.em, por: resposta.por };
        mostrarStatus('salvo');
    } catch (erro) {
        // devolve para a fila, sem sobrescrever alterações mais novas
        for (const [k, q] of lote) if (!pendentes.has(k)) pendentes.set(k, q);
        mostrarStatus('erro');
        notificar('Não foi possível salvar o estoque: ' + erro.message, 'danger', 'exclamation-octagon');
    } finally {
        salvando = false;
        if (pendentes.size && document.querySelector('[data-campo="status"]')?.dataset.estado !== 'erro') {
            salvarAgora();
        }
    }
}

function mostrarStatus(estadoAtual) {
    const campo = raiz.querySelector('[data-campo="status"]');
    if (!campo) return;
    campo.dataset.estado = estadoAtual;
    if (estadoAtual === 'salvando') {
        campo.innerHTML = '<sl-spinner></sl-spinner> Salvando…';
    } else if (estadoAtual === 'erro') {
        campo.innerHTML = '⚠️ Não salvo · <button type="button" class="link" data-acao="tentar-novamente">tentar novamente</button>';
    } else {
        campo.textContent = textoUltimaAtualizacao();
    }
}

function textoUltimaAtualizacao() {
    const ultima = dados.ultimaAtualizacao;
    if (!ultima) return '';
    const [dia, hora] = ultima.em.split(' ');
    const [ano, mes, d] = dia.split('-');
    return '☁️ Salvo · ' + d + '/' + mes + ' ' + hora.slice(0, 5) + (ultima.por ? ' por ' + ultima.por : '');
}

function sincronizar() {
    for (const linha of raiz.querySelectorAll('[data-chave]:not(.contador)')) {
        const q = quantidades.get(linha.dataset.chave) || 0;
        linha.classList.toggle('selecionado', q > 0);
        linha.querySelector('[data-acao="marcar"]').setAttribute('aria-pressed', String(q > 0));
        sincronizarContador(linha, q);
    }

    for (const cartao of raiz.querySelectorAll('[data-tamanho]')) {
        const secao = dados.secoes.find((s) => s.id === +cartao.dataset.secao);
        const total = secao.itens.reduce((soma, i) => soma + (quantidades.get(chave(i.id, cartao.dataset.tamanho)) || 0), 0);
        cartao.classList.toggle('selecionado', total > 0);
        cartao.querySelector('[data-campo="total"]').textContent = total ? total + ' no total' : '';
    }

    for (const secao of dados.secoes) {
        const marcados = chavesDaSecao(secao).filter((k) => quantidades.get(k) > 0).length;
        const badge = raiz.querySelector(`[data-badge="${secao.id}"]`);
        if (badge) {
            badge.textContent = marcados;
            badge.variant = marcados ? 'primary' : 'neutral';
        }
    }

    const status = raiz.querySelector('[data-campo="status"]');
    if (status && !status.dataset.estado) status.textContent = textoUltimaAtualizacao();
}
