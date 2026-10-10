// Página de relatórios: cada relatório é um módulo em js/relatorios/ registrado abaixo.
//
// Para criar um novo relatório, crie um arquivo exportando (export default):
//   id, titulo, emoji
//   iniciar(container, aoMudar)   desenha os controles e chama aoMudar() a cada alteração
//   resumo()                      texto curto exibido no resumo (ex.: "7 bolos · 3 recheios")
//   gerarTexto({ data, observacoes })  mensagem para o WhatsApp
//   limpar()
// e adicione-o na lista RELATORIOS.
import estoque from './estoque.js';
import { notificar, copiarTexto, abrirNoWhatsApp } from '../componentes.js';
import { iniciarSessao } from '../api.js';

const RELATORIOS = [estoque];

const $ = (seletor) => document.querySelector(seletor);
let ativo = RELATORIOS[0];

iniciar().catch((erro) => {
    console.error(erro);
    notificar('Erro ao carregar os dados: ' + erro.message, 'danger', 'exclamation-octagon');
});

async function iniciar() {
    await iniciarSessao();
    const abas = $('#abas-relatorios');
    abas.innerHTML = RELATORIOS.map((r) => `
        <sl-tab slot="nav" panel="${r.id}">${r.emoji} ${r.titulo}</sl-tab>
        <sl-tab-panel name="${r.id}"><div data-relatorio="${r.id}"></div></sl-tab-panel>`).join('');

    for (const relatorio of RELATORIOS) {
        await relatorio.iniciar($(`[data-relatorio="${relatorio.id}"]`), atualizar);
    }

    $('#data-relatorio').value = hojeISO();

    abas.addEventListener('sl-tab-show', (evento) => {
        if (evento.target !== abas) return; // abas internas de um relatório
        ativo = RELATORIOS.find((r) => r.id === evento.detail.name) || ativo;
        atualizar();
    });
    $('#data-relatorio').addEventListener('sl-change', atualizar);
    $('#observacoes').addEventListener('sl-input', atualizar);
    $('#btn-copiar').addEventListener('click', () => copiarTexto($('#texto-relatorio').value));
    $('#btn-whatsapp').addEventListener('click', () => abrirNoWhatsApp($('#texto-relatorio').value));
    $('#btn-limpar').addEventListener('click', () => ativo.limpar());
    $('#btn-ver-mensagem').addEventListener('click', () => $('#resumo').scrollIntoView({ behavior: 'smooth' }));

    atualizar();
}

function atualizar() {
    const rotulo = ativo.resumo();
    $('#titulo-resumo').textContent = ativo.titulo;
    $('#total').textContent = rotulo;
    $('#total-mobile').textContent = rotulo;
    $('#texto-relatorio').value = ativo.gerarTexto({
        data: formatarData($('#data-relatorio').value),
        observacoes: ($('#observacoes').value || '').trim()
    });
}

function hojeISO() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function formatarData(iso) {
    if (!iso) return '';
    const [ano, mes, dia] = iso.split('-');
    return dia + '/' + mes + '/' + ano;
}
