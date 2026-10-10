<?php
// Catálogo usado pela calculadora de orçamentos (mesmo formato que os antigos JSONs).

declare(strict_types=1);

function catalogo(): array
{
    $tamanhos = consultar('SELECT id, tamanho, emoji FROM bolo_tamanhos WHERE ativo = 1 ORDER BY ordem, tamanho');
    $tipos = consultar('SELECT * FROM bolo_tipos WHERE ativo = 1 ORDER BY ordem, id');

    $precos = [];
    foreach (consultar('SELECT tamanho_id, tipo_id, valor, fatias FROM bolo_precos') as $p) {
        $precos[$p['tamanho_id'] . ':' . $p['tipo_id']] = ['valor' => (float) $p['valor'], 'fatias' => (int) $p['fatias']];
    }

    $idPorChave = array_column($tipos, 'id', 'chave');
    $tiposSaida = [];
    foreach ($tipos as $t) {
        $tiposSaida[$t['chave']] = [
            'nome' => $t['nome'],
            'curto' => $t['curto'],
            'descricao' => $t['descricao'],
            'alturaCm' => (int) $t['altura_cm'],
            'estilo' => $t['estilo'] ?: null,
            'cores' => [
                'lateral' => $t['cor_lateral'],
                'sombra' => $t['cor_sombra'],
                'topo' => $t['cor_topo'],
                'detalhe' => $t['cor_detalhe'],
            ],
            'derivado' => $t['derivado_de'] ? ['de' => $t['derivado_de'], 'fatorPreco' => (float) $t['fator_preco']] : null,
        ];
    }

    $bolos = [];
    foreach ($tamanhos as $tamanho) {
        $tiposDoTamanho = [];
        foreach ($tipos as $t) {
            if ($t['derivado_de']) {
                // preço calculado a partir de outro tipo (ex.: Fake 5cm = 50% do Fake)
                $origem = $precos[$tamanho['id'] . ':' . ($idPorChave[$t['derivado_de']] ?? 0)] ?? null;
                if ($origem) {
                    $tiposDoTamanho[$t['chave']] = [
                        'valor' => round($origem['valor'] * (float) $t['fator_preco'], 2),
                        'fatias' => $origem['fatias'],
                    ];
                }
            } elseif (isset($precos[$tamanho['id'] . ':' . $t['id']])) {
                $tiposDoTamanho[$t['chave']] = $precos[$tamanho['id'] . ':' . $t['id']];
            }
        }
        if ($tiposDoTamanho) {
            $bolos[] = ['tamanho' => (int) $tamanho['tamanho'], 'emoji' => $tamanho['emoji'] ?: '🎂', 'tipos' => $tiposDoTamanho];
        }
    }

    $cortes = array_map(fn ($c) => [
        'tamanho' => (int) $c['tamanho'],
        'valor' => (float) $c['valor'],
        'fatias' => (int) $c['fatias'],
    ], consultar('SELECT tamanho, valor, fatias FROM bolo_corte WHERE ativo = 1 ORDER BY ordem, tamanho'));

    $produtosPorSecao = [];
    foreach (consultar('SELECT * FROM produtos WHERE ativo = 1 ORDER BY ordem, id') as $p) {
        $produtosPorSecao[$p['secao_id']][] = [
            'id' => (int) $p['id'],
            'nome' => $p['nome'],
            'valor' => (float) $p['valor'],
            'emoji' => $p['emoji'] ?: '🧁',
            'passo' => max(1, (int) $p['passo']),
        ];
    }
    $secoes = [];
    foreach (consultar('SELECT * FROM produto_secoes WHERE ativo = 1 ORDER BY ordem, id') as $s) {
        $secoes[] = [
            'id' => (int) $s['id'],
            'nome' => $s['nome'],
            'emoji' => $s['emoji'] ?: '🧁',
            'produtos' => $produtosPorSecao[$s['id']] ?? [],
        ];
    }

    $servicos = array_map(fn ($s) => [
        'id' => (int) $s['id'],
        'descricao' => $s['descricao'],
        'valor' => (float) $s['valor'],
        'emoji' => $s['emoji'] ?: '✨',
        'desconto' => (bool) $s['desconto'],
    ], consultar('SELECT * FROM servicos WHERE ativo = 1 ORDER BY ordem, id'));

    return [
        'tipos' => $tiposSaida,
        'bolos' => ['bolos' => $bolos],
        'bolosCorte' => ['emoji' => '🍰', 'bolos' => $cortes],
        'secoesProdutos' => $secoes,
        'servicos' => ['servicos' => $servicos],
    ];
}
