// Gera a imagem (PNG) do orçamento pronta para compartilhar no celular:
// cabeçalho + desenho do bolo (+ foto real opcional) + itens + total.
import { MARCA } from './config.js';
import { desenharComposicao, arredondado } from './desenho-bolo.js';
import { formatarMoeda, carregarImagem } from './util.js';

const LARGURA = 1080;
const MARGEM = 64;
const FONTE_TEXTO = '"Nunito", "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", system-ui, sans-serif';
const FONTE_TITULO = '"Fredoka", "Nunito", system-ui, sans-serif';
const FONTE_EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

/**
 * @param {object} orcamento  resultado de montarOrcamento()
 * @param {{foto?: {src, exata, descricao}}} opcoes
 * @returns {Promise<Blob>}
 */
export async function gerarImagemOrcamento(orcamento, opcoes = {}) {
    await garantirFontes();

    let imagemFoto = null;
    if (opcoes.foto) {
        try {
            imagemFoto = await carregarImagem(opcoes.foto.src);
        } catch (e) {
            imagemFoto = null; // segue sem a foto
        }
    }

    const rascunho = document.createElement('canvas');
    rascunho.width = LARGURA;
    rascunho.height = 5000;
    const ctx = rascunho.getContext('2d');

    const alturaFinal = desenhar(ctx, orcamento, imagemFoto, opcoes.foto);

    const canvas = document.createElement('canvas');
    canvas.width = LARGURA;
    canvas.height = alturaFinal;
    canvas.getContext('2d').drawImage(rascunho, 0, 0);

    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

async function garantirFontes() {
    if (!document.fonts) return;
    await Promise.allSettled([
        document.fonts.load('700 40px "Fredoka"'),
        document.fonts.load('400 30px "Nunito"'),
        document.fonts.load('800 30px "Nunito"')
    ]);
}

function desenhar(ctx, orcamento, imagemFoto, infoFoto) {
    const larguraConteudo = LARGURA - MARGEM * 2;

    // fundo
    ctx.fillStyle = MARCA.corFundo;
    ctx.fillRect(0, 0, LARGURA, ctx.canvas.height);
    ctx.fillStyle = 'rgba(214, 69, 122, 0.06)';
    [[980, 120, 220], [80, 520, 160], [1000, 1100, 140]].forEach(([x, y, r]) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    });

    let y = MARGEM;

    // ---- cabeçalho
    const alturaCabecalho = 200;
    const gradiente = ctx.createLinearGradient(MARGEM, y, LARGURA - MARGEM, y + alturaCabecalho);
    gradiente.addColorStop(0, MARCA.corPrimaria);
    gradiente.addColorStop(1, MARCA.corSecundaria);
    ctx.fillStyle = gradiente;
    arredondado(ctx, MARGEM, y, larguraConteudo, alturaCabecalho, 36);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '600 62px ' + FONTE_TITULO;
    ctx.fillText(MARCA.nome, MARGEM + 48, y + 92);
    ctx.font = '600 30px ' + FONTE_TEXTO;
    ctx.globalAlpha = 0.92;
    ctx.fillText(MARCA.subtitulo, MARGEM + 48, y + 140);
    ctx.globalAlpha = 1;

    ctx.textAlign = 'right';
    ctx.font = '800 26px ' + FONTE_TEXTO;
    ctx.fillText('ORÇAMENTO', LARGURA - MARGEM - 48, y + 82);
    ctx.font = '600 24px ' + FONTE_TEXTO;
    ctx.fillText(orcamento.geradoEm, LARGURA - MARGEM - 48, y + 120);

    y += alturaCabecalho + 32;

    // ---- desenho do bolo (+ foto real)
    const temDesenho = orcamento.andares.length || orcamento.cortes.length;
    if (temDesenho || imagemFoto) {
        const alturaVisual = 560;
        if (imagemFoto && temDesenho) {
            const larguraCartao = (larguraConteudo - 24) / 2;
            cartaoDesenho(ctx, orcamento, MARGEM, y, larguraCartao, alturaVisual);
            cartaoFoto(ctx, imagemFoto, infoFoto, MARGEM + larguraCartao + 24, y, larguraCartao, alturaVisual);
        } else if (imagemFoto) {
            cartaoFoto(ctx, imagemFoto, infoFoto, MARGEM, y, larguraConteudo, alturaVisual);
        } else {
            cartaoDesenho(ctx, orcamento, MARGEM, y, larguraConteudo, alturaVisual);
        }
        y += alturaVisual + 32;
    }

    // ---- itens
    const linhas = montarLinhas(ctx, orcamento, larguraConteudo - 96);
    const alturaItens = linhas.reduce((soma, l) => soma + l.altura, 0) + 56;
    cartaoBranco(ctx, MARGEM, y, larguraConteudo, alturaItens);

    let yLinha = y + 36;
    for (const linha of linhas) {
        desenharLinha(ctx, linha, MARGEM + 48, yLinha, larguraConteudo - 96);
        yLinha += linha.altura;
    }
    y += alturaItens + 24;

    // ---- total
    const alturaTotal = orcamento.fatias ? 170 : 130;
    ctx.fillStyle = MARCA.corTexto;
    arredondado(ctx, MARGEM, y, larguraConteudo, alturaTotal, 28);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.font = '800 34px ' + FONTE_TEXTO;
    ctx.fillText('Total', MARGEM + 48, y + 80);
    ctx.textAlign = 'right';
    ctx.font = '600 64px ' + FONTE_TITULO;
    ctx.fillText(formatarMoeda(orcamento.total), LARGURA - MARGEM - 48, y + 86);
    if (orcamento.fatias) {
        ctx.textAlign = 'left';
        ctx.font = '600 26px ' + FONTE_TEXTO;
        ctx.fillStyle = '#f7c6d9';
        ctx.fillText(textoFatias(orcamento), MARGEM + 48, y + 136);
    }
    y += alturaTotal + 36;

    // ---- rodapé
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a0778a';
    ctx.font = '600 24px ' + FONTE_TEXTO;
    ctx.fillText(MARCA.site, LARGURA / 2, y + 10);
    y += 10 + MARGEM;

    return Math.ceil(y);
}

