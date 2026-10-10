<?php
// Cadastros genéricos (listar, criar, editar, arquivar) para cada entidade.
// Tipos de campo: texto, texto? (opcional), int, int+ (>= 1), decimal, decimal?,
// bool, cor (#rrggbb), chave (a-z, 0-9 e -), enum:a,b, ref:tabela (id de outra tabela).
// "Excluir" apenas arquiva (ativo = 0), preservando orçamentos e histórico.

declare(strict_types=1);

const ENTIDADES = [
    'tamanhos' => [
        'tabela' => 'bolo_tamanhos',
        'campos' => ['tamanho' => 'int+', 'emoji' => 'texto?', 'ordem' => 'int'],
        'unico' => 'tamanho',
        'ordenar' => 'ordem, tamanho',
    ],
    'tipos' => [
        'tabela' => 'bolo_tipos',
        'campos' => [
            'chave' => 'chave', 'nome' => 'texto', 'curto' => 'texto', 'descricao' => 'texto',
            'altura_cm' => 'int+', 'estilo' => 'texto?',
            'cor_lateral' => 'cor', 'cor_sombra' => 'cor', 'cor_topo' => 'cor', 'cor_detalhe' => 'cor',
            'derivado_de' => 'texto?', 'fator_preco' => 'decimal?', 'ordem' => 'int',
        ],
        'unico' => 'chave',
        'ordenar' => 'ordem, id',
    ],
    'corte' => [
        'tabela' => 'bolo_corte',
        'campos' => ['tamanho' => 'int+', 'valor' => 'decimal', 'fatias' => 'int', 'ordem' => 'int'],
        'unico' => 'tamanho',
        'ordenar' => 'ordem, tamanho',
    ],
    'secoes-produto' => [
        'tabela' => 'produto_secoes',
        'campos' => ['nome' => 'texto', 'emoji' => 'texto?', 'ordem' => 'int'],
        'ordenar' => 'ordem, id',
    ],
    'produtos' => [
        'tabela' => 'produtos',
        'campos' => [
            'secao_id' => 'ref:produto_secoes', 'nome' => 'texto', 'valor' => 'decimal',
            'emoji' => 'texto?', 'passo' => 'int+', 'ordem' => 'int',
        ],
        'filtro' => 'secao_id',
        'ordenar' => 'ordem, id',
    ],
    'servicos' => [
        'tabela' => 'servicos',
        'campos' => ['descricao' => 'texto', 'valor' => 'decimal', 'emoji' => 'texto?', 'desconto' => 'bool', 'ordem' => 'int'],
        'ordenar' => 'ordem, id',
    ],
    'estoque-secoes' => [
        'tabela' => 'estoque_secoes',
        'campos' => ['nome' => 'texto', 'emoji' => 'texto?', 'modo' => 'enum:grade,lista', 'ordem' => 'int'],
        'ordenar' => 'ordem, id',
    ],
    'estoque-itens' => [
        'tabela' => 'estoque_itens',
        'campos' => [
            'secao_id' => 'ref:estoque_secoes', 'grupo' => 'texto?', 'nome' => 'texto',
            'plural' => 'texto?', 'emoji' => 'texto?', 'ordem' => 'int',
        ],
        'filtro' => 'secao_id',
        'ordenar' => 'ordem, id',
    ],
];

function definicao(string $entidade): array
{
    return ENTIDADES[$entidade] ?? erro('Cadastro desconhecido: ' . $entidade, 404);
}

function converterSaida(array $def, array $linha): array
{
    $saida = ['id' => (int) $linha['id']];
    foreach ($def['campos'] as $campo => $tipo) {
        $valor = $linha[$campo];
        $saida[$campo] = match (true) {
            $valor === null => null,
            in_array($tipo, ['int', 'int+'], true), str_starts_with($tipo, 'ref:') => (int) $valor,
            in_array($tipo, ['decimal', 'decimal?'], true) => (float) $valor,
            $tipo === 'bool' => (bool) $valor,
            default => $valor,
        };
    }
    return $saida;
}

function listar(string $entidade, array $parametros): array
{
    $def = definicao($entidade);
    $colunas = 'id, ' . implode(', ', array_keys($def['campos']));
    $sql = "SELECT $colunas FROM {$def['tabela']} WHERE ativo = 1";
    $valores = [];
    if (isset($def['filtro']) && isset($parametros[$def['filtro']])) {
        $sql .= " AND {$def['filtro']} = ?";
        $valores[] = (int) $parametros[$def['filtro']];
    }
    $sql .= ' ORDER BY ' . $def['ordenar'];
    return array_map(fn ($linha) => converterSaida($def, $linha), consultar($sql, $valores));
}

