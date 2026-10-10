#!/usr/bin/env node
// Gera data/fotos-reais.json a partir das imagens em img/fotos-reais/.
//
// Uso:  node scripts/gerar-manifesto-fotos.js
//
// Convenção de nomes:  img/fotos-reais/<tipo>/<tamanhos>[_<n>].<ext>
//   tipo:      pasta | glace | naked | fake | torta | corte
//   tamanhos:  diâmetros em cm separados por "-" (ordem não importa), ex.: 10-20-30
//   _<n>:      opcional, para mais de uma foto da mesma composição (10-20-30_2.jpg)
//   ext:       jpg, jpeg, png, webp, avif ou svg
//
// Arquivos .svg são tratados como imagens provisórias (placeholders). Quando existir uma
// foto real (.jpg, .png...) com o mesmo nome, o placeholder é ignorado automaticamente.
//
// Legendas opcionais: crie img/fotos-reais/legendas.json com { "pasta/10-20-30.jpg": "Bolo da Alice" }

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const PASTA_FOTOS = path.join(RAIZ, 'img', 'fotos-reais');
const SAIDA = path.join(RAIZ, 'data', 'fotos-reais.json');
const EXTENSOES = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg'];
const PADRAO_NOME = /^(\d+(?:-\d+)*)(?:_(\d+))?$/;

function lerLegendas() {
    const arquivo = path.join(PASTA_FOTOS, 'legendas.json');
    return fs.existsSync(arquivo) ? JSON.parse(fs.readFileSync(arquivo, 'utf8')) : {};
}

function main() {
    if (!fs.existsSync(PASTA_FOTOS)) {
        console.error('Pasta não encontrada: ' + PASTA_FOTOS);
        process.exit(1);
    }

    const legendas = lerLegendas();
    const porChave = new Map(); // "tipo/10-20-30_2" -> foto
    const ignorados = [];

    for (const tipo of fs.readdirSync(PASTA_FOTOS)) {
        const pastaTipo = path.join(PASTA_FOTOS, tipo);
        if (!fs.statSync(pastaTipo).isDirectory()) continue;

        for (const nomeArquivo of fs.readdirSync(pastaTipo)) {
            const extensao = path.extname(nomeArquivo).toLowerCase();
            const base = path.basename(nomeArquivo, path.extname(nomeArquivo));
            const combinacao = PADRAO_NOME.exec(base);
            if (!EXTENSOES.includes(extensao) || !combinacao) {
                ignorados.push(tipo + '/' + nomeArquivo);
                continue;
            }

            const tamanhos = combinacao[1].split('-').map(Number).sort((a, b) => a - b);
            const chave = tipo + '/' + tamanhos.join('-') + '_' + (combinacao[2] || '1');
            const placeholder = extensao === '.svg';
            const relativo = tipo + '/' + nomeArquivo;
            const foto = {
                tipo,
                tamanhos,
                arquivo: 'img/fotos-reais/' + relativo,
                placeholder
            };
            if (legendas[relativo]) foto.legenda = legendas[relativo];

            const existente = porChave.get(chave);
            // foto real tem prioridade sobre o placeholder de mesmo nome
            if (!existente || (existente.placeholder && !placeholder)) {
                porChave.set(chave, foto);
            }
        }
    }

    const fotos = [...porChave.values()].sort((a, b) =>
        a.tipo.localeCompare(b.tipo) || a.tamanhos.length - b.tamanhos.length || a.tamanhos.join('-').localeCompare(b.tamanhos.join('-'), undefined, { numeric: true }));

    const manifesto = { gerado: new Date().toISOString(), fotos };
    fs.writeFileSync(SAIDA, JSON.stringify(manifesto, null, 2) + '\n');

    const reais = fotos.filter((f) => !f.placeholder).length;
    console.log('✔ ' + fotos.length + ' fotos indexadas (' + reais + ' reais, ' + (fotos.length - reais) + ' provisórias)');
    console.log('  → ' + path.relative(RAIZ, SAIDA));
    if (ignorados.length) {
        console.log('⚠ Arquivos ignorados (nome fora do padrão): ' + ignorados.join(', '));
    }
}

main();
