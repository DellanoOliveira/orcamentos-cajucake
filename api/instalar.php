<?php
// Instalador: cria as tabelas, importa os dados atuais (api/dados-iniciais) e cria o
// primeiro usuário. Só funciona enquanto não existir nenhum usuário cadastrado.
// Acesse pelo navegador: https://seu-site/api/instalar.php

declare(strict_types=1);

require __DIR__ . '/lib/base.php';
require __DIR__ . '/lib/auth.php';
require __DIR__ . '/lib/esquema.php';

header('Content-Type: text/html; charset=utf-8');

function pagina(string $titulo, string $conteudo): never
{
    echo '<!doctype html><html lang="pt-br"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width, initial-scale=1"><title>Instalação · CajuCake</title>'
        . '<style>body{font-family:system-ui,sans-serif;background:#fff7fa;color:#3b2330;margin:0;padding:24px}'
        . 'main{max-width:460px;margin:40px auto;background:#fff;border-radius:18px;padding:28px;box-shadow:0 6px 24px rgba(160,38,86,.1)}'
        . 'h1{margin-top:0;font-size:1.4rem}label{display:block;margin:14px 0 4px;font-weight:600}'
        . 'input{width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #f3dbe5;border-radius:10px;font:inherit}'
        . 'button,.botao{display:inline-block;margin-top:20px;background:#d6457a;color:#fff;border:0;border-radius:999px;padding:12px 22px;font:inherit;font-weight:700;cursor:pointer;text-decoration:none}'
        . '.erro{background:#fde8e8;border-radius:10px;padding:10px 14px;color:#9b1c1c}.ok{background:#e3f7ec;border-radius:10px;padding:10px 14px}'
        . 'small{color:#8a6475}</style></head><body><main><h1>' . $titulo . '</h1>' . $conteudo . '</main></body></html>';
    exit;
}

function h(string $texto): string
{
    return htmlspecialchars($texto, ENT_QUOTES, 'UTF-8');
}

// ---- verificações do ambiente
if (PHP_VERSION_ID < 80100) {
    pagina('PHP antigo', '<p class="erro">É necessário PHP 8.1 ou mais novo (atual: ' . PHP_VERSION . '). No cPanel, use "Selecionar versão do PHP".</p>');
}
if (!is_file(__DIR__ . '/config.php')) {
    pagina('Falta configurar', '<p class="erro">Copie <b>api/config.exemplo.php</b> para <b>api/config.php</b> e preencha os dados do banco MySQL.</p>');
}

try {
    db()->query('SELECT 1');
} catch (Throwable $e) {
    pagina('Banco indisponível', '<p class="erro">Não foi possível conectar ao banco. Confira os dados em api/config.php.</p>');
}

criarTabelas(); // seguro rodar várias vezes (CREATE TABLE IF NOT EXISTS)

if (consultarUm('SELECT id FROM usuarios WHERE ativo = 1')) {
    pagina('Já instalado ✅', '<p>O sistema já está instalado. Entre pela página inicial com seu usuário.</p><a class="botao" href="../">Abrir a calculadora</a>');
}

$mensagem = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nome = trim((string) ($_POST['nome'] ?? ''));
    $login = trim((string) ($_POST['login'] ?? ''));
    $senha = (string) ($_POST['senha'] ?? '');
    $confirmacao = (string) ($_POST['confirmacao'] ?? '');

    if ($nome === '' || !preg_match('/^[A-Za-z0-9._@-]{3,60}$/', $login)) {
        $mensagem = 'Informe seu nome e um login com pelo menos 3 caracteres (sem espaços).';
    } elseif (mb_strlen($senha) < 6) {
        $mensagem = 'A senha precisa ter pelo menos 6 caracteres.';
    } elseif ($senha !== $confirmacao) {
        $mensagem = 'As senhas não conferem.';
    } else {
        $importado = emTransacao(function () use ($nome, $login, $senha) {
            $importado = importarDadosIniciais();
            executar(
                'INSERT INTO usuarios (nome, login, senha_hash, criado_em) VALUES (?, ?, ?, ?)',
                [$nome, $login, password_hash($senha, PASSWORD_DEFAULT), agora()]
            );
            return $importado;
        });
        pagina('Instalação concluída 🎉',
            '<p class="ok">Tabelas criadas' . ($importado ? ' e dados importados: ' . h(implode(', ', $importado)) : '') . '.</p>'
            . '<p>Seu usuário <b>' . h($login) . '</b> foi criado. Use-o para entrar no sistema.</p>'
            . '<a class="botao" href="../">Abrir a calculadora</a>');
    }
}

pagina('Instalação · CajuCake',
    '<p>Este passo cria as tabelas no banco, importa os preços, produtos e itens de estoque atuais e cria o seu usuário.</p>'
    . ($mensagem ? '<p class="erro">' . h($mensagem) . '</p>' : '')
    . '<form method="post">'
    . '<label for="nome">Seu nome</label><input id="nome" name="nome" required value="' . h($_POST['nome'] ?? '') . '">'
    . '<label for="login">Login</label><input id="login" name="login" required autocomplete="username" value="' . h($_POST['login'] ?? '') . '">'
    . '<label for="senha">Senha</label><input id="senha" name="senha" type="password" required autocomplete="new-password">'
    . '<label for="confirmacao">Confirme a senha</label><input id="confirmacao" name="confirmacao" type="password" required autocomplete="new-password">'
    . '<button type="submit">Instalar</button>'
    . '</form><p><small>Depois de instalado, esta página fica bloqueada automaticamente.</small></p>');