function textoFatias(orcamento) {
    let texto = '🍰 ' + orcamento.fatias + ' fatias';
    if (orcamento.fatiasCorte && orcamento.fatiasDecorados) {
        texto += '  (' + orcamento.fatiasDecorados + ' do bolo decorado + ' + orcamento.fatiasCorte + ' de corte)';
    }
    return texto;
}

function cartaoBranco(ctx, x, y, w, h) {
    ctx.save();
    ctx.shadowColor = 'rgba(120, 40, 70, 0.10)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#ffffff';
    arredondado(ctx, x, y, w, h, 28);
    ctx.fill();
    ctx.restore();
}

function cartaoDesenho(ctx, orcamento, x, y, w, h) {
    cartaoBranco(ctx, x, y, w, h);
    ctx.save();
    arredondado(ctx, x, y, w, h, 28);
    ctx.clip();
    desenharComposicao(ctx, { andares: orcamento.andares, cortes: orcamento.cortes }, { x: x + 16, y: y + 40, w: w - 32, h: h - 56 });
    ctx.restore();
    etiqueta(ctx, x + 24, y + 24, 'Composição');
}

function cartaoFoto(ctx, imagem, info, x, y, w, h) {
    cartaoBranco(ctx, x, y, w, h);
    ctx.save();
    arredondado(ctx, x, y, w, h, 28);
    ctx.clip();
    // foto real: "cover" (preenche recortando o excesso); provisória: "contain" (mostra inteira)
    ctx.fillStyle = '#f6eef2';
    ctx.fillRect(x, y, w, h);
    const ajuste = info?.placeholder ? Math.min : Math.max;
    const escala = ajuste(w / imagem.width, h / imagem.height);
    const lw = imagem.width * escala;
    const lh = imagem.height * escala;
    ctx.drawImage(imagem, x + (w - lw) / 2, y + (h - lh) / 2, lw, lh);
    ctx.restore();
    etiqueta(ctx, x + 24, y + 24, info?.exata ? 'Foto real' : 'Foto real · semelhante');
}

function etiqueta(ctx, x, y, texto) {
    ctx.font = '800 22px ' + FONTE_TEXTO;
    const largura = ctx.measureText(texto).width + 32;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    arredondado(ctx, x, y, largura, 40, 20);
    ctx.fill();
    ctx.fillStyle = MARCA.corPrimaria;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(texto, x + 16, y + 21);
    ctx.textBaseline = 'alphabetic';
}

// ---- lista de itens

function montarLinhas(ctx, orcamento, larguraDisponivel) {
    const linhas = [];
    orcamento.grupos.forEach((grupo, indice) => {
        linhas.push({ tipo: 'titulo', texto: grupo.titulo.toUpperCase(), altura: indice === 0 ? 48 : 64 });
        for (const item of grupo.itens) {
            const descricao = (item.quantidade ? item.quantidade + '× ' : '') + item.descricaoCurta;
            ctx.font = '600 30px ' + FONTE_TEXTO;
            const quebras = quebrarTexto(ctx, descricao, larguraDisponivel - 64 - 210);
            linhas.push({ tipo: 'item', item, quebras, altura: 22 + quebras.length * 38 });
        }
    });
    return linhas;
}

function desenharLinha(ctx, linha, x, y, largura) {
    ctx.textBaseline = 'alphabetic';
    if (linha.tipo === 'titulo') {
        ctx.fillStyle = MARCA.corPrimaria;
        ctx.textAlign = 'left';
        ctx.font = '800 22px ' + FONTE_TEXTO;
        ctx.fillText(linha.texto, x, y + linha.altura - 16);
        return;
    }
    const { item, quebras } = linha;
    ctx.textAlign = 'left';
    ctx.font = '30px ' + FONTE_EMOJI;
    ctx.fillStyle = MARCA.corTexto;
    ctx.fillText(item.emoji, x, y + 38);

    ctx.font = '600 30px ' + FONTE_TEXTO;
    quebras.forEach((texto, i) => ctx.fillText(texto, x + 56, y + 38 + i * 38));

    ctx.textAlign = 'right';
    ctx.font = '800 30px ' + FONTE_TEXTO;
    ctx.fillStyle = item.desconto ? '#2e9d6a' : MARCA.corTexto;
    const valor = item.desconto ? '− ' + formatarMoeda(Math.abs(item.valorTotal)) : formatarMoeda(item.valorTotal);
    ctx.fillText(valor, x + largura, y + 38);
}

function quebrarTexto(ctx, texto, larguraMaxima) {
    const palavras = texto.split(' ');
    const linhas = [];
    let atual = '';
    for (const palavra of palavras) {
        const teste = atual ? atual + ' ' + palavra : palavra;
        if (ctx.measureText(teste).width > larguraMaxima && atual) {
            linhas.push(atual);
            atual = palavra;
        } else {
            atual = teste;
        }
    }
    if (atual) linhas.push(atual);
    return linhas;
}
