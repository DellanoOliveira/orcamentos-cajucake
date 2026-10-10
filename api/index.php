<?php
// API da calculadora. Todas as rotas (exceto login) exigem usuário logado.
//
//   POST   login                    { login, senha }
//   POST   logout
//   GET    sessao                   usuário logado
//   POST   senha                    { atual, nova }
//   GET    catalogo                 dados da calculadora de orçamentos
//   GET    estoque                  seções, itens e quantidades
//   POST   estoque/quantidades      { itens: [{ item_id, tamanho, quantidade }] }
//   GET    admin/precos             tabela de preços (tamanho x tipo)
//   PUT    admin/precos             { precos: [{ tamanho_id, tipo_id, valor, fatias }] }
//   GET    admin/usuarios | POST admin/usuarios | PUT/DELETE admin/usuarios/{id}
//   GET    admin/{cadastro}[?filtro] | POST admin/{cadastro} | PUT/DELETE admin/{cadastro}/{id}

declare(strict_types=1);

require __DIR__ . '/lib/base.php';
require __DIR__ . '/lib/auth.php';
require __DIR__ . '/lib/catalogo.php';
require __DIR__ . '/lib/estoque.php';
require __DIR__ . '/lib/admin.php';

set_exception_handler(function (Throwable $e) {
    error_log('[api] ' . $e->getMessage() . ' em ' . $e->getFile() . ':' . $e->getLine());
    erro('Erro interno no servidor.', 500);
});

$metodo = $_SERVER['REQUEST_METHOD'];
$caminho = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '';
$caminho = preg_replace('#^.*?/api/(index\.php/?)?#', '', $caminho);
$partes = array_values(array_filter(explode('/', trim($caminho, '/')), 'strlen'));
$rota = implode('/', $partes);

exigirRequisicaoDoSite();

// ---- rotas públicas
if ($rota === 'login' && $metodo === 'POST') {
    responder(['usuario' => entrar(corpo())]);
}
if ($rota === 'logout' && $metodo === 'POST') {
    sair();
    responder(['ok' => true]);
}

// ---- rotas que exigem login
$usuario = exigirLogin();

if ($rota === 'sessao' && $metodo === 'GET') {
    responder(['usuario' => $usuario]);
}
if ($rota === 'senha' && $metodo === 'POST') {
    trocarSenha($usuario, corpo());
    responder(['ok' => true]);
}
if ($rota === 'catalogo' && $metodo === 'GET') {
    responder(catalogo());
}
if ($rota === 'estoque' && $metodo === 'GET') {
    responder(estoque());
}
if ($rota === 'estoque/quantidades' && $metodo === 'POST') {
    responder(salvarQuantidades(corpo()['itens'] ?? [], $usuario));
}

if (($partes[0] ?? '') === 'admin') {
    $cadastro = $partes[1] ?? '';
    $id = isset($partes[2]) ? (int) $partes[2] : null;

    if ($cadastro === 'precos') {
        if ($metodo === 'GET') responder(tabelaDePrecos());
        if ($metodo === 'PUT') responder(salvarPrecos(corpo()['precos'] ?? []));
    } elseif ($cadastro === 'usuarios') {
        if ($metodo === 'GET' && $id === null) responder(listarUsuarios());
        if ($metodo === 'POST' && $id === null) responder(salvarUsuario(null, corpo()), 201);
        if ($metodo === 'PUT' && $id !== null) responder(salvarUsuario($id, corpo()));
        if ($metodo === 'DELETE' && $id !== null) { arquivarUsuario($id, $usuario); responder(['ok' => true]); }
    } else {
        if ($metodo === 'GET' && $id === null) responder(listar($cadastro, $_GET));
        if ($metodo === 'POST' && $id === null) responder(criar($cadastro, corpo()), 201);
        if ($metodo === 'PUT' && $id !== null) responder(atualizar($cadastro, $id, corpo()));
        if ($metodo === 'DELETE' && $id !== null) { arquivar($cadastro, $id); responder(['ok' => true]); }
    }
}

erro('Rota não encontrada: ' . $metodo . ' ' . $rota, 404);
