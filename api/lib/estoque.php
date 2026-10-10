<?php
// Estoque: seções (grade = por tamanho de bolo, lista = itens agrupados) e quantidades.

declare(strict_types=1);

function estoque(): array
{
    $tamanhos = array_map('intval', array_column(
        consultar('SELECT tamanho FROM bolo_tamanhos WHERE ativo = 1 ORDER BY ordem, tamanho'),
        'tamanho'
    ));

    $itensPorSecao = [];
    foreach (consultar('SELECT * FROM estoque_itens WHERE ativo = 1 ORDER BY ordem, id') as $item) {
        $itensPorSecao[$item['secao_id']][] = [
            'id' => (int) $item['id'],
            'grupo' => $item['grupo'] ?: null,
            'nome' => $item['nome'],
            'plural' => $item['plural'] ?: null,
            'emoji' => $item['emoji'] ?: '📦',
        ];
    }

    $secoes = [];
    foreach (consultar('SELECT * FROM estoque_secoes WHERE ativo = 1 ORDER BY ordem, id') as $s) {
        $secoes[] = [
            'id' => (int) $s['id'],
            'nome' => $s['nome'],
            'emoji' => $s['emoji'] ?: '📦',
            'modo' => $s['modo'] === 'grade' ? 'grade' : 'lista',
            'itens' => $itensPorSecao[$s['id']] ?? [],
        ];
    }

    $quantidades = [];
    foreach (consultar('SELECT item_id, tamanho, quantidade FROM estoque_quantidades') as $q) {
        $quantidades[$q['item_id'] . ':' . $q['tamanho']] = (int) $q['quantidade'];
    }

    $ultima = consultarUm(
        'SELECT q.atualizado_em, u.nome FROM estoque_quantidades q
         LEFT JOIN usuarios u ON u.id = q.usuario_id
         ORDER BY q.atualizado_em DESC LIMIT 1'
    );

    return [
        'tamanhos' => $tamanhos,
        'secoes' => $secoes,
        'quantidades' => (object) $quantidades,
        'ultimaAtualizacao' => $ultima ? ['em' => $ultima['atualizado_em'], 'por' => $ultima['nome']] : null,
    ];
}

/**
 * Grava quantidades e registra cada mudança no histórico (estoque_movimentos).
 * @param array $itens [{item_id, tamanho, quantidade}]
 */
function salvarQuantidades(array $itens, array $usuario): array
{
    if (!$itens || count($itens) > 2000) {
        erro('Nenhuma quantidade para salvar.');
    }

    return emTransacao(function () use ($itens, $usuario) {
        $salvos = [];
        $momento = agora();
        foreach ($itens as $entrada) {
            $itemId = (int) ($entrada['item_id'] ?? 0);
            $tamanho = max(0, (int) ($entrada['tamanho'] ?? 0));
            $quantidade = (int) ($entrada['quantidade'] ?? -1);
            if ($quantidade < 0 || $quantidade > 99999) {
                erro('Quantidade inválida.');
            }
            if (!consultarUm('SELECT id FROM estoque_itens WHERE id = ? AND ativo = 1', [$itemId])) {
                erro('Item de estoque não encontrado (id ' . $itemId . ').', 404);
            }

            $atual = consultarUm('SELECT quantidade FROM estoque_quantidades WHERE item_id = ? AND tamanho = ?', [$itemId, $tamanho]);
            $anterior = $atual ? (int) $atual['quantidade'] : 0;
            if ($atual && $anterior === $quantidade) {
                continue;
            }

            if ($atual) {
                executar(
                    'UPDATE estoque_quantidades SET quantidade = ?, atualizado_em = ?, usuario_id = ? WHERE item_id = ? AND tamanho = ?',
                    [$quantidade, $momento, $usuario['id'], $itemId, $tamanho]
                );
            } else {
                executar(
                    'INSERT INTO estoque_quantidades (item_id, tamanho, quantidade, atualizado_em, usuario_id) VALUES (?, ?, ?, ?, ?)',
                    [$itemId, $tamanho, $quantidade, $momento, $usuario['id']]
                );
            }
            executar(
                'INSERT INTO estoque_movimentos (item_id, tamanho, anterior, nova, usuario_id, criado_em) VALUES (?, ?, ?, ?, ?, ?)',
                [$itemId, $tamanho, $anterior, $quantidade, $usuario['id'], $momento]
            );
            $salvos[] = ['item_id' => $itemId, 'tamanho' => $tamanho, 'quantidade' => $quantidade];
        }
        return ['salvos' => $salvos, 'em' => $momento, 'por' => $usuario['nome']];
    });
}
