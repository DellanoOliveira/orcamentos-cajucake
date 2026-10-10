// Ponto de entrada: carrega os dados, desenha a tela e mantém o estado do orçamento.
import { ARQUIVOS_DADOS, TIPOS_BOLO, TIPO_PADRAO, ESTRATEGIAS } from './config.js';
import { carregarJSON, formatarMoeda, escaparHTML, carimboArquivo, lerPreferencia, salvarPreferencia } from './util.js';
import { montarOrcamento, gerarTextoOrcamento } from './orcamento.js';
import { sugerirArranjosGulosos, sugerirBolosDeCorte } from './sugestao.js';
import { desenharNoCanvas } from './desenho-bolo.js';
import { carregarFotosReais, buscarFotosReais } from './fotos-reais.js';
import { gerarImagemOrcamento } from './imagem-orcamento.js';

const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];

const dados = {};
const estado = {
    bolos: new Map(),      // tamanho -> { tipo, quantidade }
    cortes: new Map(),     // tamanho -> quantidade
    produtos: new Map(),   // nome -> quantidade
    servicos: new Map(),   // descricao -> { ativo, valor }
    fatiasDesejadas: 0,
    tipoSugestao: TIPO_PADRAO,
    incluirFoto: lerPreferencia('incluirFoto', true),
    fotoEscolhida: null
};

let orcamentoAtual = null;
let sugestoesBolos = [];
let sugestoesCorte = [];
let fotosAtuais = [];
let assinaturaFotos = '';
let imagemGerada = null;   // { blob, url, nome }

iniciar().catch((erro) => {
    console.error(erro);
    notificar('Erro ao carregar os dados: ' + erro.message, 'danger', 'exclamation-octagon');
});

async function iniciar() {
    const [bolos, bolosCorte, outrosProdutos, servicos] = await Promise.all([
        carregarJSON(ARQUIVOS_DADOS.bolos),
        carregarJSON(ARQUIVOS_DADOS.bolosCorte),
        carregarJSON(ARQUIVOS_DADOS.outrosProdutos),
        carregarJSON(ARQUIVOS_DADOS.servicos)
    ]);
    Object.assign(dados, { bolos, bolosCorte, outrosProdutos, servicos });
    adicionarTiposDerivados(bolos);
    await carregarFotosReais(ARQUIVOS_DADOS.fotosReais);

    zerarEstado();
    renderizarBolos();
    renderizarCortes();
    renderizarProdutos();
    renderizarServicos();
    renderizarTiposSugestao();
    $('#incluir-foto').toggleAttribute('checked', estado.incluirFoto);

    ligarEventos();
    atualizar();
    new ResizeObserver(desenharPreview).observe($('#preview-bolo'));
    document.fonts?.ready.then(desenharPreview);
}

/** Cria os tipos com "derivado" em config.js (ex.: Fake 5cm = 50% do Fake) em cada tamanho. */
function adicionarTiposDerivados(dadosBolos) {
    for (const [nome, tipo] of Object.entries(TIPOS_BOLO)) {
        if (!tipo.derivado) continue;
        for (const bolo of dadosBolos.bolos) {
            const origem = bolo.tipos[tipo.derivado.de];
            if (!origem || bolo.tipos[nome]) continue;
            bolo.tipos[nome] = {
                valor: Math.round(origem.valor * tipo.derivado.fatorPreco * 100) / 100,
                fatias: origem.fatias
            };
        }
    }
}

function zerarEstado() {
    for (const bolo of dados.bolos.bolos) {
        const tipo = bolo.tipos[TIPO_PADRAO] ? TIPO_PADRAO : Object.keys(bolo.tipos)[0];
        estado.bolos.set(bolo.tamanho, { tipo, quantidade: 0 });
    }
    for (const corte of dados.bolosCorte.bolos) estado.cortes.set(corte.tamanho, 0);
    for (const produto of dados.outrosProdutos.produtos) estado.produtos.set(produto.nome, 0);
    for (const servico of dados.servicos.servicos) {
        estado.servicos.set(servico.descricao, { ativo: false, valor: servico.valor });
    }
}

