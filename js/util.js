const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarMoeda(valor) {
    return formatadorMoeda.format(+valor || 0);
}

export async function carregarJSON(url) {
    const resposta = await fetch(url, { cache: 'no-cache' });
    if (!resposta.ok) {
        throw new Error('Não foi possível carregar ' + url + ' (' + resposta.status + ')');
    }
    return resposta.json();
}

function doisDigitos(n) {
    return String(n).padStart(2, '0');
}

export function formatarDataHora(data = new Date()) {
    return doisDigitos(data.getDate()) + '/' + doisDigitos(data.getMonth() + 1) + '/' + data.getFullYear()
        + ' às ' + doisDigitos(data.getHours()) + ':' + doisDigitos(data.getMinutes());
}

export function carimboArquivo(data = new Date()) {
    return data.getFullYear() + doisDigitos(data.getMonth() + 1) + doisDigitos(data.getDate())
        + '-' + doisDigitos(data.getHours()) + doisDigitos(data.getMinutes());
}

export function escaparHTML(texto) {
    return String(texto).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

export function carregarImagem(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Falha ao carregar imagem ' + src));
        img.src = src;
    });
}

export function lerPreferencia(chave, padrao) {
    try {
        const valor = localStorage.getItem('orcamentos:' + chave);
        return valor === null ? padrao : JSON.parse(valor);
    } catch (e) {
        return padrao;
    }
}

export function salvarPreferencia(chave, valor) {
    try {
        localStorage.setItem('orcamentos:' + chave, JSON.stringify(valor));
    } catch (e) {
        // armazenamento indisponível (aba anônima etc.) — ignorar
    }
}
