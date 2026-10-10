<?php
// Estrutura do banco (funciona em MySQL e SQLite) e importação dos dados iniciais.

declare(strict_types=1);

function criarTabelas(): void
{
    $id = ehMysql() ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    $sufixo = ehMysql() ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' : '';

    $tabelas = [
        "usuarios (
            id $id,
            nome VARCHAR(100) NOT NULL,
            login VARCHAR(60) NOT NULL UNIQUE,
            senha_hash VARCHAR(255) NOT NULL,
            ativo SMALLINT NOT NULL DEFAULT 1,
            criado_em DATETIME NOT NULL
        )",

        // ---------------- catálogo do orçamento
        "bolo_tamanhos (
            id $id,
            tamanho INT NOT NULL UNIQUE,
            emoji VARCHAR(16) NULL,
            ordem INT NOT NULL DEFAULT 0,
            ativo SMALLINT NOT NULL DEFAULT 1
        )",
        "bolo_tipos (
            id $id,
            chave VARCHAR(30) NOT NULL UNIQUE,
            nome VARCHAR(80) NOT NULL,
            curto VARCHAR(30) NOT NULL,
            descricao VARCHAR(120) NOT NULL,
            altura_cm INT NOT NULL DEFAULT 10,
            estilo VARCHAR(30) NULL,
            cor_lateral VARCHAR(7) NOT NULL,
            cor_sombra VARCHAR(7) NOT NULL,
            cor_topo VARCHAR(7) NOT NULL,
            cor_detalhe VARCHAR(7) NOT NULL,
            derivado_de VARCHAR(30) NULL,
            fator_preco DECIMAL(6,3) NULL,
            ordem INT NOT NULL DEFAULT 0,
            ativo SMALLINT NOT NULL DEFAULT 1
        )",
        "bolo_precos (
            id $id,
            tamanho_id INT NOT NULL,
            tipo_id INT NOT NULL,
            valor DECIMAL(10,2) NOT NULL,
            fatias INT NOT NULL DEFAULT 0,
            UNIQUE (tamanho_id, tipo_id),
            FOREIGN KEY (tamanho_id) REFERENCES bolo_tamanhos(id),
            FOREIGN KEY (tipo_id) REFERENCES bolo_tipos(id)
        )",
        "bolo_corte (
            id $id,
            tamanho INT NOT NULL UNIQUE,
            valor DECIMAL(10,2) NOT NULL,
            fatias INT NOT NULL DEFAULT 0,
            ordem INT NOT NULL DEFAULT 0,
            ativo SMALLINT NOT NULL DEFAULT 1
        )",
        "produto_secoes (
            id $id,
            nome VARCHAR(80) NOT NULL,
            emoji VARCHAR(16) NULL,
            ordem INT NOT NULL DEFAULT 0,
            ativo SMALLINT NOT NULL DEFAULT 1
        )",
        "produtos (
            id $id,
            secao_id INT NOT NULL,
            nome VARCHAR(120) NOT NULL,
            valor DECIMAL(10,2) NOT NULL,
            emoji VARCHAR(16) NULL,
            passo INT NOT NULL DEFAULT 1,
            ordem INT NOT NULL DEFAULT 0,
            ativo SMALLINT NOT NULL DEFAULT 1,
            FOREIGN KEY (secao_id) REFERENCES produto_secoes(id)
        )",
        "servicos (
            id $id,
            descricao VARCHAR(120) NOT NULL,
            valor DECIMAL(10,2) NOT NULL DEFAULT 0,
            emoji VARCHAR(16) NULL,
            desconto SMALLINT NOT NULL DEFAULT 0,
            ordem INT NOT NULL DEFAULT 0,
            ativo SMALLINT NOT NULL DEFAULT 1
        )",

        // ---------------- estoque
        "estoque_secoes (
            id $id,
            nome VARCHAR(80) NOT NULL,
            emoji VARCHAR(16) NULL,
            modo VARCHAR(10) NOT NULL DEFAULT 'lista',
            ordem INT NOT NULL DEFAULT 0,
            ativo SMALLINT NOT NULL DEFAULT 1
        )",
        "estoque_itens (
            id $id,
            secao_id INT NOT NULL,
            grupo VARCHAR(80) NULL,
            nome VARCHAR(120) NOT NULL,
            plural VARCHAR(120) NULL,
            emoji VARCHAR(16) NULL,
            ordem INT NOT NULL DEFAULT 0,
            ativo SMALLINT NOT NULL DEFAULT 1,
            FOREIGN KEY (secao_id) REFERENCES estoque_secoes(id)
        )",
        "estoque_quantidades (
            item_id INT NOT NULL,
            tamanho INT NOT NULL DEFAULT 0,
            quantidade INT NOT NULL DEFAULT 0,
            atualizado_em DATETIME NOT NULL,
            usuario_id INT NULL,
            PRIMARY KEY (item_id, tamanho),
            FOREIGN KEY (item_id) REFERENCES estoque_itens(id)
        )",
        "estoque_movimentos (
            id $id,
            item_id INT NOT NULL,
            tamanho INT NOT NULL DEFAULT 0,
            anterior INT NOT NULL,
            nova INT NOT NULL,
            usuario_id INT NULL,
            criado_em DATETIME NOT NULL
        )",
    ];

    foreach ($tabelas as $tabela) {
        db()->exec('CREATE TABLE IF NOT EXISTS ' . $tabela . $sufixo);
    }
}