// =====================================================================
// Renderização inicial
// =====================================================================

function contador(alvo, chave, passo = 1) {
    return `
      <div class="contador" data-alvo="${alvo}" data-chave="${chave}" data-passo="${passo}">
        <button type="button" data-delta="-1" aria-label="Diminuir">−</button>
        <input type="number" min="0" inputmode="numeric" value="0" aria-label="Quantidade">
        <button type="button" data-delta="1" aria-label="Aumentar">+</button>
      </div>`;
}

function renderizarBolos() {
    $('#grade-bolos').innerHTML = dados.bolos.bolos.map((bolo) => `
      <article class="cartao-item" data-bolo="${bolo.tamanho}">
        <button type="button" class="cartao-item__alternar" data-acao="alternar-bolo" aria-pressed="false">
          <span class="cartao-item__tamanho">${bolo.tamanho}<small>cm</small></span>
          <span class="cartao-item__info">
            <span data-campo="fatias"></span>
            <strong data-campo="preco"></strong>
          </span>
          <sl-icon name="check-circle-fill" class="cartao-item__check"></sl-icon>
        </button>
        <div class="tipos" role="radiogroup" aria-label="Tipo do bolo de ${bolo.tamanho} cm">
          ${Object.keys(TIPOS_BOLO).filter((tipo) => bolo.tipos[tipo]).map((tipo) => `
            <button type="button" class="chip-tipo" role="radio" data-tipo="${tipo}" aria-checked="false"
              title="${TIPOS_BOLO[tipo].nome}">${TIPOS_BOLO[tipo].curto}</button>`).join('')}
        </div>
        ${contador('bolo', bolo.tamanho)}
      </article>`).join('');
}

function renderizarCortes() {
    $('#grade-cortes').innerHTML = dados.bolosCorte.bolos.map((corte) => `
      <article class="cartao-item" data-corte="${corte.tamanho}">
        <button type="button" class="cartao-item__alternar" data-acao="alternar-corte" aria-pressed="false">
          <span class="cartao-item__tamanho">${corte.tamanho}<small>cm</small></span>
          <span class="cartao-item__info">
            <span>${corte.fatias} fatias</span>
            <strong>${formatarMoeda(corte.valor)}</strong>
          </span>
          <sl-icon name="check-circle-fill" class="cartao-item__check"></sl-icon>
        </button>
        ${contador('corte', corte.tamanho)}
      </article>`).join('');
}

function renderizarProdutos() {
    $('#lista-produtos').innerHTML = dados.outrosProdutos.produtos.map((produto, indice) => `
      <div class="linha" data-produto="${indice}">
        <span class="linha__emoji" aria-hidden="true">${produto.emoji}</span>
        <span class="linha__nome">${escaparHTML(produto.nome)}<small>${formatarMoeda(produto.valor)} / un.</small></span>
        <span class="linha__subtotal" data-campo="subtotal"></span>
        ${contador('produto', indice, produto.passo || 1)}
      </div>`).join('');
}

function renderizarServicos() {
    $('#lista-servicos').innerHTML = dados.servicos.servicos.map((servico, indice) => `
      <div class="linha linha--servico" data-servico="${indice}">
        <sl-switch data-servico-ativo="${indice}" aria-label="${escaparHTML(servico.descricao)}"></sl-switch>
        <span class="linha__emoji" aria-hidden="true">${servico.emoji}</span>
        <span class="linha__nome">${escaparHTML(servico.descricao)}${servico.desconto ? '<small>subtraído do total</small>' : ''}</span>
        <sl-input type="number" size="small" min="0" step="0.01" inputmode="decimal"
          value="${servico.valor}" data-servico-valor="${indice}">
          <span slot="prefix">R$</span>
        </sl-input>
      </div>`).join('');
}

function renderizarTiposSugestao() {
    const tiposComFatias = Object.keys(TIPOS_BOLO).filter((tipo) =>
        dados.bolos.bolos.some((bolo) => bolo.tipos[tipo]?.fatias > 0));
    const select = $('#tipo-sugestao');
    select.innerHTML = tiposComFatias
        .map((tipo) => `<sl-option value="${tipo}">${TIPOS_BOLO[tipo].nome}</sl-option>`).join('');
    select.setAttribute('value', estado.tipoSugestao);
}

