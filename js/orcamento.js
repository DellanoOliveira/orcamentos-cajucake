// Monta o orçamento a partir do estado da tela. O resultado é usado para gerar
// o texto (WhatsApp), a imagem compartilhável e a busca de fotos reais.
import { TIPOS_BOLO } from './config.js';
import { formatarMoeda, formatarDataHora } from './util.js';

/**
 * @param {object} estado  { bolos: Map<tamanho,{tipo,quantidade}>, cortes: Map<tamanho,qtd>,
 *                           produtos: Map<id,qtd>, servicos: Map<descricao,{ativo,valor}> }
 * @param {object} dados   catálogo vindo da API (GET api/catalogo)
 */
export function montarOrcamento(estado, dados) {
    const grupos = [];
    let total = 0;
    let fatiasDecorados = 0;
    let fatiasCorte = 0;
    const andares = [];   // um item por bolo decorado (para o desenho e para as fotos)
    const cortes = [];    // { tamanho, quantidade }

    // Bolos decorados
    const itensBolos = [];
    for (const bolo of dados.bolos.bolos) {
        const selecao = estado.bolos.get(bolo.tamanho);
        if (!selecao || selecao.quantidade <= 0) continue;
        const info = bolo.tipos[selecao.tipo];
        if (!info) continue;

        const valorTotal = info.valor * selecao.quantidade;
        const fatias = info.fatias * selecao.quantidade;
        total += valorTotal;
        fatiasDecorados += fatias;
        itensBolos.push({
            emoji: bolo.emoji,
            quantidade: selecao.quantidade,
            descricao: 'Bolo ' + bolo.tamanho + ' cm (diâmetro) - ' + TIPOS_BOLO[selecao.tipo].descricao,
            descricaoCurta: 'Bolo ' + bolo.tamanho + ' cm · ' + TIPOS_BOLO[selecao.tipo].nome,
            valorTotal,
            fatias
        });
        for (let i = 0; i < selecao.quantidade; i++) {
            andares.push({ tamanho: bolo.tamanho, tipo: selecao.tipo });
        }
    }
    if (itensBolos.length) grupos.push({ id: 'bolos', titulo: 'Bolos', itens: itensBolos });

    // Bolos de corte
    const itensCorte = [];
    for (const bolo of dados.bolosCorte.bolos) {
        const quantidade = estado.cortes.get(bolo.tamanho) || 0;
        if (quantidade <= 0) continue;
        const valorTotal = bolo.valor * quantidade;
        const fatias = bolo.fatias * quantidade;
        total += valorTotal;
        fatiasCorte += fatias;
        itensCorte.push({
            emoji: dados.bolosCorte.emoji,
            quantidade,
            descricao: 'Bolo de Corte ' + bolo.tamanho + ' cm',
            descricaoCurta: 'Bolo de Corte ' + bolo.tamanho + ' cm',
            valorTotal,
            fatias
        });
        cortes.push({ tamanho: bolo.tamanho, quantidade });
    }
    if (itensCorte.length) grupos.push({ id: 'cortes', titulo: 'Bolos de Corte', itens: itensCorte });

    // Seções de produtos (cadastradas no banco: Doces & Salgados, Kits...)
    for (const secao of dados.secoesProdutos) {
        const itensProdutos = [];
        for (const produto of secao.produtos) {
            const quantidade = estado.produtos.get(produto.id) || 0;
            if (quantidade <= 0) continue;
            const valorTotal = produto.valor * quantidade;
            total += valorTotal;
            itensProdutos.push({
                emoji: produto.emoji,
                quantidade,
                descricao: produto.nome,
                descricaoCurta: produto.nome,
                valorTotal
            });
        }
        if (itensProdutos.length) grupos.push({ id: 'secao-' + secao.id, titulo: secao.nome, itens: itensProdutos });
    }

    // Serviços / adicionais
    const itensServicos = [];
    for (const servico of dados.servicos.servicos) {
        const selecao = estado.servicos.get(servico.descricao);
        if (!selecao?.ativo) continue;
        const valor = +selecao.valor || 0;
        const valorTotal = servico.desconto ? -valor : valor;
        total += valorTotal;
        itensServicos.push({
            emoji: servico.emoji,
            quantidade: null,
            descricao: 'Adicional ' + servico.descricao,
            descricaoCurta: servico.descricao,
            valorTotal,
            desconto: !!servico.desconto
        });
    }
    if (itensServicos.length) grupos.push({ id: 'servicos', titulo: 'Adicionais', itens: itensServicos });

    return {
        grupos,
        total,
        fatias: fatiasDecorados + fatiasCorte,
        fatiasDecorados,
        fatiasCorte,
        andares,
        cortes,
        vazio: grupos.length === 0,
        geradoEm: formatarDataHora()
    };
}

/** Texto no formato do WhatsApp (``` = monoespaçado, * = negrito). */
export function gerarTextoOrcamento(orcamento) {
    let texto = 'Segue seu orçamento 📋 :\n';

    for (const grupo of orcamento.grupos) {
        for (const item of grupo.itens) {
            const quantidade = item.quantidade ? item.quantidade + ' ' : '';
            const valor = item.desconto
                ? '- ' + formatarMoeda(Math.abs(item.valorTotal))
                : formatarMoeda(item.valorTotal);
            texto += item.emoji + ' ' + quantidade + item.descricao + ' - ```' + valor + '```\n';
        }
    }

    texto += '___________________\n';
    texto += '*Total: ' + formatarMoeda(orcamento.total) + '*\n';

    if (orcamento.fatias) {
        texto += 'Quantidade de Fatias: ' + orcamento.fatias + ' 🍰\n';
    }

    texto += '```Gerado em ' + orcamento.geradoEm + '```';
    return texto;
}
