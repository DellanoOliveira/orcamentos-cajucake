// Componentes de interface compartilhados entre as páginas (orçamentos e relatórios).
import { escaparHTML } from './util.js';

/** Contador "− [n] +". O clique nos botões e a digitação são tratados por quem usa. */
export function contador(alvo, chave, passo = 1) {
    return `
      <div class="contador" data-alvo="${alvo}" data-chave="${chave}" data-passo="${passo}">
        <button type="button" data-delta="-1" aria-label="Diminuir">−</button>
        <input type="number" min="0" inputmode="numeric" value="0" aria-label="Quantidade">
        <button type="button" data-delta="1" aria-label="Aumentar">+</button>
      </div>`;
}

/** Atualiza o número do contador sem atrapalhar quem está digitando nele. */
export function sincronizarContador(raiz, quantidade) {
    const input = raiz.querySelector('.contador input');
    if (document.activeElement !== input || +input.value !== quantidade) input.value = quantidade;
}

export function notificar(mensagem, variante = 'primary', icone = 'info-circle') {
    const alerta = document.createElement('sl-alert');
    alerta.setAttribute('variant', variante);
    alerta.setAttribute('closable', '');
    alerta.setAttribute('duration', '3500');
    alerta.innerHTML = `<sl-icon slot="icon" name="${icone}"></sl-icon>${escaparHTML(mensagem)}`;
    document.body.append(alerta);
    customElements.whenDefined('sl-alert').then(() => alerta.toast());
}

export async function copiarTexto(texto) {
    try {
        await navigator.clipboard.writeText(texto);
    } catch (e) {
        // navegadores antigos / http sem HTTPS
        const area = document.createElement('textarea');
        area.value = texto;
        document.body.append(area);
        area.select();
        document.execCommand('copy');
        area.remove();
    }
    notificar('Texto copiado! É só colar no WhatsApp.', 'success', 'clipboard-check');
}

/** Abre o WhatsApp (app ou web) com o texto pronto; a pessoa escolhe o contato ou grupo. */
export function abrirNoWhatsApp(texto) {
    window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank', 'noopener');
}