// =====================================================================
// Eventos
// =====================================================================

function ligarEventos() {
    document.addEventListener('click', aoClicar);

    document.addEventListener('change', (evento) => {
        const input = evento.target.closest('.contador input');
        if (input) {
            const caixa = input.closest('.contador');
            definirQuantidade(caixa.dataset.alvo, caixa.dataset.chave, parseInt(input.value, 10) || 0);
        }
    });

    // serviços
    document.addEventListener('sl-change', (evento) => {
        const indice = evento.target.dataset?.servicoAtivo;
        if (indice === undefined) return;
        const servico = dados.servicos.servicos[indice];
        estado.servicos.get(servico.descricao).ativo = evento.target.checked;
        atualizar();
    });
    document.addEventListener('sl-input', (evento) => {
        const indice = evento.target.dataset?.servicoValor;
        if (indice === undefined) return;
        const servico = dados.servicos.servicos[indice];
        const selecao = estado.servicos.get(servico.descricao);
        selecao.valor = parseFloat(evento.target.value) || 0;
        if (selecao.valor > 0) selecao.ativo = true; // digitar um valor já marca o adicional
        atualizar();
    });

    // fatias desejadas (campo repetido nas abas Bolos e Bolos de Corte)
    for (const id of ['#fatias-desejadas', '#fatias-desejadas-corte']) {
        const campo = $(id);
        const aoMudar = () => {
            estado.fatiasDesejadas = Math.max(0, parseInt(campo.value, 10) || 0);
            for (const outro of ['#fatias-desejadas', '#fatias-desejadas-corte']) {
                if (outro !== id) $(outro).value = estado.fatiasDesejadas || '';
            }
            atualizarSugestoesBolos();
            atualizar();
        };
        campo.addEventListener('sl-input', aoMudar);
        campo.addEventListener('sl-clear', aoMudar);
    }

    $('#tipo-sugestao').addEventListener('sl-change', (evento) => {
        estado.tipoSugestao = evento.target.value || TIPO_PADRAO;
        atualizarSugestoesBolos();
        atualizar();
    });

    $('#incluir-foto').addEventListener('sl-change', (evento) => {
        estado.incluirFoto = evento.target.checked;
        salvarPreferencia('incluirFoto', estado.incluirFoto);
    });

    $('#btn-copiar').addEventListener('click', copiarTexto);
    $('#btn-imagem').addEventListener('click', gerarImagem);
    $('#btn-baixar').addEventListener('click', baixarImagem);
    $('#btn-compartilhar').addEventListener('click', compartilharImagem);
    $('#btn-limpar').addEventListener('click', limpar);
    $('#btn-ver-orcamento').addEventListener('click', () => $('#resumo').scrollIntoView({ behavior: 'smooth' }));
}

function aoClicar(evento) {
    const alvo = evento.target;

    const botaoDelta = alvo.closest('.contador [data-delta]');
    if (botaoDelta) {
        const caixa = botaoDelta.closest('.contador');
        const atual = lerQuantidade(caixa.dataset.alvo, caixa.dataset.chave);
        definirQuantidade(caixa.dataset.alvo, caixa.dataset.chave, atual + (+botaoDelta.dataset.delta) * (+caixa.dataset.passo || 1));
        return;
    }

    const alternarBolo = alvo.closest('[data-acao="alternar-bolo"]');
    if (alternarBolo) {
        const tamanho = +alternarBolo.closest('[data-bolo]').dataset.bolo;
        const selecao = estado.bolos.get(tamanho);
        selecao.quantidade = selecao.quantidade > 0 ? 0 : 1;
        atualizar();
        return;
    }

    const chipTipo = alvo.closest('.chip-tipo');
    if (chipTipo) {
        const tamanho = +chipTipo.closest('[data-bolo]').dataset.bolo;
        const selecao = estado.bolos.get(tamanho);
        selecao.tipo = chipTipo.dataset.tipo;
        if (!selecao.quantidade) selecao.quantidade = 1;
        atualizar();
        return;
    }

    const alternarCorte = alvo.closest('[data-acao="alternar-corte"]');
    if (alternarCorte) {
        const tamanho = +alternarCorte.closest('[data-corte]').dataset.corte;
        estado.cortes.set(tamanho, estado.cortes.get(tamanho) > 0 ? 0 : 1);
        atualizar();
        return;
    }

    const chipSugestao = alvo.closest('[data-sugestao]');
    if (chipSugestao) {
        aplicarSugestaoBolos(sugestoesBolos[+chipSugestao.dataset.sugestao]);
        return;
    }

    const chipCorte = alvo.closest('[data-sugestao-corte]');
    if (chipCorte) {
        aplicarSugestaoCorte(sugestoesCorte[+chipCorte.dataset.sugestaoCorte]);
        return;
    }

    const miniatura = alvo.closest('[data-foto]');
    if (miniatura) {
        estado.fotoEscolhida = fotosAtuais[+miniatura.dataset.foto];
        atualizarFotos(true);
    }
}

