// Editor genérico de cadastros: lista linhas editáveis com Salvar / Arquivar e um botão Adicionar.
// Fala com a API em api/admin/<entidade> (GET lista, POST cria, PUT edita, DELETE arquiva).
import { api } from '../api.js';
import { escaparHTML } from '../util.js';
import { notificar } from '../componentes.js';

/**
 * @param {HTMLElement} container
 * @param {object} config
 *   titulo, descricao, entidade
 *   campos: [{ nome, rotulo, tipo: 'texto'|'numero'|'decimal'|'cor'|'emoji'|'select'|'bool'|'senha',
 *              largura?, opcoes?: () => [{ valor, rotulo }], dica?, padrao?, fixoAoEditar? }]
 *   modo: 'tabela' (padrão) | 'cartoes' (muitos campos)
 *   filtro?: { campo, valor }       ex.: produtos de uma seção
 *   antesDeSalvar?: (dados) => dados
 *   aoSalvar?: () => void           avisa outras partes da tela (ex.: atualizar listas)
 */
export function criarEditor(container, config) {
    const modo = config.modo || 'tabela';
    const colunas = config.campos.map((c) => c.largura || 'minmax(120px, 1fr)').join(' ') + ' auto';
    let linhas = [];

    container.innerHTML = `
      <section class="editor editor--${modo}">
        <header class="editor__topo">
          <div>
            <h3>${config.titulo}</h3>
            ${config.descricao ? `<p>${config.descricao}</p>` : ''}
          </div>
          <sl-button size="small" variant="primary" outline data-acao="adicionar">
            <sl-icon slot="prefix" name="plus-lg"></sl-icon>Adicionar
          </sl-button>
        </header>
        <div class="editor__tabela">
          ${modo === 'tabela' ? `
            <div class="editor__linha editor__linha--cabecalho" style="grid-template-columns: ${colunas}">
              ${config.campos.map((c) => `<span>${c.rotulo}</span>`).join('')}<span></span>
            </div>` : ''}
          <div data-linhas><p class="mensagem-suave">Carregando…</p></div>
        </div>
      </section>`;

    const caixaLinhas = container.querySelector('[data-linhas]');

    function htmlCampo(campo, valor, existente) {
        // fixoAoEditar: o campo só pode ser preenchido na criação (ex.: códigos usados como referência)
        const nome = `name="${campo.nome}"` + (campo.fixoAoEditar && existente ? ' readonly' : '');
        const texto = valor === null || valor === undefined ? '' : String(valor);
        let entrada;
        switch (campo.tipo) {
            case 'bool':
                entrada = `<input type="checkbox" ${nome} ${valor ? 'checked' : ''}>`;
                break;
            case 'cor':
                entrada = `<input type="color" class="campo campo--cor" ${nome} value="${escaparHTML(texto || '#ffffff')}">`;
                break;
            case 'select': {
                const opcoes = campo.opcoes();
                entrada = `<select class="campo" ${nome}>${opcoes.map((o) =>
                    `<option value="${escaparHTML(String(o.valor))}" ${String(o.valor) === texto ? 'selected' : ''}>${escaparHTML(o.rotulo)}</option>`).join('')}</select>`;
                break;
            }
            case 'numero':
                entrada = `<input type="number" class="campo" ${nome} step="1" inputmode="numeric" value="${escaparHTML(texto)}">`;
                break;
            case 'decimal': {
                // 12.5 -> "12,50" (mantém mais casas quando houver, ex.: multiplicador 0,333)
                const numero = Number(texto);
                const formatado = texto === '' || Number.isNaN(numero) ? texto
                    : (Number.isInteger(Math.round(numero * 1000) / 10) ? numero.toFixed(2) : String(numero)).replace('.', ',');
                entrada = `<input type="text" class="campo" ${nome} inputmode="decimal" value="${escaparHTML(formatado)}">`;
                break;
            }
            case 'senha':
                entrada = `<input type="password" class="campo" ${nome} autocomplete="new-password" placeholder="${campo.dica || ''}">`;
                break;
            case 'emoji':
                entrada = `<input type="text" class="campo campo--emoji" ${nome} value="${escaparHTML(texto)}" maxlength="8" placeholder="${campo.dica || '🙂'}">`;
                break;
            default:
                entrada = `<input type="text" class="campo" ${nome} value="${escaparHTML(texto)}" placeholder="${escaparHTML(campo.dica || '')}">`;
        }
        return `<label class="editor__celula"><span class="editor__rotulo">${campo.rotulo}</span>${entrada}</label>`;
    }

    function htmlLinha(linha) {
        return `
          <form class="editor__linha" data-id="${linha.id ?? ''}" ${modo === 'tabela' ? `style="grid-template-columns: ${colunas}"` : ''}>
            ${config.campos.map((c) => htmlCampo(c, linha[c.nome], !!linha.id)).join('')}
            <div class="editor__acoes">
              <button type="submit" class="botao-icone botao-icone--salvar" title="Salvar" disabled>
                <sl-icon name="check-lg"></sl-icon>
              </button>
              <button type="button" class="botao-icone" data-acao="arquivar" title="${linha.id ? 'Arquivar' : 'Descartar'}">
                <sl-icon name="${linha.id ? 'trash' : 'x-lg'}"></sl-icon>
              </button>
            </div>
          </form>`;
    }

    function desenhar() {
        caixaLinhas.innerHTML = linhas.length
            ? linhas.map(htmlLinha).join('')
            : '<p class="mensagem-suave">Nenhum cadastro ainda. Clique em Adicionar.</p>';
    }

    function lerFormulario(form) {
        const dados = {};
        for (const campo of config.campos) {
            const entrada = form.elements[campo.nome];
            dados[campo.nome] = campo.tipo === 'bool' ? entrada.checked : entrada.value;
        }
        if (config.filtro) dados[config.filtro.campo] = config.filtro.valor;
        return config.antesDeSalvar ? config.antesDeSalvar(dados) : dados;
    }

    async function salvar(form) {
        const id = form.dataset.id;
        const botao = form.querySelector('.botao-icone--salvar');
        botao.disabled = true;
        try {
            const dados = lerFormulario(form);
            const salvo = await api('admin/' + config.entidade + (id ? '/' + id : ''), {
                metodo: id ? 'PUT' : 'POST',
                corpo: dados
            });
            const indice = linhas.findIndex((l) => String(l.id ?? '') === id && (id || l === form._linha));
            linhas[indice >= 0 ? indice : linhas.length] = salvo;
            form.outerHTML = htmlLinha(salvo);
            notificar('Salvo!', 'success', 'check2-circle');
            config.aoSalvar?.();
        } catch (erro) {
            botao.disabled = false;
            notificar(erro.message, 'danger', 'exclamation-octagon');
        }
    }

    async function arquivar(form) {
        const id = form.dataset.id;
        if (!id) {
            linhas = linhas.filter((l) => l !== form._linha);
            form.remove();
            return;
        }
        const nome = form.elements[config.campos[0].nome].value;
        if (!confirm(`Remover "${nome}"? Ele deixa de aparecer, mas o histórico é mantido.`)) return;
        try {
            await api('admin/' + config.entidade + '/' + id, { metodo: 'DELETE' });
            linhas = linhas.filter((l) => String(l.id) !== id);
            form.remove();
            if (!linhas.length) desenhar();
            notificar('Removido.', 'success', 'trash');
            config.aoSalvar?.();
        } catch (erro) {
            notificar(erro.message, 'danger', 'exclamation-octagon');
        }
    }

    // qualquer alteração habilita o botão Salvar da linha
    const marcarAlterada = (evento) => {
        const form = evento.target.closest('form.editor__linha');
        if (form) {
            form.classList.add('alterada');
            form.querySelector('.botao-icone--salvar').disabled = false;
        }
    };
    container.addEventListener('input', marcarAlterada);
    container.addEventListener('change', marcarAlterada);
    container.addEventListener('submit', (evento) => {
        evento.preventDefault();
        salvar(evento.target);
    });
    container.addEventListener('click', (evento) => {
        if (evento.target.closest('[data-acao="adicionar"]')) {
            const nova = Object.fromEntries(config.campos.map((c) => [c.nome, c.padrao ?? (c.tipo === 'bool' ? false : '')]));
            if (!linhas.length) caixaLinhas.innerHTML = '';
            linhas.push(nova);
            caixaLinhas.insertAdjacentHTML('beforeend', htmlLinha(nova));
            const form = caixaLinhas.lastElementChild;
            form._linha = nova;
            form.classList.add('alterada', 'nova');
            form.querySelector('.botao-icone--salvar').disabled = false;
            form.querySelector('input, select')?.focus();
        }
        const botaoArquivar = evento.target.closest('[data-acao="arquivar"]');
        if (botaoArquivar) arquivar(botaoArquivar.closest('form'));
    });

    async function recarregar(valorFiltro) {
        if (config.filtro && valorFiltro !== undefined) config.filtro.valor = valorFiltro;
        if (config.filtro && !config.filtro.valor) {
            linhas = [];
            caixaLinhas.innerHTML = '<p class="mensagem-suave">Cadastre e selecione uma seção primeiro.</p>';
            return;
        }
        const consulta = config.filtro ? '?' + config.filtro.campo + '=' + config.filtro.valor : '';
        try {
            linhas = await api('admin/' + config.entidade + consulta);
            desenhar();
        } catch (erro) {
            caixaLinhas.innerHTML = `<p class="mensagem-suave">Erro: ${escaparHTML(erro.message)}</p>`;
        }
    }

    return { recarregar, linhas: () => linhas };
}
