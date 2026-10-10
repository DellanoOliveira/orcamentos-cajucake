<?php
// Base da API: configuração, banco de dados (MySQL ou SQLite) e respostas JSON.

declare(strict_types=1);

date_default_timezone_set('America/Sao_Paulo');

function config(): array
{
    static $config = null;
    if ($config === null) {
        $arquivo = __DIR__ . '/../config.php';
        if (!is_file($arquivo)) {
            erro('API não configurada: copie api/config.exemplo.php para api/config.php e preencha os dados do banco.', 500);
        }
        $config = require $arquivo;
    }
    return $config;
}

// ---------------------------------------------------------------- respostas

function responder(mixed $dados, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

function erro(string $mensagem, int $status = 400): never
{
    responder(['erro' => $mensagem], $status);
}

/** Corpo da requisição em JSON. */
function corpo(): array
{
    $texto = file_get_contents('php://input') ?: '';
    if ($texto === '') {
        return [];
    }
    $dados = json_decode($texto, true);
    if (!is_array($dados)) {
        erro('Corpo da requisição inválido (JSON esperado).');
    }
    return $dados;
}

// ---------------------------------------------------------------- banco de dados

function db(): PDO
{
    static $pdo = null;
    if ($pdo) {
        return $pdo;
    }
    $c = config()['db'];
    try {
        if (($c['driver'] ?? 'mysql') === 'sqlite') {
            $pasta = dirname($c['arquivo']);
            if (!is_dir($pasta)) {
                mkdir($pasta, 0775, true);
            }
            $pdo = new PDO('sqlite:' . $c['arquivo']);
            $pdo->exec('PRAGMA foreign_keys = ON');
        } else {
            $dsn = 'mysql:host=' . $c['host'] . ';dbname=' . $c['nome'] . ';charset=utf8mb4';
            $pdo = new PDO($dsn, $c['usuario'], $c['senha']);
        }
    } catch (PDOException $e) {
        erro('Não foi possível conectar ao banco de dados. Verifique api/config.php.', 500);
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return $pdo;
}

function ehMysql(): bool
{
    return (config()['db']['driver'] ?? 'mysql') !== 'sqlite';
}

function consultar(string $sql, array $parametros = []): array
{
    $comando = db()->prepare($sql);
    $comando->execute($parametros);
    return $comando->fetchAll();
}

function consultarUm(string $sql, array $parametros = []): ?array
{
    $linhas = consultar($sql, $parametros);
    return $linhas[0] ?? null;
}

function executar(string $sql, array $parametros = []): int
{
    $comando = db()->prepare($sql);
    $comando->execute($parametros);
    return $comando->rowCount();
}

function agora(): string
{
    return date('Y-m-d H:i:s');
}

/** Executa a função dentro de uma transação. */
function emTransacao(callable $funcao): mixed
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $resultado = $funcao();
        $pdo->commit();
        return $resultado;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}