function lerQuantidade(alvo, chave) {
    if (alvo === 'bolo') return estado.bolos.get(+chave).quantidade;
    if (alvo === 'corte') return estado.cortes.get(+chave);
    return estado.produtos.get(dados.outrosProdutos.produtos[+chave].nome);
}

function definirQuantidade(alvo, chave, quantidade) {
    const valor = Math.max(0, Math.min(9999, Math.round(quantidade)));
    if (alvo === 'bolo') estado.bolos.get(+chave).quantidade = valor;
    else if (alvo === 'corte') estado.cortes.set(+chave, valor);
    else estado.produtos.set(dados.outrosProdutos.produtos[+chave].nome, valor);
    atualizar();
}

// =====================================================================
// Sugestões
// =====================================================================

function atualizarSugestoesBolos() {
    const caixa = $('#sugestoes');
    if (!estado.fatiasDesejadas) {
        sugestoesBolos = [];
        caixa.innerHTML = '';
        return;
    }
    sugestoesBolos = sugerirArranjosGulosos(estado.fatiasDesejadas, estado.tipoSugestao, dados.bolos, 6);
    if (!sugestoesBolos.length) {
        caixa.innerHTML = '<p class="mensagem-suave">Nenhuma combinação encontrada para esse tipo.</p>';
        return;
    }
    caixa.innerHTML = sugestoesBolos.map((sugestao, indice) => {
        const valor = sugestao.tamanhos.reduce((soma, tamanho) =>
            soma + dados.bolos.bolos.find((b) => b.tamanho === tamanho).tipos[sugestao.tipoBolo].valor, 0);
        return `
          <button type="button" class="chip-sugestao" data-sugestao="${indice}" aria-pressed="false">
            <strong>${sugestao.tamanhos.join(' + ')} cm</strong>
            <span>${sugestao.totalFatias} fatias · ${formatarMoeda(valor)}</span>
            <span>${ESTRATEGIAS[sugestao.estrategia] || sugestao.estrategia}</span>
          </button>`;
    }).join('');
}

function aplicarSugestaoBolos(sugestao) {
    if (!sugestao) return;
    for (const selecao of estado.bolos.values()) selecao.quantidade = 0;
    for (const tamanho of sugestao.tamanhos) {
        const selecao = estado.bolos.get(tamanho);
        selecao.tipo = sugestao.tipoBolo;
        selecao.quantidade = 1;
    }
    atualizar();
}

function aplicarSugestaoCorte(sugestao) {
    if (!sugestao) return;
    for (const tamanho of estado.cortes.keys()) estado.cortes.set(tamanho, 0);
    for (const item of sugestao.itens) estado.cortes.set(item.tamanho, item.quantidade);
    atualizar();
}

function assinaturaBolos() {
    return [...estado.bolos.entries()]
        .filter(([, s]) => s.quantidade > 0)
        .map(([tamanho, s]) => tamanho + ':' + s.tipo + ':' + s.quantidade)
        .sort().join('|');
}

