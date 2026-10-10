// Desenha a composição do orçamento (bolo em andares + bolos de corte) em um <canvas>.
// Os andares são proporcionais ao diâmetro real; cada tipo tem um estilo próprio.
import { TIPOS_BOLO, CORES_CORTE } from './config.js';

const FONTE = '"Nunito", system-ui, sans-serif';
const alturaAndarCm = (tipo) => TIPOS_BOLO[tipo]?.alturaCm || 10; // definido em config.js
const DIAMETRO_REFERENCIA = 25;             // bolos menores que isso aparecem menores
const ACHATAMENTO = 0.18;                   // proporção da elipse (perspectiva)

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{andares: Array<{tamanho,tipo}>, cortes: Array<{tamanho,quantidade}>}} composicao
 * @param {{x,y,w,h}} area
 */
export function desenharComposicao(ctx, composicao, area) {
    const { andares = [], cortes = [] } = composicao;

    if (!andares.length && !cortes.length) {
        desenharVazio(ctx, area);
        return;
    }

    if (andares.length && cortes.length) {
        if (area.h > area.w * 0.9) {
            // área em pé: bolos de corte em uma faixa embaixo
            const alturaAndares = area.h * 0.68;
            desenharBoloEmAndares(ctx, andares, { x: area.x, y: area.y, w: area.w, h: alturaAndares });
            desenharBolosDeCorte(ctx, cortes, { x: area.x, y: area.y + alturaAndares, w: area.w, h: area.h - alturaAndares }, true);
        } else {
            const larguraAndares = area.w * 0.6;
            desenharBoloEmAndares(ctx, andares, { x: area.x, y: area.y, w: larguraAndares, h: area.h });
            desenharBolosDeCorte(ctx, cortes, { x: area.x + larguraAndares, y: area.y, w: area.w - larguraAndares, h: area.h });
        }
    } else if (andares.length) {
        desenharBoloEmAndares(ctx, andares, area);
    } else {
        desenharBolosDeCorte(ctx, cortes, area);
    }
}

/** Ajusta o tamanho interno do canvas à tela (nitidez em telas retina) e desenha. */
export function desenharNoCanvas(canvas, composicao) {
    const dpr = window.devicePixelRatio || 1;
    const largura = canvas.clientWidth || 400;
    const altura = canvas.clientHeight || 300;
    canvas.width = Math.round(largura * dpr);
    canvas.height = Math.round(altura * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, largura, altura);
    desenharComposicao(ctx, composicao, { x: 0, y: 0, w: largura, h: altura });
}

// ---------------------------------------------------------------- bolo em andares

function desenharBoloEmAndares(ctx, andares, area) {
    const ordenados = andares.slice().sort((a, b) => b.tamanho - a.tamanho); // base primeiro
    const maiorDiametro = ordenados[0].tamanho;
    const diametroTopo = ordenados[ordenados.length - 1].tamanho;
    const alturaAndaresCm = ordenados.reduce((soma, a) => soma + alturaAndarCm(a.tipo), 0);

    const diametroPrato = Math.max(maiorDiametro, 10) * 1.2;
    const velaCm = 7;
    const alturaTotalCm = alturaAndaresCm + diametroTopo * ACHATAMENTO / 2 + diametroPrato * ACHATAMENTO / 2 + 1.2 + velaCm;
    const larguraUtil = area.w * 0.9;
    const alturaUtil = area.h * 0.9;
    const escala = Math.min(
        larguraUtil / diametroPrato,
        alturaUtil / alturaTotalCm,
        larguraUtil / (DIAMETRO_REFERENCIA * 1.2)
    );

    const cx = area.x + area.w / 2;
    const alturaPx = alturaTotalCm * escala;
    const topoConjunto = area.y + (area.h - alturaPx) / 2;
    const yPrato = topoConjunto + alturaPx - (diametroPrato * ACHATAMENTO / 2 + 1.2) * escala;

    desenharPrato(ctx, cx, yPrato, diametroPrato * escala, escala);

    let yBase = yPrato;
    ordenados.forEach((andar, indice) => {
        const largura = andar.tamanho * escala;
        const altura = alturaAndarCm(andar.tipo) * escala;
        desenharAndar(ctx, cx, yBase, largura, altura, andar);
        yBase -= altura;
        if (indice === ordenados.length - 1) {
            desenharVela(ctx, cx, yBase, escala);
        }
    });
}

