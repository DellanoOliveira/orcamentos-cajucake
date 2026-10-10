// Página de Cadastros: bolos (tamanhos, tipos, preços), bolos de corte, seções e produtos,
// adicionais, estoque (seções e itens) e usuários.
import { api, iniciarSessao } from '../api.js';
import { notificar } from '../componentes.js';
import { criarEditor } from './editor.js';
import { criarTabelaDePrecos } from './precos.js';

const $ = (seletor) => document.querySelector(seletor);

const DESENHOS = [
    { valor: 'pasta', rotulo: 'Pasta Americana' },
    { valor: 'glace', rotulo: 'Glacê' },
    { valor: 'naked', rotulo: 'Naked' },
    { valor: 'fake', rotulo: 'Fake' },
    { valor: 'torta', rotulo: 'Torta' }
];

/** "Chantininho Rosa" -> "chantininho-rosa" */
function gerarCodigo(texto) {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
}

iniciar().catch((erro) => {
    console.error(erro);
    notificar('Erro ao carregar: ' + erro.message, 'danger', 'exclamation-octagon');
});

async function iniciar() {
    const usuario = await iniciarSessao();

    // ------------------------------------------------------------ bolos
    const precos = criarTabelaDePrecos($('#ed-precos'));

    const tamanhos = criarEditor($('#ed-tamanhos'), {
        titulo: 'Tamanhos de bolo',
        descricao: 'Diâmetros oferecidos. Também aparecem no balanço de estoque.',
        entidade: 'tamanhos',
        campos: [
            { nome: 'tamanho', rotulo: 'Tamanho (cm)', tipo: 'numero', largura: '130px' },
            { nome: 'emoji', rotulo: 'Emoji', tipo: 'emoji', largura: '90px', padrao: '🎂' },
            { nome: 'ordem', rotulo: 'Ordem', tipo: 'numero', largura: '90px' }
        ],
        aoSalvar: () => precos.recarregar()
    });

    const tipos = criarEditor($('#ed-tipos'), {
        titulo: 'Tipos de bolo',
        descricao: 'Cada tipo vira um botão nos cartões de bolo. "Preço baseado em" cria um tipo com preço calculado (ex.: Fake 5cm = 0,5 × Fake).',
        entidade: 'tipos',
        modo: 'cartoes',
        campos: [
            { nome: 'nome', rotulo: 'Nome', tipo: 'texto', dica: 'Ex.: Chantininho' },
            { nome: 'curto', rotulo: 'Nome no botão', tipo: 'texto', dica: 'Ex.: Chantin.' },
            { nome: 'descricao', rotulo: 'Texto no orçamento', tipo: 'texto' },
            { nome: 'chave', rotulo: 'Código', tipo: 'texto', dica: 'automático', fixoAoEditar: true },
            { nome: 'estilo', rotulo: 'Desenho', tipo: 'select', opcoes: () => DESENHOS, padrao: 'pasta' },
            { nome: 'altura_cm', rotulo: 'Altura do andar (cm)', tipo: 'numero', padrao: 10 },
            { nome: 'cor_lateral', rotulo: 'Cor lateral', tipo: 'cor', padrao: '#f6b8d1' },
            { nome: 'cor_sombra', rotulo: 'Cor sombra', tipo: 'cor', padrao: '#e58fb3' },
            { nome: 'cor_topo', rotulo: 'Cor topo', tipo: 'cor', padrao: '#fcd6e5' },
            { nome: 'cor_detalhe', rotulo: 'Cor detalhes', tipo: 'cor', padrao: '#ffffff' },
            {
                nome: 'derivado_de', rotulo: 'Preço baseado em', tipo: 'select',
                opcoes: () => [{ valor: '', rotulo: '— preço próprio —' },
                    ...tipos.linhas().filter((t) => t.id && !t.derivado_de).map((t) => ({ valor: t.chave, rotulo: t.nome }))]
            },
            { nome: 'fator_preco', rotulo: 'Multiplicador', tipo: 'decimal', dica: 'Ex.: 0,5 = metade' },
            { nome: 'ordem', rotulo: 'Ordem', tipo: 'numero' }
        ],
        antesDeSalvar: (dados) => {
            if (!dados.chave) dados.chave = gerarCodigo(dados.nome || dados.curto);
            if (!dados.derivado_de) dados.fator_preco = '';
            return dados;
        },
        aoSalvar: () => precos.recarregar()
    });

    // ------------------------------------------------------------ bolos de corte
    const corte = criarEditor($('#ed-corte'), {
        titulo: 'Bolos de corte',
        descricao: 'Bolos sem decoração usados para completar as fatias.',
        entidade: 'corte',
        campos: [
            { nome: 'tamanho', rotulo: 'Tamanho (cm)', tipo: 'numero', largura: '130px' },
            { nome: 'valor', rotulo: 'Preço (R$)', tipo: 'decimal', largura: '130px' },
            { nome: 'fatias', rotulo: 'Fatias', tipo: 'numero', largura: '100px' },
            { nome: 'ordem', rotulo: 'Ordem', tipo: 'numero', largura: '90px' }
        ]
    });

    // ------------------------------------------------------------ produtos
    const secoesProduto = criarEditor($('#ed-secoes-produto'), {
        titulo: 'Seções de produtos',
        descricao: 'Cada seção vira uma aba na calculadora (ex.: Doces & Salgados, Kits Festa).',
        entidade: 'secoes-produto',
        campos: [
            { nome: 'nome', rotulo: 'Nome da seção', tipo: 'texto', largura: 'minmax(180px, 2fr)' },
            { nome: 'emoji', rotulo: 'Emoji', tipo: 'emoji', largura: '90px', padrao: '🧁' },
            { nome: 'ordem', rotulo: 'Ordem', tipo: 'numero', largura: '90px' }
        ],
        aoSalvar: () => atualizarSeletor('#sel-secao-produto', secoesProduto, produtos)
    });

    const produtos = criarEditor($('#ed-produtos'), {
        titulo: 'Produtos da seção',
        entidade: 'produtos',
        filtro: { campo: 'secao_id', valor: null },
        campos: [
            { nome: 'nome', rotulo: 'Produto', tipo: 'texto', largura: 'minmax(180px, 2fr)' },
            { nome: 'valor', rotulo: 'Preço (R$)', tipo: 'decimal', largura: '120px' },
            { nome: 'emoji', rotulo: 'Emoji', tipo: 'emoji', largura: '80px', padrao: '🧁' },
            { nome: 'passo', rotulo: 'Botão + soma', tipo: 'numero', largura: '110px', padrao: 1 },
            { nome: 'ordem', rotulo: 'Ordem', tipo: 'numero', largura: '90px' }
        ]
    });

    // ------------------------------------------------------------ adicionais
    const servicos = criarEditor($('#ed-servicos'), {
        titulo: 'Adicionais',
        descricao: 'Serviços e ajustes com valor editável no orçamento. "Desconto" subtrai do total.',
        entidade: 'servicos',
        campos: [
            { nome: 'descricao', rotulo: 'Descrição', tipo: 'texto', largura: 'minmax(200px, 2fr)' },
            { nome: 'valor', rotulo: 'Valor padrão (R$)', tipo: 'decimal', largura: '140px' },
            { nome: 'emoji', rotulo: 'Emoji', tipo: 'emoji', largura: '80px', padrao: '✨' },
            { nome: 'desconto', rotulo: 'Desconto', tipo: 'bool', largura: '90px' },
            { nome: 'ordem', rotulo: 'Ordem', tipo: 'numero', largura: '90px' }
        ]
    });

    // ------------------------------------------------------------ estoque
    const secoesEstoque = criarEditor($('#ed-estoque-secoes'), {
        titulo: 'Seções do estoque',
        descricao: '"Por tamanho de bolo" conta cada item em cada tamanho (ex.: sabores). "Lista" conta cada item uma vez (ex.: recheios, embalagens).',
        entidade: 'estoque-secoes',
        campos: [
            { nome: 'nome', rotulo: 'Nome da seção', tipo: 'texto', largura: 'minmax(160px, 2fr)' },
            { nome: 'emoji', rotulo: 'Emoji', tipo: 'emoji', largura: '80px', padrao: '📦' },
            {
                nome: 'modo', rotulo: 'Tipo de contagem', tipo: 'select', largura: '190px', padrao: 'lista',
                opcoes: () => [{ valor: 'lista', rotulo: 'Lista de itens' }, { valor: 'grade', rotulo: 'Por tamanho de bolo' }]
            },
            { nome: 'ordem', rotulo: 'Ordem', tipo: 'numero', largura: '90px' }
        ],
        aoSalvar: () => atualizarSeletor('#sel-secao-estoque', secoesEstoque, itensEstoque)
    });

    const itensEstoque = criarEditor($('#ed-estoque-itens'), {
        titulo: 'Itens da seção',
        entidade: 'estoque-itens',
        filtro: { campo: 'secao_id', valor: null },
        campos: [
            { nome: 'grupo', rotulo: 'Grupo (opcional)', tipo: 'texto', largura: 'minmax(140px, 1fr)', dica: 'Ex.: Geleias' },
            { nome: 'nome', rotulo: 'Item', tipo: 'texto', largura: 'minmax(180px, 2fr)' },
            { nome: 'plural', rotulo: 'Título na mensagem', tipo: 'texto', largura: 'minmax(140px, 1fr)', dica: 'Ex.: Bolos Brancos' },
            { nome: 'emoji', rotulo: 'Emoji', tipo: 'emoji', largura: '80px', padrao: '📦' },
            { nome: 'ordem', rotulo: 'Ordem', tipo: 'numero', largura: '90px' }
        ]
    });

    // ------------------------------------------------------------ usuários
    const usuarios = criarEditor($('#ed-usuarios'), {
        titulo: 'Usuários da equipe',
        descricao: 'Quem pode entrar no sistema. Para trocar a senha de alguém, preencha a nova senha e salve.',
        entidade: 'usuarios',
        campos: [
            { nome: 'nome', rotulo: 'Nome', tipo: 'texto', largura: 'minmax(160px, 2fr)' },
            { nome: 'login', rotulo: 'Login', tipo: 'texto', largura: 'minmax(120px, 1fr)', fixoAoEditar: false },
            { nome: 'senha', rotulo: 'Senha', tipo: 'senha', largura: 'minmax(140px, 1fr)', dica: 'mín. 6 caracteres' }
        ]
    });

    ligarSeletor('#sel-secao-produto', produtos);
    ligarSeletor('#sel-secao-estoque', itensEstoque);
    ligarTrocaDeSenha(usuario);

    await Promise.all([
        tamanhos.recarregar(), tipos.recarregar(), precos.recarregar(), corte.recarregar(),
        secoesProduto.recarregar(), servicos.recarregar(), secoesEstoque.recarregar(), usuarios.recarregar()
    ]);
    await atualizarSeletor('#sel-secao-produto', secoesProduto, produtos);
    await atualizarSeletor('#sel-secao-estoque', secoesEstoque, itensEstoque);
}