/** Valida e normaliza os campos enviados. */
function validar(array $def, array $dados): array
{
    $limpo = [];
    foreach ($def['campos'] as $campo => $tipo) {
        $valor = $dados[$campo] ?? null;
        $texto = is_string($valor) ? trim($valor) : $valor;
        $vazio = $texto === null || $texto === '';
        $nomeCampo = str_replace('_', ' ', $campo);

        if (str_ends_with($tipo, '?') && $vazio) {
            $limpo[$campo] = null;
            continue;
        }
        $base = rtrim($tipo, '?');

        if ($base === 'texto') {
            if ($vazio) erro('Preencha o campo "' . $nomeCampo . '".');
            $limpo[$campo] = mb_substr((string) $texto, 0, 120);
        } elseif ($base === 'int' || $base === 'int+') {
            if ($vazio && $base === 'int') { $limpo[$campo] = 0; continue; }
            if (!is_numeric($texto) || (int) $texto != $texto) erro('O campo "' . $nomeCampo . '" precisa ser um número inteiro.');
            if ($base === 'int+' && (int) $texto < 1) erro('O campo "' . $nomeCampo . '" precisa ser maior que zero.');
            $limpo[$campo] = (int) $texto;
        } elseif ($base === 'decimal') {
            $numero = is_string($texto) ? str_replace(',', '.', $texto) : $texto;
            if ($vazio) { $numero = 0; }
            if (!is_numeric($numero) || (float) $numero < 0) erro('O campo "' . $nomeCampo . '" precisa ser um valor válido.');
            $limpo[$campo] = round((float) $numero, 3);
        } elseif ($base === 'bool') {
            $limpo[$campo] = $texto && $texto !== '0' && $texto !== 'false' ? 1 : 0;
        } elseif ($base === 'cor') {
            if (!preg_match('/^#[0-9a-fA-F]{6}$/', (string) $texto)) erro('Cor inválida em "' . $nomeCampo . '".');
            $limpo[$campo] = strtolower((string) $texto);
        } elseif ($base === 'chave') {
            if (!preg_match('/^[a-z0-9-]{1,30}$/', (string) $texto)) erro('A chave deve ter apenas letras minúsculas, números e "-".');
            $limpo[$campo] = $texto;
        } elseif (str_starts_with($base, 'enum:')) {
            $opcoes = explode(',', substr($base, 5));
            if (!in_array($texto, $opcoes, true)) erro('Valor inválido em "' . $nomeCampo . '".');
            $limpo[$campo] = $texto;
        } elseif (str_starts_with($base, 'ref:')) {
            $tabela = substr($base, 4);
            if (!consultarUm("SELECT id FROM $tabela WHERE id = ? AND ativo = 1", [(int) $texto])) erro('Selecione uma seção válida.');
            $limpo[$campo] = (int) $texto;
        }
    }
    return $limpo;
}

function proximaOrdem(array $def, array $dados): int
{
    $sql = "SELECT MAX(ordem) AS maior FROM {$def['tabela']} WHERE ativo = 1";
    $valores = [];
    if (isset($def['filtro'])) {
        $sql .= " AND {$def['filtro']} = ?";
        $valores[] = $dados[$def['filtro']];
    }
    return (int) (consultarUm($sql, $valores)['maior'] ?? 0) + 1;
}

function criar(string $entidade, array $dados): array
{
    $def = definicao($entidade);
    $limpo = validar($def, $dados);
    if (empty($limpo['ordem'])) {
        $limpo['ordem'] = proximaOrdem($def, $limpo);
    }

    if (isset($def['unico'])) {
        $existente = consultarUm("SELECT id, ativo FROM {$def['tabela']} WHERE {$def['unico']} = ?", [$limpo[$def['unico']]]);
        if ($existente && (int) $existente['ativo'] === 1) {
            erro('Já existe um cadastro com esse valor de "' . $def['unico'] . '".');
        }
        if ($existente) {
            // reaproveita o cadastro arquivado com o mesmo valor
            atualizarLinha($def, (int) $existente['id'], $limpo + ['ativo' => 1]);
            return buscar($def, (int) $existente['id']);
        }
    }

    $colunas = implode(', ', array_keys($limpo));
    $marcadores = implode(', ', array_fill(0, count($limpo), '?'));
    executar("INSERT INTO {$def['tabela']} ($colunas) VALUES ($marcadores)", array_values($limpo));
    return buscar($def, (int) db()->lastInsertId());
}

function atualizar(string $entidade, int $id, array $dados): array
{
    $def = definicao($entidade);
    // campos não enviados mantêm o valor atual
    $limpo = validar($def, $dados + buscar($def, $id));
    if (isset($def['unico'])) {
        $conflito = consultarUm("SELECT id FROM {$def['tabela']} WHERE {$def['unico']} = ? AND id <> ?", [$limpo[$def['unico']], $id]);
        if ($conflito) {
            erro('Já existe outro cadastro (talvez arquivado) com esse valor de "' . $def['unico'] . '".');
        }
    }
    atualizarLinha($def, $id, $limpo);
    return buscar($def, $id);
}

