<?php
// Login com sessão PHP. As sessões ficam em api/dados/sessoes (pasta bloqueada para a web),
// para não serem apagadas pela limpeza automática da hospedagem compartilhada.

declare(strict_types=1);

const DURACAO_SESSAO = 60 * 60 * 24 * 30; // 30 dias

function iniciarSessao(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $pasta = __DIR__ . '/../dados/sessoes';
    if (!is_dir($pasta)) {
        mkdir($pasta, 0770, true);
    }
    ini_set('session.gc_maxlifetime', (string) DURACAO_SESSAO);
    ini_set('session.use_strict_mode', '1');
    session_save_path($pasta);
    session_name(config()['sessao_nome'] ?? 'cajucake_sessao');
    session_set_cookie_params([
        'lifetime' => DURACAO_SESSAO,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    ]);
    session_start();
}

/** Usuário logado (confere no banco se continua ativo) ou null. */
function usuarioAtual(): ?array
{
    iniciarSessao();
    $id = $_SESSION['usuario_id'] ?? null;
    if (!$id) {
        return null;
    }
    $usuario = consultarUm('SELECT id, nome, login FROM usuarios WHERE id = ? AND ativo = 1', [$id]);
    if (!$usuario) {
        $_SESSION = [];
        return null;
    }
    $usuario['id'] = (int) $usuario['id'];
    return $usuario;
}

function exigirLogin(): array
{
    $usuario = usuarioAtual();
    if (!$usuario) {
        erro('Faça login para continuar.', 401);
    }
    return $usuario;
}

/**
 * Proteção contra requisições de outros sites (CSRF): alterações só são aceitas
 * com o cabeçalho X-Requested-With, que formulários externos não conseguem enviar.
 */
function exigirRequisicaoDoSite(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'GET' && ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'fetch') {
        erro('Requisição não permitida.', 403);
    }
}

function entrar(array $dados): array
{
    $login = trim((string) ($dados['login'] ?? ''));
    $senha = (string) ($dados['senha'] ?? '');
    $usuario = consultarUm('SELECT id, nome, login, senha_hash FROM usuarios WHERE login = ? AND ativo = 1', [$login]);
    if (!$usuario || !password_verify($senha, $usuario['senha_hash'])) {
        usleep(800000); // atrasa tentativas de adivinhar a senha
        erro('Usuário ou senha incorretos.', 401);
    }
    iniciarSessao();
    session_regenerate_id(true);
    $_SESSION['usuario_id'] = (int) $usuario['id'];
    return ['id' => (int) $usuario['id'], 'nome' => $usuario['nome'], 'login' => $usuario['login']];
}

function sair(): void
{
    iniciarSessao();
    $_SESSION = [];
    session_destroy();
}

function trocarSenha(array $usuario, array $dados): void
{
    $atual = (string) ($dados['atual'] ?? '');
    $nova = (string) ($dados['nova'] ?? '');
    $linha = consultarUm('SELECT senha_hash FROM usuarios WHERE id = ?', [$usuario['id']]);
    if (!$linha || !password_verify($atual, $linha['senha_hash'])) {
        erro('A senha atual está incorreta.');
    }
    validarSenha($nova);
    executar('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [password_hash($nova, PASSWORD_DEFAULT), $usuario['id']]);
}

function validarSenha(string $senha): void
{
    if (mb_strlen($senha) < 6) {
        erro('A senha precisa ter pelo menos 6 caracteres.');
    }
}