/** Preenche o seletor de seção e recarrega os itens da seção escolhida. */
async function atualizarSeletor(seletor, editorSecoes, editorItens) {
    const select = $(seletor);
    const secoes = editorSecoes.linhas().filter((s) => s.id);
    const atual = select.value;
    select.innerHTML = secoes.map((s) => `<sl-option value="${s.id}">${s.emoji || ''} ${s.nome}</sl-option>`).join('');
    const escolhido = secoes.some((s) => String(s.id) === String(atual)) ? atual : String(secoes[0]?.id ?? '');
    await customElements.whenDefined('sl-select');
    select.value = escolhido;
    await editorItens.recarregar(escolhido ? +escolhido : null);
}

function ligarSeletor(seletor, editorItens) {
    $(seletor).addEventListener('sl-change', (evento) => editorItens.recarregar(+evento.target.value || null));
}

function ligarTrocaDeSenha() {
    const form = $('#form-senha');
    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const atual = form.querySelector('[name="atual"]').value;
        const nova = form.querySelector('[name="nova"]').value;
        try {
            await api('senha', { metodo: 'POST', corpo: { atual, nova } });
            form.reset();
            notificar('Senha alterada!', 'success', 'shield-check');
        } catch (erro) {
            notificar(erro.message, 'danger', 'exclamation-octagon');
        }
    });
}