/** Importa os dados atuais (api/dados-iniciais/*.json) se o catálogo estiver vazio. */
function importarDadosIniciais(): array
{
    $importado = [];
    $ler = fn (string $arquivo) => json_decode(file_get_contents(__DIR__ . '/../dados-iniciais/' . $arquivo), true);

    if (!consultarUm('SELECT id FROM bolo_tipos')) {
        $tipos = [
            ['pasta', 'Pasta Americana', 'Pasta', 'Artístico Decorado', 10, null, '#f6b8d1', '#e58fb3', '#fcd6e5', '#ffffff', null, null],
            ['glace', 'Glacê / Chantilly', 'Glacê', 'Glacê/Chantilly', 10, null, '#fff8ef', '#ecdcc8', '#ffffff', '#f3b6cf', null, null],
            ['naked', 'Naked Cake', 'Naked', 'Naked', 10, null, '#d9a066', '#b57a45', '#fff3e0', '#c9364f', null, null],
            ['fake', 'Fake (cenográfico)', 'Fake', 'Fake', 10, null, '#cfd8f6', '#a9b5e3', '#e6ebfc', '#ffffff', null, null],
            ['fake5', 'Fake 5 cm (meia altura)', 'Fake 5cm', 'Fake 5cm (meia altura)', 5, 'fake', '#cfd8f6', '#a9b5e3', '#e6ebfc', '#ffffff', 'fake', 0.5],
            ['torta', 'Torta', 'Torta', 'Torta', 5, null, '#e7b75f', '#c48f3a', '#f6d48e', '#a8682a', null, null],
        ];
        foreach ($tipos as $ordem => $t) {
            executar(
                'INSERT INTO bolo_tipos (chave, nome, curto, descricao, altura_cm, estilo, cor_lateral, cor_sombra, cor_topo, cor_detalhe, derivado_de, fator_preco, ordem)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [...$t, $ordem + 1]
            );
        }

        $idsTipo = array_column(consultar('SELECT id, chave FROM bolo_tipos'), 'id', 'chave');
        foreach ($ler('bolos.json')['bolos'] as $ordem => $bolo) {
            executar('INSERT INTO bolo_tamanhos (tamanho, emoji, ordem) VALUES (?, ?, ?)', [$bolo['tamanho'], $bolo['emoji'] ?? '🎂', $ordem + 1]);
            $idTamanho = db()->lastInsertId();
            foreach ($bolo['tipos'] as $chave => $preco) {
                if (isset($idsTipo[$chave])) {
                    executar(
                        'INSERT INTO bolo_precos (tamanho_id, tipo_id, valor, fatias) VALUES (?, ?, ?, ?)',
                        [$idTamanho, $idsTipo[$chave], $preco['valor'], $preco['fatias']]
                    );
                }
            }
        }
        $importado[] = 'bolos';
    }

    if (!consultarUm('SELECT id FROM bolo_corte')) {
        foreach ($ler('bolos-corte.json')['bolos'] as $ordem => $corte) {
            executar('INSERT INTO bolo_corte (tamanho, valor, fatias, ordem) VALUES (?, ?, ?, ?)', [$corte['tamanho'], $corte['valor'], $corte['fatias'], $ordem + 1]);
        }
        $importado[] = 'bolos de corte';
    }

    if (!consultarUm('SELECT id FROM produto_secoes')) {
        executar('INSERT INTO produto_secoes (nome, emoji, ordem) VALUES (?, ?, ?)', ['Doces & Salgados', '🧁', 1]);
        $idSecao = db()->lastInsertId();
        foreach ($ler('outros-produtos.json')['produtos'] as $ordem => $p) {
            executar(
                'INSERT INTO produtos (secao_id, nome, valor, emoji, passo, ordem) VALUES (?, ?, ?, ?, ?, ?)',
                [$idSecao, $p['nome'], $p['valor'], $p['emoji'], $p['passo'] ?? 1, $ordem + 1]
            );
        }
        $importado[] = 'produtos';
    }

    if (!consultarUm('SELECT id FROM servicos')) {
        foreach ($ler('servicos.json')['servicos'] as $ordem => $s) {
            executar(
                'INSERT INTO servicos (descricao, valor, emoji, desconto, ordem) VALUES (?, ?, ?, ?, ?)',
                [$s['descricao'], $s['valor'], $s['emoji'], empty($s['desconto']) ? 0 : 1, $ordem + 1]
            );
        }
        $importado[] = 'adicionais';
    }

    if (!consultarUm('SELECT id FROM estoque_secoes')) {
        $estoque = $ler('estoque.json');
        executar('INSERT INTO estoque_secoes (nome, emoji, modo, ordem) VALUES (?, ?, ?, ?)', ['Bolos', '🎂', 'grade', 1]);
        $idBolos = db()->lastInsertId();
        foreach ($estoque['sabores'] as $ordem => $sabor) {
            executar(
                'INSERT INTO estoque_itens (secao_id, nome, plural, emoji, ordem) VALUES (?, ?, ?, ?, ?)',
                [$idBolos, $sabor['nome'], $sabor['plural'], $sabor['emoji'], $ordem + 1]
            );
        }
        executar('INSERT INTO estoque_secoes (nome, emoji, modo, ordem) VALUES (?, ?, ?, ?)', ['Recheios', '🍯', 'lista', 2]);
        $idRecheios = db()->lastInsertId();
        $ordem = 0;
        foreach ($estoque['recheios'] as $grupo) {
            foreach ($grupo['itens'] as $item) {
                executar(
                    'INSERT INTO estoque_itens (secao_id, grupo, nome, emoji, ordem) VALUES (?, ?, ?, ?, ?)',
                    [$idRecheios, $grupo['grupo'], $item['nome'], $item['emoji'], ++$ordem]
                );
            }
        }
        $importado[] = 'estoque';
    }

    return $importado;
}