function assinaturaCortes(itens) {
    return itens.filter((i) => i.quantidade > 0).map((i) => i.tamanho + 'x' + i.quantidade).sort().join('|');
}

function sincronizarSugestoes(orcamento) {
    // marca a sugestão de bolos que corresponde à seleção atual
    const atual = assinaturaBolos();
    $$('[data-sugestao]').forEach((chip) => {
        const s = sugestoesBolos[+chip.dataset.sugestao];
        const chave = s.tamanhos.map((t) => t + ':' + s.tipoBolo + ':1').sort().join('|');
        chip.setAttribute('aria-pressed', String(chave === atual));
    });

    // placar e sugestões de bolos de corte
    const placar = $('#placar-fatias');
    const caixa = $('#sugestoes-corte');
    if (!estado.fatiasDesejadas) {
        placar.innerHTML = '<span>Informe as fatias desejadas para receber sugestões</span>';
        sugestoesCorte = [];
        caixa.innerHTML = '';
        return;
    }

    const faltam = estado.fatiasDesejadas - orcamento.fatiasDecorados;
    const faltamComCorte = faltam - orcamento.fatiasCorte;
    placar.innerHTML = `
      <span>🎂 Decorado: ${orcamento.fatiasDecorados}</span>
      <span>🍰 Corte: ${orcamento.fatiasCorte}</span>
      ${faltamComCorte > 0
            ? `<span class="placar__falta">Faltam ${faltamComCorte}</span>`
            : `<span class="placar__ok">✓ ${orcamento.fatias} de ${estado.fatiasDesejadas}${faltamComCorte < 0 ? ' (sobram ' + -faltamComCorte + ')' : ''}</span>`}`;

    if (faltam <= 0) {
        sugestoesCorte = [];
        caixa.innerHTML = '<p class="mensagem-suave">O bolo decorado já atende às fatias desejadas 🎉</p>';
        return;
    }

    sugestoesCorte = sugerirBolosDeCorte(faltam, dados.bolosCorte.bolos);
    const cortesAtuais = assinaturaCortes([...estado.cortes.entries()].map(([tamanho, quantidade]) => ({ tamanho, quantidade })));
    caixa.innerHTML = `<p class="mensagem-suave">Completar ${faltam} fatias com bolos de corte:</p>`
        + sugestoesCorte.map((sugestao, indice) => `
          <button type="button" class="chip-sugestao" data-sugestao-corte="${indice}"
            aria-pressed="${assinaturaCortes(sugestao.itens) === cortesAtuais}">
            <strong>${sugestao.itens.map((i) => (i.quantidade > 1 ? i.quantidade + '× ' : '') + i.tamanho + ' cm').join(' + ')}</strong>
            <span>${sugestao.totalFatias} fatias · ${formatarMoeda(sugestao.valor)}</span>
            <span>${sugestao.criterio}</span>
          </button>`).join('');
}

// =====================================================================
// Atualização da tela
// =====================================================================

function atualizar() {
    orcamentoAtual = montarOrcamento(estado, dados);
    const orcamento = orcamentoAtual;

    sincronizarBolos();
    sincronizarCortes();
    sincronizarProdutos();
    sincronizarServicos();
    sincronizarSugestoes(orcamento);

    const contagem = {
        bolos: [...estado.bolos.values()].filter((s) => s.quantidade > 0).length,
        cortes: [...estado.cortes.values()].filter((q) => q > 0).length,
        produtos: [...estado.produtos.values()].filter((q) => q > 0).length,
        servicos: [...estado.servicos.values()].filter((s) => s.ativo).length
    };
    for (const [nome, quantidade] of Object.entries(contagem)) {
        const badge = $('#badge-' + nome);
        badge.textContent = quantidade;
        badge.variant = quantidade ? 'primary' : 'neutral';
    }

    $('#total').textContent = formatarMoeda(orcamento.total);
    $('#total-mobile').textContent = formatarMoeda(orcamento.total);
    $('#resumo-fatias').textContent = orcamento.fatias
        ? '🍰 ' + orcamento.fatias + ' fatias'
          + (orcamento.fatiasCorte && orcamento.fatiasDecorados
              ? ' (' + orcamento.fatiasDecorados + ' decorado + ' + orcamento.fatiasCorte + ' corte)' : '')
        : '';
    $('#texto-orcamento').value = gerarTextoOrcamento(orcamento);

    desenharPreview();
    atualizarFotos();
}

