// Comunicação com a API (pasta api/) e login.
// Se a sessão expirar, a janela de login aparece e a requisição é repetida em seguida.
import { escaparHTML } from './util.js';

const BASE = 'api/';
let loginPendente = null;

/**
 * @param {string} caminho  ex.: 'catalogo', 'admin/produtos?secao_id=2'
 * @param {{metodo?: string, corpo?: object}} opcoes
 */
export async function api(caminho, opcoes = {}) {
    const { metodo = 'GET', corpo } = opcoes;
    let resposta;
    try {
        resposta = await fetch(BASE + caminho, {
            method: metodo,
            credentials: 'same-origin',
            headers: {
                'X-Requested-With': 'fetch',
                ...(corpo ? { 'Content-Type': 'application/json' } : {})
            },
            body: corpo ? JSON.stringify(corpo) : undefined
        });
    } catch (e) {
        throw new Error('Sem conexão com o servidor. Verifique a internet.');
    }

    let dados = null;
    try {
        dados = await resposta.json();
    } catch (e) {
        // resposta não é JSON (ex.: PHP indisponível)
    }

    if (resposta.status === 401 && caminho !== 'login') {
        await pedirLogin();
        return api(caminho, opcoes);
    }
    if (!resposta.ok || !dados) {
        throw new Error(dados?.erro || 'Erro ao falar com o servidor (' + resposta.status + ').');
    }
    return dados;
}

/** Garante que há alguém logado e mostra o nome no topo da página. */
export async function iniciarSessao() {
    const { usuario } = await api('sessao');
    mostrarUsuario(usuario);
    return usuario;
}

export async function sairDoSistema() {
    try {
        await api('logout', { metodo: 'POST' });
    } finally {
        location.reload();
    }
}

function mostrarUsuario(usuario) {
    const menu = document.querySelector('.menu');
    if (!menu || document.querySelector('.usuario-logado')) return;
    const area = document.createElement('div');
    area.className = 'usuario-logado';
    area.innerHTML = `
      <sl-dropdown placement="bottom-end">
        <sl-button slot="trigger" size="small" pill caret>
          <sl-icon slot="prefix" name="person-circle"></sl-icon>${escaparHTML(usuario.nome)}
        </sl-button>
        <sl-menu>
          <sl-menu-item value="sair"><sl-icon slot="prefix" name="box-arrow-right"></sl-icon>Sair</sl-menu-item>
        </sl-menu>
      </sl-dropdown>`;
    area.addEventListener('sl-select', (evento) => {
        if (evento.detail.item.value === 'sair') sairDoSistema();
    });
    menu.after(area);
}

/** Abre a janela de login (uma só, mesmo com várias requisições esperando). */
function pedirLogin() {
    if (loginPendente) return loginPendente;

    loginPendente = new Promise((resolve) => {
        const dialogo = document.createElement('sl-dialog');
        dialogo.label = 'Entrar';
        dialogo.className = 'dialogo-login';
        dialogo.innerHTML = `
          <form class="form-login">
            <p>Entre com seu usuário para continuar.</p>
            <sl-input name="login" label="Usuário" autocomplete="username" required autofocus></sl-input>
            <sl-input name="senha" type="password" label="Senha" autocomplete="current-password" password-toggle required></sl-input>
            <div class="form-login__erro" hidden></div>
            <sl-button type="submit" variant="primary" size="large">Entrar</sl-button>
          </form>`;
        // não deixa fechar sem entrar
        dialogo.addEventListener('sl-request-close', (evento) => evento.preventDefault());
        document.body.append(dialogo);

        const form = dialogo.querySelector('form');
        const caixaErro = dialogo.querySelector('.form-login__erro');
        const botao = dialogo.querySelector('sl-button[type="submit"]');

        form.addEventListener('submit', async (evento) => {
            evento.preventDefault();
            const login = form.querySelector('[name="login"]').value;
            const senha = form.querySelector('[name="senha"]').value;
            botao.loading = true;
            caixaErro.hidden = true;
            try {
                await api('login', { metodo: 'POST', corpo: { login, senha } });
                dialogo.remove();
                loginPendente = null;
                resolve();
            } catch (erro) {
                caixaErro.textContent = erro.message;
                caixaErro.hidden = false;
            } finally {
                botao.loading = false;
            }
        });

        customElements.whenDefined('sl-dialog').then(() => dialogo.show());
    });
    return loginPendente;
}
