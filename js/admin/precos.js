// Tabela de preços dos bolos decorados: linhas = tamanhos, colunas = tipos.
// Célula vazia = esse tipo não é vendido nesse tamanho. Tipos derivados (ex.: Fake 5cm)
// são calculados automaticamente e não aparecem aqui.
import { api } from '../api.js';
import { escaparHTML } from '../util.js';
import { notificar } from '../componentes.js';

export function criarTabelaDePrecos(container) {
    let dados = null;

    async function recarregar() {
        dados = await api('admin/precos');
        desenhar();
    }

    function desenhar() {
        const tipos = dados.tipos.filter((t) => !t.derivado);
        const derivados = dados.tipos.filter((t) => t.derivado);
        if (!dados.tamanhos.length || !tipos.length) {
            container.innerHTML = '<p class="mensagem-suave">Cadastre tamanhos e tipos de bolo para montar a tabela de preços.</p>';
            return;
        }
        container.innerHTML = `
          <section class="editor">
            <header class="editor__topo">
              <div>
                <h3>Preços dos bolos decorados</h3>
                <p>Preço (R$) e fatias de cada tipo em cada tamanho. Deixe o preço vazio quando o tipo não for vendido naquele tamanho.
                ${derivados.length ? '<br>Calculados automaticamente: ' + derivados.map((t) => escaparHTML(t.nome)).join(', ') + '.' : ''}</p>
              </div>
              <sl-button size="small" variant="primary" data-acao="salvar-precos">
                <sl-icon slot="prefix" name="check-lg"></sl-icon>Salvar preços
              </sl-button>
            </header>
            <div class="tabela-precos__rolagem">
              <table class="tabela-precos">
                <thead>
                  <tr><th>Tamanho</th>${tipos.map((t) => `<th>${escaparHTML(t.nome)}</th>`).join('')}</tr>
                </thead>
                <tbody>
                  ${dados.tamanhos.map((tam) => `
                    <tr>
                      <th>${tam.tamanho} cm</th>
                      ${tipos.map((tipo) => {
                          const preco = dados.precos[tam.id + ':' + tipo.id];
                          return `
                            <td data-tamanho="${tam.id}" data-tipo="${tipo.id}">
                              <label><span>R$</span><input type="text" inputmode="decimal" name="valor"
                                value="${preco ? String(preco.valor).replace('.', ',') : ''}" placeholder="—"></label>
                              <label><span>fatias</span><input type="number" inputmode="numeric" name="fatias" min="0"
                                value="${preco ? preco.fatias : ''}"></label>
                            </td>`;
                      }).join('')}
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </section>`;
    }

    container.addEventListener('input', (evento) => {
        evento.target.closest('td')?.classList.add('alterada');
    });

    container.addEventListener('click', async (evento) => {
        const botao = evento.target.closest('[data-acao="salvar-precos"]');
        if (!botao) return;
        const precos = [...container.querySelectorAll('td[data-tamanho]')].map((celula) => ({
            tamanho_id: +celula.dataset.tamanho,
            tipo_id: +celula.dataset.tipo,
            valor: celula.querySelector('[name="valor"]').value.trim().replace(',', '.'),
            fatias: celula.querySelector('[name="fatias"]').value || 0
        }));
        botao.loading = true;
        try {
            dados = await api('admin/precos', { metodo: 'PUT', corpo: { precos } });
            desenhar();
            notificar('Preços salvos!', 'success', 'check2-circle');
        } catch (erro) {
            notificar(erro.message, 'danger', 'exclamation-octagon');
        } finally {
            botao.loading = false;
        }
    });

    return { recarregar };
}