function arquivar(string $entidade, int $id): void
{
    $def = definicao($entidade);
    buscar($def, $id);
    executar("UPDATE {$def['tabela']} SET ativo = 0 WHERE id = ?", [$id]);
}

function atualizarLinha(array $def, int $id, array $valores): void
{
    $atribuicoes = implode(', ', array_map(fn ($c) => "$c = ?", array_keys($valores)));
    executar("UPDATE {$def['tabela']} SET $atribuicoes WHERE id = ?", [...array_values($valores), $id]);
}

function buscar(array $def, int $id): array
{
    $colunas = 'id, ' . implode(', ', array_keys($def['campos']));
    $linha = consultarUm("SELECT $colunas FROM {$def['tabela']} WHERE id = ? AND ativo = 1", [$id]);
    return $linha ? converterSaida($def, $linha) : erro('Cadastro não encontrado.', 404);
}

// ---------------------------------------------------------------- preços dos bolos

function tabelaDePrecos(): array
{
    $precos = [];
    foreach (consultar('SELECT tamanho_id, tipo_id, valor, fatias FROM bolo_precos') as $p) {
        $precos[$p['tamanho_id'] . ':' . $p['tipo_id']] = ['valor' => (float) $p['valor'], 'fatias' => (int) $p['fatias']];
    }
    return [
        'tamanhos' => array_map(fn ($t) => ['id' => (int) $t['id'], 'tamanho' => (int) $t['tamanho']],
            consultar('SELECT id, tamanho FROM bolo_tamanhos WHERE ativo = 1 ORDER BY ordem, tamanho')),
        'tipos' => array_map(fn ($t) => ['id' => (int) $t['id'], 'chave' => $t['chave'], 'nome' => $t['nome'], 'derivado' => (bool) $t['derivado_de']],
            consultar('SELECT id, chave, nome, derivado_de FROM bolo_tipos WHERE ativo = 1 ORDER BY ordem, id')),
        'precos' => (object) $precos,
    ];
}

/** @param array $precos [{tamanho_id, tipo_id, valor (vazio = não vende), fatias}] */
function salvarPrecos(array $precos): array
{
    emTransacao(function () use ($precos) {
        foreach ($precos as $p) {
            $tamanhoId = (int) ($p['tamanho_id'] ?? 0);
            $tipoId = (int) ($p['tipo_id'] ?? 0);
            $valor = $p['valor'] ?? '';
            executar('DELETE FROM bolo_precos WHERE tamanho_id = ? AND tipo_id = ?', [$tamanhoId, $tipoId]);
            if ($valor === '' || $valor === null) {
                continue;
            }
            $valor = (float) str_replace(',', '.', (string) $valor);
            $fatias = max(0, (int) ($p['fatias'] ?? 0));
            if ($valor < 0) erro('Preço inválido.');
            executar('INSERT INTO bolo_precos (tamanho_id, tipo_id, valor, fatias) VALUES (?, ?, ?, ?)', [$tamanhoId, $tipoId, $valor, $fatias]);
        }
    });
    return tabelaDePrecos();
}

// ---------------------------------------------------------------- usuários

function listarUsuarios(): array
{
    return array_map(fn ($u) => ['id' => (int) $u['id'], 'nome' => $u['nome'], 'login' => $u['login']],
        consultar('SELECT id, nome, login FROM usuarios WHERE ativo = 1 ORDER BY nome'));
}

function salvarUsuario(?int $id, array $dados): array
{
    $nome = trim((string) ($dados['nome'] ?? ''));
    $login = trim((string) ($dados['login'] ?? ''));
    $senha = (string) ($dados['senha'] ?? '');
    if ($nome === '' || !preg_match('/^[A-Za-z0-9._@-]{3,60}$/', $login)) {
        erro('Informe o nome e um login (mínimo 3 caracteres, sem espaços).');
    }
    if (consultarUm('SELECT id FROM usuarios WHERE login = ? AND id <> ?', [$login, $id ?? 0])) {
        erro('Esse login já está em uso.');
    }
    if ($id === null) {
        validarSenha($senha);
        executar(
            'INSERT INTO usuarios (nome, login, senha_hash, criado_em) VALUES (?, ?, ?, ?)',
            [$nome, $login, password_hash($senha, PASSWORD_DEFAULT), agora()]
        );
        $id = (int) db()->lastInsertId();
    } else {
        executar('UPDATE usuarios SET nome = ?, login = ? WHERE id = ?', [$nome, $login, $id]);
        if ($senha !== '') {
            validarSenha($senha);
            executar('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [password_hash($senha, PASSWORD_DEFAULT), $id]);
        }
    }
    return ['id' => $id, 'nome' => $nome, 'login' => $login];
}

function arquivarUsuario(int $id, array $usuarioLogado): void
{
    if ($id === $usuarioLogado['id']) {
        erro('Você não pode remover o seu próprio usuário.');
    }
    executar('UPDATE usuarios SET ativo = 0 WHERE id = ?', [$id]);
}
