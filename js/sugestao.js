// Algoritmos de sugestão de arranjos de bolos a partir de uma quantidade de fatias.
// Os algoritmos gulosos são os mesmos da versão anterior (legado/v2/js/calculadora.js).

const ESTRATEGIAS_GULOSAS = [
    'maior-ate-restante',
    'mais-proximo-restante',
    'menor-acima-restante',
    'menor-primeiro',
    'maior-primeiro',
    'gradacao-5-10'
];

/**
 * Sugere combinações de andares (sem repetir tamanho) de bolos decorados.
 * @returns {Array<{estrategia, tipoBolo, tamanhos, totalFatias, diferenca, quantidadeBolos}>}
 */
export function sugerirArranjosGulosos(totalFatias, tipo, dadosBolos, quantidadeSugestoes = 6) {
    const total = +totalFatias;
    if (!dadosBolos?.bolos?.length || !total || total <= 0) {
        return [];
    }

    const opcoes = extrairOpcoesDeFatiasPorTipo(dadosBolos, tipo);
    if (!opcoes.length) {
        return [];
    }

    const candidatos = ESTRATEGIAS_GULOSAS
        .map((estrategia) => montarArranjoGuloso(total, opcoes, estrategia, tipo))
        .filter((arranjo) => arranjo.tamanhos.length);

    candidatos.sort((a, b) => {
        if (a.diferenca !== b.diferenca) return a.diferenca - b.diferenca;
        if (a.quantidadeBolos !== b.quantidadeBolos) return a.quantidadeBolos - b.quantidadeBolos;
        return a.totalFatias - b.totalFatias;
    });

    const unicos = [];
    const vistos = new Set();
    for (const candidato of candidatos) {
        const chave = candidato.tamanhos.join('-');
        if (!vistos.has(chave)) {
            vistos.add(chave);
            unicos.push(candidato);
        }
        if (unicos.length >= quantidadeSugestoes) break;
    }
    return unicos;
}

function extrairOpcoesDeFatiasPorTipo(dadosBolos, tipo) {
    const opcoes = [];
    for (const bolo of dadosBolos.bolos) {
        const tipoInfo = bolo.tipos?.[tipo];
        if (tipoInfo && +tipoInfo.fatias > 0) {
            opcoes.push({ tamanho: +bolo.tamanho, fatias: +tipoInfo.fatias });
        }
    }
    return opcoes;
}

function montarArranjoGuloso(totalFatias, opcoes, estrategia, tipoBolo) {
    if (estrategia === 'gradacao-5-10') {
        return montarArranjoGradacao510(totalFatias, opcoes, tipoBolo);
    }

    const disponiveis = opcoes.slice();
    let restante = totalFatias;
    const tamanhos = [];
    let total = 0;

    while (disponiveis.length) {
        const escolhido = escolherMelhorOpcao(restante, disponiveis, estrategia);
        if (!escolhido) break;

        tamanhos.push(escolhido.tamanho);
        total += escolhido.fatias;
        restante = totalFatias - total;
        disponiveis.splice(disponiveis.indexOf(escolhido), 1);

        if (restante <= 0) break;
    }

    tamanhos.sort((a, b) => a - b);
    return {
        estrategia,
        tipoBolo,
        tamanhos,
        totalFatias: total,
        diferenca: Math.abs(totalFatias - total),
        quantidadeBolos: tamanhos.length
    };
}

function montarArranjoGradacao510(totalFatias, opcoes, tipoBolo) {
    let melhorArranjo = null;
    let melhorDiferenca = Infinity;

    function gerarCombinacoes(tamanhoAtual, totalAcumulado, selecionados, indiceInicial) {
        if (selecionados.length > 0) {
            const diferenca = Math.abs(totalFatias - totalAcumulado);
            if (diferenca < melhorDiferenca) {
                melhorDiferenca = diferenca;
                melhorArranjo = { tamanhos: selecionados.slice(), totalFatias: totalAcumulado };
            }
        }
        if (totalAcumulado >= totalFatias) return;

        for (let i = indiceInicial; i < opcoes.length; i++) {
            const proximo = opcoes[i];
            // O primeiro andar entra sem restrição; os demais precisam de diferença de 5 ou 10 cm
            const distancia = Math.abs(proximo.tamanho - tamanhoAtual);
            if (selecionados.length === 0 || distancia === 5 || distancia === 10) {
                selecionados.push(proximo.tamanho);
                gerarCombinacoes(proximo.tamanho, totalAcumulado + proximo.fatias, selecionados, i + 1);
                selecionados.pop();
            }
        }
    }

    gerarCombinacoes(null, 0, [], 0);

    const tamanhos = melhorArranjo ? melhorArranjo.tamanhos.slice().sort((a, b) => a - b) : [];
    return {
        estrategia: 'gradacao-5-10',
        tipoBolo,
        tamanhos,
        totalFatias: melhorArranjo ? melhorArranjo.totalFatias : 0,
        diferenca: melhorDiferenca === Infinity ? 0 : melhorDiferenca,
        quantidadeBolos: tamanhos.length
    };
}