function sincronizarContador(raiz, quantidade) {
    const input = $('.contador input', raiz);
    if (document.activeElement !== input || +input.value !== quantidade) input.value = quantidade;
}

function sincronizarBolos() {
    for (const bolo of dados.bolos.bolos) {
        const cartao = $(`[data-bolo="${bolo.tamanho}"]`);
        const selecao = estado.bolos.get(bolo.tamanho);
        const info = bolo.tipos[selecao.tipo];
        const ativo = selecao.quantidade > 0;
        cartao.classList.toggle('selecionado', ativo);
        $('.cartao-item__alternar', cartao).setAttribute('aria-pressed', String(ativo));
        $('[data-campo="fatias"]', cartao).textContent = info.fatias ? info.fatias + ' fatias' : 'cenográfico';
        $('[data-campo="preco"]', cartao).textContent = formatarMoeda(info.valor);
        $$('.chip-tipo', cartao).forEach((chip) =>
            chip.setAttribute('aria-checked', String(chip.dataset.tipo === selecao.tipo)));
        sincronizarContador(cartao, selecao.quantidade);
    }
}

function sincronizarCortes() {
    for (const corte of dados.bolosCorte.bolos) {
        const cartao = $(`[data-corte="${corte.tamanho}"]`);
        const quantidade = estado.cortes.get(corte.tamanho);
        cartao.classList.toggle('selecionado', quantidade > 0);
        $('.cartao-item__alternar', cartao).setAttribute('aria-pressed', String(quantidade > 0));
        sincronizarContador(cartao, quantidade);
    }
}

function sincronizarProdutos() {
    dados.outrosProdutos.produtos.forEach((produto, indice) => {
        const linha = $(`[data-produto="${indice}"]`);
        const quantidade = estado.produtos.get(produto.nome);
        linha.classList.toggle('selecionado', quantidade > 0);
        $('[data-campo="subtotal"]', linha).textContent = quantidade ? formatarMoeda(quantidade * produto.valor) : '';
        sincronizarContador(linha, quantidade);
    });
}

function sincronizarServicos() {
    dados.servicos.servicos.forEach((servico, indice) => {
        const selecao = estado.servicos.get(servico.descricao);
        $(`[data-servico="${indice}"]`).classList.toggle('selecionado', selecao.ativo);
        const chave = $(`[data-servico-ativo="${indice}"]`);
        if (chave.checked !== selecao.ativo) chave.checked = selecao.ativo;
        const campo = $(`[data-servico-valor="${indice}"]`);
        if (document.activeElement !== campo && +campo.value !== selecao.valor) campo.value = String(selecao.valor);
    });
}

function desenharPreview() {
    if (!orcamentoAtual) return;
    desenharNoCanvas($('#preview-bolo'), { andares: orcamentoAtual.andares, cortes: orcamentoAtual.cortes });
}

function atualizarFotos(forcar = false) {
    const bloco = $('#foto-real');
    fotosAtuais = buscarFotosReais({ andares: orcamentoAtual.andares, cortes: orcamentoAtual.cortes });

    if (!fotosAtuais.length) {
        bloco.hidden = true;
        estado.fotoEscolhida = null;
        assinaturaFotos = '';
        return;
    }
    if (!fotosAtuais.some((f) => f.src === estado.fotoEscolhida?.src)) {
        estado.fotoEscolhida = fotosAtuais[0];
    }

    const assinatura = fotosAtuais.map((f) => f.src).join('|') + '#' + estado.fotoEscolhida.src;
    if (!forcar && assinatura === assinaturaFotos) return;
    assinaturaFotos = assinatura;

    const foto = estado.fotoEscolhida;
    bloco.hidden = false;
    bloco.innerHTML = `
      <div class="foto-real__titulo">
        <span>📷 Foto real de referência</span>
        <sl-badge pill variant="${foto.exata ? 'success' : 'warning'}">${foto.exata ? 'Mesmo tamanho' : 'Semelhante'}</sl-badge>
      </div>
      <div class="foto-real__principal">
        <img src="${escaparHTML(foto.src)}" alt="${escaparHTML(foto.descricao)}">
      </div>
      <div class="foto-real__legenda">
        ${escaparHTML(foto.legenda || foto.descricao)}${foto.placeholder ? ' · <em>imagem provisória</em>' : ''}
      </div>
      ${fotosAtuais.length > 1 ? `
        <div class="foto-real__miniaturas">
          ${fotosAtuais.map((f, i) => `
            <button type="button" data-foto="${i}" aria-pressed="${f.src === foto.src}" title="${escaparHTML(f.descricao)}">
              <img src="${escaparHTML(f.src)}" alt="" loading="lazy">
            </button>`).join('')}
        </div>` : ''}`;
}