function desenharPrato(ctx, cx, y, largura, escala) {
    const rx = largura / 2;
    const ry = rx * ACHATAMENTO;
    const espessura = 1.2 * escala;

    // sombra
    ctx.save();
    ctx.fillStyle = 'rgba(80, 30, 50, 0.12)';
    ctx.beginPath();
    ctx.ellipse(cx, y + espessura + ry * 0.4, rx * 1.05, ry * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // espessura do prato
    ctx.fillStyle = '#c9c3cc';
    ctx.beginPath();
    ctx.ellipse(cx, y + espessura, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    const gradiente = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
    gradiente.addColorStop(0, '#e9e5ec');
    gradiente.addColorStop(0.5, '#ffffff');
    gradiente.addColorStop(1, '#ddd7e0');
    ctx.fillStyle = gradiente;
    ctx.beginPath();
    ctx.ellipse(cx, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function caminhoCilindro(ctx, cx, yBase, largura, altura) {
    const rx = largura / 2;
    const ry = rx * ACHATAMENTO;
    const yTopo = yBase - altura;
    ctx.beginPath();
    ctx.moveTo(cx - rx, yTopo);
    ctx.lineTo(cx - rx, yBase);
    ctx.ellipse(cx, yBase, rx, ry, 0, Math.PI, 0, true);
    ctx.lineTo(cx + rx, yTopo);
    ctx.ellipse(cx, yTopo, rx, ry, 0, 0, Math.PI, false);
    ctx.closePath();
}

function gradienteLateral(ctx, cx, rx, cores) {
    const gradiente = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
    gradiente.addColorStop(0, cores.sombra);
    gradiente.addColorStop(0.3, cores.lateral);
    gradiente.addColorStop(0.65, cores.lateral);
    gradiente.addColorStop(1, cores.sombra);
    return gradiente;
}

/** Pontos ao longo da metade frontal de uma elipse (de um lado ao outro). */
function pontosFrente(cx, cy, rx, ry, quantidade) {
    const pontos = [];
    for (let i = 0; i <= quantidade; i++) {
        const angulo = Math.PI - (Math.PI * i) / quantidade;
        pontos.push({ x: cx + rx * Math.cos(angulo), y: cy + ry * Math.sin(angulo) });
    }
    return pontos;
}

function desenharAndar(ctx, cx, yBase, largura, altura, andar) {
    const tipo = TIPOS_BOLO[andar.tipo] || TIPOS_BOLO.pasta;
    const estilo = tipo.estilo || andar.tipo;
    const cores = tipo.cores;
    const rx = largura / 2;
    const ry = rx * ACHATAMENTO;
    const yTopo = yBase - altura;

    ctx.save();
    ctx.fillStyle = gradienteLateral(ctx, cx, rx, cores);
    caminhoCilindro(ctx, cx, yBase, largura, altura);
    ctx.fill();

    // decoração lateral (recortada no corpo do andar)
    ctx.save();
    caminhoCilindro(ctx, cx, yBase, largura, altura);
    ctx.clip();
    if (estilo === 'naked') desenharCamadasNaked(ctx, cx, yBase, rx, ry, altura, cores);
    if (estilo === 'pasta') desenharBolinhas(ctx, cx, yTopo, rx, altura, cores.sombra, 0.9);
    if (estilo === 'fake') desenharBolinhas(ctx, cx, yTopo, rx, altura, cores.detalhe, 0.6);
    ctx.restore();

    // topo
    ctx.fillStyle = cores.topo;
    ctx.beginPath();
    ctx.ellipse(cx, yTopo, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    if (estilo === 'torta') desenharTrelica(ctx, cx, yTopo, rx, ry, cores.detalhe);
    if (estilo === 'naked') desenharFrutas(ctx, cx, yTopo, rx, ry, cores.detalhe);

    // acabamentos das bordas
    const raioEnfeite = Math.max(2, Math.min(largura * 0.028, altura * 0.12));
    if (estilo === 'pasta' || estilo === 'fake') {
        desenharCordao(ctx, pontosFrente(cx, yBase, rx, ry, Math.round(largura / (raioEnfeite * 2.1))), raioEnfeite, cores.detalhe, cores.sombra);
    }
    if (estilo === 'glace') {
        desenharCordao(ctx, pontosFrente(cx, yTopo, rx, ry, Math.round(largura / (raioEnfeite * 2.1))), raioEnfeite * 1.1, cores.detalhe, '#e48fb1');
        desenharCordao(ctx, pontosFrente(cx, yBase, rx, ry, Math.round(largura / (raioEnfeite * 2.1))), raioEnfeite, '#ffffff', cores.sombra);
    }
    if (estilo === 'torta') {
        desenharCordao(ctx, pontosFrente(cx, yTopo, rx, ry, Math.round(largura / (raioEnfeite * 2.4))), raioEnfeite, cores.topo, cores.sombra);
    }

    desenharEtiqueta(ctx, cx, yBase - altura * 0.45 + ry * 0.4, andar.tamanho + ' cm', Math.min(altura * 0.3, largura * 0.16));
    ctx.restore();
}

function desenharCamadasNaked(ctx, cx, yBase, rx, ry, altura, cores) {
    // faixas de recheio acompanhando a curvatura
    const espessura = altura * 0.1;
    [0.33, 0.66].forEach((fracao) => {
        const y = yBase - altura * fracao;
        ctx.fillStyle = cores.topo;
        ctx.beginPath();
        ctx.ellipse(cx, y + espessura / 2, rx, ry, 0, Math.PI, 0, true);
        ctx.ellipse(cx, y - espessura / 2, rx, ry, 0, 0, Math.PI, false);
        ctx.closePath();
        ctx.fill();
    });
}

function desenharBolinhas(ctx, cx, yTopo, rx, altura, cor, opacidade) {
    const raio = Math.max(1.5, altura * 0.06);
    ctx.globalAlpha = opacidade;
    ctx.fillStyle = cor;
    const colunas = Math.max(3, Math.round((rx * 2) / (raio * 7)));
    for (let linha = 0; linha < 2; linha++) {
        for (let c = 0; c < colunas; c++) {
            const deslocamento = linha % 2 ? 0.5 : 0;
            const x = cx - rx + ((c + 0.5 + deslocamento) / colunas) * rx * 2;
            const y = yTopo + altura * (0.32 + linha * 0.3) + rx * ACHATAMENTO;
            ctx.beginPath();
            ctx.arc(x, y, raio, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
}

function desenharCordao(ctx, pontos, raio, cor, contorno) {
    ctx.fillStyle = cor;
    ctx.strokeStyle = contorno;
    ctx.lineWidth = Math.max(0.5, raio * 0.18);
    for (const p of pontos) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, raio, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
}

function desenharTrelica(ctx, cx, yTopo, rx, ry, cor) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, yTopo, rx * 0.9, ry * 0.9, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = cor;
    ctx.lineWidth = Math.max(1, rx * 0.04);
    const passo = rx / 3;
    for (let x = -rx * 2; x <= rx * 2; x += passo) {
        ctx.beginPath();
        ctx.moveTo(cx + x - ry, yTopo - ry);
        ctx.lineTo(cx + x + ry, yTopo + ry);
        ctx.moveTo(cx + x + ry, yTopo - ry);
        ctx.lineTo(cx + x - ry, yTopo + ry);
        ctx.stroke();
    }
    ctx.restore();
}

function desenharFrutas(ctx, cx, yTopo, rx, ry, cor) {
    const quantidade = Math.max(3, Math.round(rx / 12));
    const raio = Math.max(2, rx * 0.09);
    for (let i = 0; i < quantidade; i++) {
        const angulo = (Math.PI * 2 * i) / quantidade + 0.4;
        const x = cx + Math.cos(angulo) * rx * 0.55;
        const y = yTopo + Math.sin(angulo) * ry * 0.55 - raio * 0.4;
        ctx.fillStyle = i % 3 === 2 ? '#4b2a6b' : cor; // morangos e mirtilos
        ctx.beginPath();
        ctx.arc(x, y, raio, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.arc(x - raio * 0.35, y - raio * 0.35, raio * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function desenharVela(ctx, cx, yTopo, escala) {
    const largura = Math.max(3, 0.9 * escala);
    const altura = 4.5 * escala;
    ctx.save();
    ctx.fillStyle = '#7fc4e8';
    ctx.fillRect(cx - largura / 2, yTopo - altura, largura, altura);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 1; i < 4; i++) {
        ctx.fillRect(cx - largura / 2, yTopo - altura + (altura * i) / 4, largura, Math.max(1, altura * 0.06));
    }
    const chama = 1.6 * escala;
    const brilho = ctx.createRadialGradient(cx, yTopo - altura - chama * 0.6, 0, cx, yTopo - altura - chama * 0.6, chama * 1.6);
    brilho.addColorStop(0, 'rgba(255, 214, 102, 0.55)');
    brilho.addColorStop(1, 'rgba(255, 214, 102, 0)');
    ctx.fillStyle = brilho;
    ctx.beginPath();
    ctx.arc(cx, yTopo - altura - chama * 0.6, chama * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.ellipse(cx, yTopo - altura - chama * 0.6, chama * 0.4, chama * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function desenharEtiqueta(ctx, cx, cy, texto, tamanhoFonte) {
    const fonte = Math.max(9, Math.round(tamanhoFonte));
    ctx.font = '800 ' + fonte + 'px ' + FONTE;
    const largura = ctx.measureText(texto).width + fonte * 0.9;
    const altura = fonte * 1.35;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    arredondado(ctx, cx - largura / 2, cy - altura / 2, largura, altura, altura / 2);
    ctx.fill();
    ctx.fillStyle = '#5a2a40';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texto, cx, cy + fonte * 0.04);
}

// ---------------------------------------------------------------- bolos de corte

/** Um bolo de corte por célula: empilhados (padrão) ou lado a lado (horizontal). */
function desenharBolosDeCorte(ctx, cortes, area, horizontal = false) {
    const ordenados = cortes.slice().sort((a, b) => b.tamanho - a.tamanho);
    const maior = ordenados[0].tamanho;
    const larguraCelula = horizontal ? area.w / ordenados.length : area.w;
    const alturaCelula = horizontal ? area.h : area.h / ordenados.length;
    const alturaCm = 6;
    const escala = Math.min(
        (larguraCelula * 0.6) / (maior * 1.3),
        (alturaCelula * 0.62) / (alturaCm + maior * 0.32),
        (larguraCelula * 0.6) / (DIAMETRO_REFERENCIA * 1.3)
    );

    ordenados.forEach((corte, indice) => {
        const xCelula = area.x + (horizontal ? larguraCelula * indice : 0);
        const yCelula = area.y + (horizontal ? 0 : alturaCelula * indice);
        const largura = corte.tamanho * escala;
        const altura = alturaCm * escala;
        const profundidade = corte.tamanho * 0.32 * escala;
        const cxLinha = xCelula + larguraCelula * 0.4;
        const yBase = yCelula + alturaCelula / 2 + (altura + profundidade) / 2;
        desenharPlaca(ctx, cxLinha - largura / 2, yBase, largura, altura, profundidade);

        const fonte = Math.max(10, Math.min(alturaCelula * 0.16, larguraCelula * 0.075));
        ctx.font = '800 ' + fonte + 'px ' + FONTE;
        ctx.fillStyle = '#5a2a40';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const xTexto = cxLinha + largura / 2 + profundidade * 0.9 + fonte * 0.5;
        const yTexto = yBase - (altura + profundidade) / 2;
        ctx.fillText('×' + corte.quantidade, xTexto, yTexto - fonte * 0.45);
        ctx.font = '600 ' + Math.round(fonte * 0.72) + 'px ' + FONTE;
        ctx.fillStyle = '#8a5a6f';
        ctx.fillText(corte.tamanho + ' cm', xTexto, yTexto + fonte * 0.5);
    });
}

function desenharPlaca(ctx, x, yBase, largura, altura, profundidade) {
    const c = CORES_CORTE;
    const dx = profundidade * 0.9;
    const dy = profundidade * 0.55;
    const yTopo = yBase - altura;

    ctx.save();
    // sombra
    ctx.fillStyle = 'rgba(80, 30, 50, 0.12)';
    ctx.beginPath();
    ctx.ellipse(x + largura / 2 + dx / 2, yBase + 2, largura * 0.62, dy * 0.6 + 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // lateral direita
    ctx.fillStyle = c.sombra;
    ctx.beginPath();
    ctx.moveTo(x + largura, yBase);
    ctx.lineTo(x + largura + dx, yBase - dy);
    ctx.lineTo(x + largura + dx, yTopo - dy);
    ctx.lineTo(x + largura, yTopo);
    ctx.closePath();
    ctx.fill();

    // frente
    ctx.fillStyle = c.lateral;
    ctx.fillRect(x, yTopo, largura, altura);
    ctx.fillStyle = c.topo;
    ctx.fillRect(x, yTopo + altura * 0.45, largura, Math.max(1, altura * 0.12));

    // topo (cobertura)
    ctx.fillStyle = c.topo;
    ctx.beginPath();
    ctx.moveTo(x, yTopo);
    ctx.lineTo(x + largura, yTopo);
    ctx.lineTo(x + largura + dx, yTopo - dy);
    ctx.lineTo(x + dx, yTopo - dy);
    ctx.closePath();
    ctx.fill();

    // marcas de corte (fatias)
    ctx.strokeStyle = 'rgba(138, 90, 59, 0.35)';
    ctx.lineWidth = 1;
    const colunas = Math.max(2, Math.round(largura / 14));
    for (let i = 1; i < colunas; i++) {
        const xi = x + (largura * i) / colunas;
        ctx.beginPath();
        ctx.moveTo(xi, yTopo);
        ctx.lineTo(xi + dx, yTopo - dy);
        ctx.stroke();
    }
    for (let j = 1; j < 3; j++) {
        const f = j / 3;
        ctx.beginPath();
        ctx.moveTo(x + dx * f, yTopo - dy * f);
        ctx.lineTo(x + largura + dx * f, yTopo - dy * f);
        ctx.stroke();
    }
    ctx.restore();
}

// ---------------------------------------------------------------- utilitários

function desenharVazio(ctx, area) {
    const cx = area.x + area.w / 2;
    const cy = area.y + area.h / 2;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#d6457a';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    const largura = Math.min(area.w * 0.4, 160);
    caminhoCilindro(ctx, cx, cy + largura * 0.25, largura, largura * 0.4);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#a0778a';
    ctx.font = '600 ' + Math.max(12, Math.round(area.w * 0.035)) + 'px ' + FONTE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Selecione bolos para ver a composição', cx, cy + largura * 0.55);
}

export function arredondado(ctx, x, y, w, h, r) {
    const raio = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + raio, y);
    ctx.arcTo(x + w, y, x + w, y + h, raio);
    ctx.arcTo(x + w, y + h, x, y + h, raio);
    ctx.arcTo(x, y + h, x, y, raio);
    ctx.arcTo(x, y, x + w, y, raio);
    ctx.closePath();
}
