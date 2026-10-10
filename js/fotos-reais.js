// Serviço de fotos reais de bolos.
//
// As fotos ficam em img/fotos-reais/<tipo>/<tamanhos>.<ext>, por exemplo:
//   img/fotos-reais/pasta/10-20-30.jpg   -> bolo de pasta americana com andares de 10, 20 e 30 cm
//   img/fotos-reais/corte/25.jpg         -> bolo de corte de 25 cm
//   img/fotos-reais/pasta/20_2.jpg       -> segunda foto do mesmo bolo (sufixo _2, _3...)
//
// O índice data/fotos-reais.json é gerado por: node scripts/gerar-manifesto-fotos.js
// Se não houver foto exata para a composição, é usada a mais parecida.
import { carregarJSON } from './util.js';
import { TIPOS_BOLO } from './config.js';

let catalogo = [];

export async function carregarFotosReais(url) {
    try {
        const manifesto = await carregarJSON(url);
        catalogo = (manifesto.fotos || []).map((foto) => ({
            ...foto,
            tamanhos: foto.tamanhos.map(Number).sort((a, b) => a - b)
        }));
    } catch (erro) {
        console.warn('Fotos reais indisponíveis:', erro.message);
        catalogo = [];
    }
    return catalogo.length;
}

/**
 * Busca fotos para a composição do orçamento.
 * @param {{andares: Array<{tamanho,tipo}>, cortes: Array<{tamanho,quantidade}>}} composicao
 * @returns {Array<{src, legenda, descricao, exata, placeholder}>} melhor resultado primeiro
 */
export function buscarFotosReais(composicao, limite = 6) {
    const resultados = [];

    if (composicao.andares.length) {
        const tipo = tipoPredominante(composicao.andares);
        const tamanhos = composicao.andares.map((a) => a.tamanho).sort((a, b) => a - b);
        resultados.push(...buscar(tipo, tamanhos, 3));
    }

    for (const corte of composicao.cortes) {
        resultados.push(...buscar('corte', [corte.tamanho], 1));
    }

    // remove duplicadas mantendo a ordem
    const vistos = new Set();
    return resultados.filter((r) => !vistos.has(r.src) && vistos.add(r.src)).slice(0, limite);
}

function buscar(tipo, tamanhos, quantidade) {
    return catalogo
        .map((foto) => ({ foto, pontos: distancia(foto, tipo, tamanhos) }))
        .filter((c) => c.pontos < Infinity)
        .sort((a, b) => a.pontos - b.pontos)
        .slice(0, quantidade)
        .map(({ foto, pontos }) => ({
            src: foto.arquivo,
            legenda: foto.legenda || '',
            descricao: descrever(foto.tipo, foto.tamanhos),
            exata: pontos === 0,
            placeholder: !!foto.placeholder
        }));
}

/** Quanto menor, mais parecida a foto é da composição pedida. */
function distancia(foto, tipo, tamanhos) {
    const corteFoto = foto.tipo === 'corte';
    const cortePedido = tipo === 'corte';
    if (corteFoto !== cortePedido) return Infinity; // não misturar corte com decorado

    // mesmo tipo > mesmo estilo (ex.: Fake 5cm usa fotos de Fake) > qualquer outro
    const estilo = (t) => TIPOS_BOLO[t]?.estilo || t;
    let pontos = foto.tipo === tipo ? 0 : estilo(foto.tipo) === estilo(tipo) ? 50 : 500;
    pontos += Math.abs(foto.tamanhos.length - tamanhos.length) * 100;

    // compara andar a andar, do maior para o menor
    const a = foto.tamanhos.slice().reverse();
    const b = tamanhos.slice().reverse();
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        pontos += Math.abs((a[i] || 0) - (b[i] || 0));
    }
    return pontos;
}

/** O tipo do maior andar define o "estilo" do bolo. */
function tipoPredominante(andares) {
    return andares.slice().sort((a, b) => b.tamanho - a.tamanho)[0].tipo;
}

export function descrever(tipo, tamanhos) {
    const nome = tipo === 'corte' ? 'Bolo de corte' : (TIPOS_BOLO[tipo]?.nome || tipo);
    return nome + ' · ' + tamanhos.join(' + ') + ' cm';
}
