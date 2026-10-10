// Configurações gerais da calculadora. Altere aqui textos, cores e nomes.

export const MARCA = {
    nome: 'CajuCake',
    subtitulo: 'Bolos & Doces Personalizados',
    site: 'caixinhasurpresa.com.br',
    // Cores usadas na imagem compartilhável
    corPrimaria: '#d6457a',
    corSecundaria: '#f7a8c4',
    corTexto: '#3b2330',
    corFundo: '#fff6f9'
};

// Preços, produtos e estoque vêm do banco de dados (api/). Aqui ficam só arquivos estáticos.
export const ARQUIVOS_DADOS = {
    fotosReais: 'data/fotos-reais.json'
};

// Tipos de bolo decorado. Os tipos reais são cadastrados no banco (página Cadastros)
// e substituem estes ao carregar a calculadora (aplicarTiposDoCatalogo).
// "descricao" é o texto usado no orçamento; as cores são usadas pelo desenho do bolo.
// alturaCm:  altura do andar no desenho (padrão 10 cm)
// estilo:    reaproveita a decoração de outro tipo no desenho (pasta, glace, naked, fake, torta)
// derivado:  preço calculado a partir de outro tipo, multiplicado por "fatorPreco"
export const TIPOS_BOLO = {
    pasta: {
        nome: 'Pasta Americana', curto: 'Pasta', descricao: 'Artístico Decorado',
        cores: { lateral: '#f6b8d1', sombra: '#e58fb3', topo: '#fcd6e5', detalhe: '#ffffff' }
    },
    glace: {
        nome: 'Glacê / Chantilly', curto: 'Glacê', descricao: 'Glacê/Chantilly',
        cores: { lateral: '#fff8ef', sombra: '#ecdcc8', topo: '#ffffff', detalhe: '#f3b6cf' }
    },
    naked: {
        nome: 'Naked Cake', curto: 'Naked', descricao: 'Naked',
        cores: { lateral: '#d9a066', sombra: '#b57a45', topo: '#fff3e0', detalhe: '#c9364f' }
    },
    fake: {
        nome: 'Fake (cenográfico)', curto: 'Fake', descricao: 'Fake',
        cores: { lateral: '#cfd8f6', sombra: '#a9b5e3', topo: '#e6ebfc', detalhe: '#ffffff' }
    },
    fake5: {
        nome: 'Fake 5 cm (meia altura)', curto: 'Fake 5cm', descricao: 'Fake 5cm (meia altura)',
        estilo: 'fake', alturaCm: 5,
        derivado: { de: 'fake', fatorPreco: 0.5 },
        cores: { lateral: '#cfd8f6', sombra: '#a9b5e3', topo: '#e6ebfc', detalhe: '#ffffff' }
    },
    torta: {
        nome: 'Torta', curto: 'Torta', descricao: 'Torta', alturaCm: 5,
        cores: { lateral: '#e7b75f', sombra: '#c48f3a', topo: '#f6d48e', detalhe: '#a8682a' }
    }
};

/** Substitui os tipos padrão pelos cadastrados no banco, na ordem cadastrada. */
export function aplicarTiposDoCatalogo(tipos) {
    if (!tipos || !Object.keys(tipos).length) return;
    for (const chave of Object.keys(TIPOS_BOLO)) delete TIPOS_BOLO[chave];
    Object.assign(TIPOS_BOLO, tipos);
}

export const CORES_CORTE = { lateral: '#8a5a3b', sombra: '#6b4128', topo: '#fff1e2', detalhe: '#5a3320' };

export const TIPO_PADRAO = 'pasta';

// Nomes amigáveis das estratégias de sugestão (js/sugestao.js)
export const ESTRATEGIAS = {
    'maior-ate-restante': 'Maiores sem passar',
    'mais-proximo-restante': 'Mais próximo',
    'menor-acima-restante': 'Menor que cobre',
    'menor-primeiro': 'Menores primeiro',
    'maior-primeiro': 'Maiores primeiro',
    'gradacao-5-10': 'Andares em gradação'
};