// =====================================================================
// Ações
// =====================================================================

async function copiarTexto() {
    const texto = $('#texto-orcamento').value;
    try {
        await navigator.clipboard.writeText(texto);
    } catch (e) {
        // navegadores antigos / http sem HTTPS
        const area = document.createElement('textarea');
        area.value = texto;
        document.body.append(area);
        area.select();
        document.execCommand('copy');
        area.remove();
    }
    notificar('Texto copiado! É só colar no WhatsApp.', 'success', 'clipboard-check');
}

async function gerarImagem() {
    if (orcamentoAtual.vazio) {
        notificar('Adicione itens ao orçamento antes de gerar a imagem.', 'warning', 'exclamation-triangle');
        return;
    }
    const botao = $('#btn-imagem');
    botao.loading = true;
    try {
        const foto = estado.incluirFoto ? estado.fotoEscolhida : null;
        const blob = await gerarImagemOrcamento(orcamentoAtual, { foto });
        if (imagemGerada) URL.revokeObjectURL(imagemGerada.url);
        imagemGerada = { blob, url: URL.createObjectURL(blob), nome: 'orcamento-' + carimboArquivo() + '.png' };
        $('#imagem-gerada').src = imagemGerada.url;
        $('#btn-compartilhar').hidden = !podeCompartilhar();
        $('#dialogo-imagem').show();
    } catch (erro) {
        console.error(erro);
        notificar('Não foi possível gerar a imagem.', 'danger', 'exclamation-octagon');
    } finally {
        botao.loading = false;
    }
}

function arquivoDaImagem() {
    return new File([imagemGerada.blob], imagemGerada.nome, { type: 'image/png' });
}

function podeCompartilhar() {
    try {
        return !!navigator.canShare && navigator.canShare({ files: [arquivoDaImagem()] });
    } catch (e) {
        return false;
    }
}

function baixarImagem() {
    if (!imagemGerada) return;
    const link = document.createElement('a');
    link.href = imagemGerada.url;
    link.download = imagemGerada.nome;
    document.body.append(link);
    link.click();
    link.remove();
}

async function compartilharImagem() {
    if (!imagemGerada) return;
    try {
        await navigator.share({ files: [arquivoDaImagem()], title: 'Orçamento' });
    } catch (erro) {
        if (erro.name !== 'AbortError') {
            notificar('Compartilhamento indisponível. Use "Baixar".', 'warning', 'exclamation-triangle');
        }
    }
}

function limpar() {
    zerarEstado();
    estado.fatiasDesejadas = 0;
    $('#fatias-desejadas').value = '';
    $('#fatias-desejadas-corte').value = '';
    atualizarSugestoesBolos();
    atualizar();
}

function notificar(mensagem, variante = 'primary', icone = 'info-circle') {
    const alerta = document.createElement('sl-alert');
    alerta.setAttribute('variant', variante);
    alerta.setAttribute('closable', '');
    alerta.setAttribute('duration', '3500');
    alerta.innerHTML = `<sl-icon slot="icon" name="${icone}"></sl-icon>${escaparHTML(mensagem)}`;
    document.body.append(alerta);
    customElements.whenDefined('sl-alert').then(() => alerta.toast());
}
