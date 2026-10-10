<?php
// Copie este arquivo para api/config.php e preencha com os dados do banco.
// O config.php NÃO vai para o GitHub (está no .gitignore), pois contém a senha do banco.

return [
    // ---- HostGator (MySQL criado no cPanel > "Bancos de dados MySQL")
    'db' => [
        'driver' => 'mysql',
        'host' => 'localhost',
        'nome' => 'usuariocpanel_cajucake',   // nome completo do banco (com o prefixo do cPanel)
        'usuario' => 'usuariocpanel_app',     // usuário do banco (com o prefixo do cPanel)
        'senha' => 'troque-esta-senha',
    ],

    // ---- Testes no computador (SQLite, não precisa instalar MySQL)
    // 'db' => [
    //     'driver' => 'sqlite',
    //     'arquivo' => __DIR__ . '/dados/local.sqlite',
    // ],

    'sessao_nome' => 'cajucake_sessao',
];