function escolherMelhorOpcao(restante, disponiveis, estrategia) {
    const ateRestante = disponiveis.filter((o) => o.fatias <= restante);
    const acimaRestante = disponiveis.filter((o) => o.fatias > restante);

    switch (estrategia) {
        case 'menor-primeiro':
            return obterMenorFatias(disponiveis);
        case 'maior-primeiro':
            return obterMaiorFatias(disponiveis);
        case 'mais-proximo-restante':
            return obterMaisProximoDoRestante(restante, disponiveis);
        case 'menor-acima-restante':
            return acimaRestante.length ? obterMenorFatias(acimaRestante) : obterMaiorFatias(ateRestante);
        default: // maior-ate-restante
            return ateRestante.length ? obterMaiorFatias(ateRestante) : obterMenorFatias(acimaRestante);
    }
}

function obterMaiorFatias(lista) {
    return lista.reduce((maior, o) => (!maior || o.fatias > maior.fatias ? o : maior), null);
}

function obterMenorFatias(lista) {
    return lista.reduce((menor, o) => (!menor || o.fatias < menor.fatias ? o : menor), null);
}

function obterMaisProximoDoRestante(restante, lista) {
    return lista.reduce((melhor, o) =>
        (!melhor || Math.abs(restante - o.fatias) < Math.abs(restante - melhor.fatias) ? o : melhor), null);
}

/**
 * Sugere bolos de corte (tamanhos podem se repetir) para completar uma quantidade de fatias.
 * Retorna até 3 opções: menor sobra, menos bolos e menor preço.
 * @param {number} fatiasFaltando
 * @param {Array<{tamanho, valor, fatias}>} cortes
 * @returns {Array<{criterio, itens: Array<{tamanho, quantidade}>, totalFatias, valor, quantidadeBolos}>}
 */
export function sugerirBolosDeCorte(fatiasFaltando, cortes) {
    const alvo = Math.ceil(+fatiasFaltando);
    const opcoes = cortes.filter((c) => +c.fatias > 0);
    if (!alvo || alvo <= 0 || !opcoes.length) {
        return [];
    }

    const maxFatias = Math.max(...opcoes.map((c) => +c.fatias));
    const limite = alvo + maxFatias;

    // Programação dinâmica (troco ilimitado): para cada soma exata de fatias,
    // guarda a solução de menor preço e a de menos bolos.
    const porPreco = new Array(limite + 1).fill(null);
    const porQuantidade = new Array(limite + 1).fill(null);
    porPreco[0] = { valor: 0, quantidade: 0, anterior: -1, opcao: null };
    porQuantidade[0] = { valor: 0, quantidade: 0, anterior: -1, opcao: null };

    for (let soma = 1; soma <= limite; soma++) {
        for (const opcao of opcoes) {
            const anterior = soma - opcao.fatias;
            if (anterior < 0) continue;

            const baseP = porPreco[anterior];
            if (baseP) {
                const valor = baseP.valor + +opcao.valor;
                if (!porPreco[soma] || valor < porPreco[soma].valor) {
                    porPreco[soma] = { valor, quantidade: baseP.quantidade + 1, anterior, opcao };
                }
            }
            const baseQ = porQuantidade[anterior];
            if (baseQ) {
                const quantidade = baseQ.quantidade + 1;
                const valor = baseQ.valor + +opcao.valor;
                const atual = porQuantidade[soma];
                if (!atual || quantidade < atual.quantidade || (quantidade === atual.quantidade && valor < atual.valor)) {
                    porQuantidade[soma] = { valor, quantidade, anterior, opcao };
                }
            }
        }
    }

    function reconstruir(tabela, soma, criterio) {
        const contagem = new Map();
        for (let s = soma; s > 0; s = tabela[s].anterior) {
            const tamanho = tabela[s].opcao.tamanho;
            contagem.set(tamanho, (contagem.get(tamanho) || 0) + 1);
        }
        const itens = [...contagem.entries()]
            .map(([tamanho, quantidade]) => ({ tamanho, quantidade }))
            .sort((a, b) => b.tamanho - a.tamanho);
        return {
            criterio,
            itens,
            totalFatias: soma,
            valor: tabela[soma].valor,
            quantidadeBolos: tabela[soma].quantidade
        };
    }

    function melhorSoma(tabela, comparar) {
        let melhor = -1;
        for (let s = alvo; s <= limite; s++) {
            if (tabela[s] && (melhor < 0 || comparar(tabela[s], tabela[melhor]) < 0)) {
                melhor = s;
            }
        }
        return melhor;
    }

    const resultados = [];
    const somaMenorSobra = melhorSoma(porPreco, () => 1); // primeira soma alcançável >= alvo
    if (somaMenorSobra >= 0) resultados.push(reconstruir(porPreco, somaMenorSobra, 'Menor sobra'));

    const somaMenosBolos = melhorSoma(porQuantidade, (a, b) => a.quantidade - b.quantidade || a.valor - b.valor);
    if (somaMenosBolos >= 0) resultados.push(reconstruir(porQuantidade, somaMenosBolos, 'Menos bolos'));

    const somaMenorPreco = melhorSoma(porPreco, (a, b) => a.valor - b.valor);
    if (somaMenorPreco >= 0) resultados.push(reconstruir(porPreco, somaMenorPreco, 'Menor preço'));

    // remove opções repetidas
    const vistos = new Set();
    return resultados.filter((r) => {
        const chave = r.itens.map((i) => i.tamanho + 'x' + i.quantidade).join('|');
        if (vistos.has(chave)) return false;
        vistos.add(chave);
        return true;
    });
}
