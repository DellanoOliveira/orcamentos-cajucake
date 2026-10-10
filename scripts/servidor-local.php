<?php
// Servidor para testes no computador (o servidor embutido do PHP não lê .htaccess).
// Uso, na pasta do projeto:
//   php -S 127.0.0.1:8080 scripts/servidor-local.php
// Use api/config.php com o banco SQLite (veja api/config.exemplo.php).

$raiz = dirname(__DIR__);
$caminho = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');

// mesmas proteções dos .htaccess
if (preg_match('#^/api/(lib|dados|dados-iniciais)(/|$)#', $caminho) || preg_match('#^/api/config(\.exemplo)?\.php$#', $caminho)) {
    http_response_code(403);
    echo 'Acesso negado';
    return true;
}

if ($caminho === '/api/instalar.php') {
    require $raiz . '/api/instalar.php';
    return true;
}

if (str_starts_with($caminho, '/api/') || $caminho === '/api') {
    require $raiz . '/api/index.php';
    return true;
}

// arquivos estáticos (html, js, css, imagens) são servidos normalmente
return false;
