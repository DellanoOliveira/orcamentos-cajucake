var tipoDefault = "pasta";
var listaDeItens = [];


function boloSelecionado(checkboxElem, eventId) {

    if (checkboxElem.checked) {
        var opcaoDefault = document.getElementById(tipoDefault + '-' + eventId);
        opcaoDefault.checked = true;
    } else {
        var opcoesDeTipo = document.getElementsByName('tipo-' + eventId);
        opcoesDeTipo.forEach((opcao) => {
            if (opcao.checked) {
                opcao.checked = false;
            }
        });
    }
    atualizarQuantidade(eventId);
    atualizaListaDeItens();    
}

function tipoSelecionado(radioElement, eventId) {
    var tamanho = eventId.split("-")[1];
    var checkboxDoTamanhodoBolo = document.getElementById(tamanho);
    checkboxDoTamanhodoBolo.checked = true;
    atualizarQuantidade(tamanho);
    atualizaListaDeItens();
}

function servicoSelecionado(checkboxElem, eventId) {
    //atualizarQuantidade(eventId);
    atualizaListaDeItens();
}

function outroProdutoSelecionado(checkboxElem, eventId) {
    atualizarQuantidade(eventId);
    atualizaListaDeItens();
}

function desmarcarCheckboxesDaOpcaoBolo() {
    var blocosOpcaoBolo = document.querySelectorAll('.opcao-bolo');

    blocosOpcaoBolo.forEach(function (bloco) {
        var inputsMarcaveis = bloco.querySelectorAll('input[type=checkbox], input[type=radio]');
        inputsMarcaveis.forEach(function (inputMarcavel) {
            inputMarcavel.checked = false;
        });
    });

    atualizaListaDeItens();
}


function atualizaListaDeItens() {
    listaDeItens = [];
    var checkboxesSelecionadas = document.querySelectorAll('input[type=checkbox]:checked');

    for (var i = 0; i < checkboxesSelecionadas.length; i++) {

        var item = {
            "descricao": "",
            "valor": "",
            "quantidade-fatias": "",
            "imagem": "",
            "quantidade": 0,
            "tipoItem": "",
            "emoji": ""
        };

        if (checkboxesSelecionadas[i].getAttribute('data-item') == "bolo") {

            var opcoesDeTipo = document.getElementsByName('tipo-' + checkboxesSelecionadas[i].id);

            opcoesDeTipo.forEach((opcao) => {
                if (opcao.checked) {
                    item.descricao =
                        checkboxesSelecionadas[i].getAttribute('data-descricao')
                        + " - " + opcao.getAttribute('data-descricao');
                    item.valor = opcao.getAttribute('data-valor');
                    item['quantidade-fatias'] = opcao.getAttribute('data-quantidade-fatias');
                    item.imagem = opcao.getAttribute('data-imagem');
                    item.quantidade = document.getElementById("quantidade-" + checkboxesSelecionadas[i].id).value;
                    item.tipoItem = checkboxesSelecionadas[i].getAttribute('data-item');
                    item.emoji = checkboxesSelecionadas[i].getAttribute('data-emoji');
                }
            });

        } else if (checkboxesSelecionadas[i].getAttribute('data-item') == "servico") {
            item.descricao = checkboxesSelecionadas[i].getAttribute('data-descricao');
            item.valor = document.getElementById('valor-' + checkboxesSelecionadas[i].id).value;
            item.tipoItem = checkboxesSelecionadas[i].getAttribute('data-item');
            item.emoji = checkboxesSelecionadas[i].getAttribute('data-emoji');
        } else if (checkboxesSelecionadas[i].getAttribute('data-item') == "outro-produto") {
            item.descricao = checkboxesSelecionadas[i].getAttribute('data-descricao');
            item.valor = checkboxesSelecionadas[i].getAttribute('valor');
            item.quantidade = document.getElementById('quantidade-' + checkboxesSelecionadas[i].id).value;
            item.tipoItem = checkboxesSelecionadas[i].getAttribute('data-item');
            item.emoji = checkboxesSelecionadas[i].getAttribute('data-emoji');
            
        }
        listaDeItens.push({
            item
        });
    }

    //console.log(listaDeItens);
    atualizarOrcamento();
}

function atualizarOrcamento() {
    var arraybolos = filtrarLista("bolo", "tipoItem", listaDeItens);
    var arrayservicos = filtrarLista("servico", "tipoItem", listaDeItens);
    var arrayoutrosprodutos = filtrarLista("outro-produto", "tipoItem", listaDeItens);

    document.getElementById("quantidade-bolos").textContent=arraybolos.length;
    document.getElementById("quantidade-servicos").textContent=arrayservicos.length;
    document.getElementById("quantidade-produtos").textContent=arrayoutrosprodutos.length;

    var quantidadeDeFatias = 0;
    var subtotal = 0;

    var orcamentoTextArea = document.getElementById('orcamento');
    var orcamentoText = "Segue seu orçamento 📋 :\n";
    // Saida de orcamento para os bolos abaixo
    if (arraybolos.length) {
        arraybolos.sort((a, b) => { (a.item.valor > b.item.valor) ? 1 : -1 });
        arraybolos.forEach((elem) => {
            var bolo = elem.item;
            subtotal += +bolo.valor * bolo.quantidade;
            quantidadeDeFatias += +bolo['quantidade-fatias'] * bolo.quantidade;
            orcamentoText += bolo.emoji + " " + bolo.quantidade + ' ' + bolo.descricao + ' - ```R$ ' + +bolo.valor * bolo.quantidade + '```\n';
        });
        rederizarVisualizarBolo(arraybolos);
    }

    // Saida de orcamento para os outros produtos abaixo
    if (arrayoutrosprodutos.length) {
        arrayoutrosprodutos.sort((a, b) => { (a.item.valor > b.item.valor) ? 1 : -1 });
        arrayoutrosprodutos.forEach((elem) => {
            var produto = elem.item;
            subtotal += +produto.valor * produto.quantidade;
            orcamentoText += produto.emoji + " " + produto.quantidade + ' ' + produto.descricao + ' - ```R$ ' + +produto.valor * produto.quantidade + '```\n';
        });

    }

    // Saida de orcamento para os servicos abaixo
    if (arrayservicos.length) {
        arrayservicos.sort((a, b) => { (a.item.valor > b.item.valor) ? 1 : -1 });
        arrayservicos.forEach((elem) => {
            var servico = elem.item;
            
            if (servico.descricao == "Adicional Desconto")
                subtotal += -servico.valor;
            else
                subtotal += +servico.valor

            orcamentoText += servico.emoji + " " + servico.descricao + ' - ```R$ ' + servico.valor + '```\n';
        });

    }

    orcamentoText += "___________________\n";
    orcamentoText += "*Total: R$ " + subtotal + '*\n';

    if (quantidadeDeFatias)
        orcamentoText += "Quantidade de Fatias: " + quantidadeDeFatias + ' 🍰\n';

    orcamentoText += "```Gerado em " + getDataDeGeracaoDoOrcamento() + "```";
    orcamentoTextArea.value = orcamentoText;
}

function copiarOrcamentoProClipboard() {
    
    /* Get the text field */
    var copyText = document.getElementById("orcamento");

    /* Select the text field */
    copyText.select();
    copyText.setSelectionRange(0, 99999); /*For mobile devices*/

    /* Copy the text inside the text field */
    document.execCommand("copy");

    /* Alert the copied text */
   // alert("Orçamento copiado: " + copyText.value);
  
}

function filtrarLista(key, index, list) {
    var array = [];
    list.forEach((elem) => {
        if (elem.item[index] == key) {
            array.push(elem);
        }
    });
    return array;
}

function getDataDeGeracaoDoOrcamento() {
    var dt = new Date();
    // ensure date comes as 01, 09 etc
    var DD = ("0" + dt.getDate()).slice(-2);
    // getMonth returns month from 0
    var MM = ("0" + (dt.getMonth() + 1)).slice(-2);
    var YYYY = dt.getFullYear();
    var hh = ("0" + dt.getHours()).slice(-2);
    var mm = ("0" + dt.getMinutes()).slice(-2);
    var ss = ("0" + dt.getSeconds()).slice(-2);

    var date_string = DD + "/" + MM + "/" + YYYY + " às " + hh + ":" + mm + ":" + ss;
    return date_string;
}

function atualizarQuantidade(id) {
    var quantidadeInput = document.getElementById("quantidade-" + id);

    if (quantidadeInput.value <= 1) {
        quantidadeInput.value = 1;
    }
}

function rederizarVisualizarBolo(listaDeBolos) {
    var bolos = {"bolos": []};
    for (var i = 0; i < listaDeBolos.length; i++) {
     //   console.log(listaDeBolos[i])
     
     if (listaDeBolos[i].item.imagem)
        bolos.bolos.push({
                            "img": listaDeBolos[i].item.imagem,
                            "quantidade-fatias" :  listaDeBolos[i].item["quantidade-fatias"]
                        });
    }
   // console.log(JSON.stringify(bolos))
    var template = document.getElementById('template-visualizar-bolo').innerHTML;
    var rendered = Mustache.render(template, bolos);
    document.getElementById('visualizar-bolo').innerHTML = rendered;
}

function rederizarOpcoesDeBolo() {

    loadJSON('js/bolos.json', function (response) {
        // Parse JSON string into object
        var listaDeBolos = JSON.parse(response);

        var template = document.getElementById('template-opcoes-de-bolo').innerHTML;
        var rendered = Mustache.render(template, listaDeBolos);
        document.getElementById('opcoes-de-bolo').innerHTML = rendered;
    });
}

function rederizarOpcoesOutrosProdutos() {

    loadJSON('js/outros-produtos.json', function (response) {
        // Parse JSON string into object
        var listaDeBolos = JSON.parse(response);

        var template = document.getElementById('template-outros-produtos').innerHTML;
        var rendered = Mustache.render(template, listaDeBolos);
        document.getElementById('outros-produtos').innerHTML = rendered;
    });
}

function rederizarOpcoesDeServico() {

    loadJSON('js/servicos.json', function (response) {
        // Parse JSON string into object
        var listaDeServicos = JSON.parse(response);

        var template = document.getElementById('template-opcoes-de-servico').innerHTML;
        var rendered = Mustache.render(template, listaDeServicos);
        document.getElementById('opcoes-de-servico').innerHTML = rendered;
    });
}

function loadJSON(url, callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', url, true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}

function sugerirArranjosGulosos(totalFatias, tipo, dadosBolos, quantidadeSugestoes) {
    var total = +totalFatias;
    var limite = quantidadeSugestoes || 6;

    if (!dadosBolos || !dadosBolos.bolos || !dadosBolos.bolos.length) {
        return [];
    }

    if (!total || total <= 0) {
        return [];
    }

    var opcoes = extrairOpcoesDeFatiasPorTipo(dadosBolos, tipo);
    if (!opcoes.length) {
        return [];
    }

    var estrategias = [
        "maior-ate-restante",
        "mais-proximo-restante",
        "menor-acima-restante",
        "menor-primeiro",
        "maior-primeiro",
        "gradacao-5-10"
    ];

    var candidatos = [];
    for (var i = 0; i < estrategias.length; i++) {
        var arranjo = montarArranjoGuloso(total, opcoes, estrategias[i], tipo);
        if (arranjo.tamanhos.length) {
            candidatos.push(arranjo);
        }
    }

    candidatos.sort(function (a, b) {
        if (a.diferenca !== b.diferenca) {
            return a.diferenca - b.diferenca;
        }
        if (a.quantidadeBolos !== b.quantidadeBolos) {
            return a.quantidadeBolos - b.quantidadeBolos;
        }
        return a.totalFatias - b.totalFatias;
    });

    var unicos = [];
    var vistos = {};
    for (var j = 0; j < candidatos.length; j++) {
        var chave = candidatos[j].tamanhos.join("-");
        if (!vistos[chave]) {
            vistos[chave] = true;
            unicos.push(candidatos[j]);
        }
        if (unicos.length >= limite) {
            break;
        }
    }

    return unicos;
}

function extrairOpcoesDeFatiasPorTipo(dadosBolos, tipo) {
    var opcoes = [];

    for (var i = 0; i < dadosBolos.bolos.length; i++) {
        var bolo = dadosBolos.bolos[i];
        if (!bolo.tipos || !bolo.tipos.length) {
            continue;
        }

        var tipoInfo = bolo.tipos[0][tipo];
        if (!tipoInfo) {
            continue;
        }

        var fatias = +tipoInfo["quantidade-fatias"];
        if (fatias > 0) {
            opcoes.push({
                tamanho: +bolo.tamanho,
                fatias: fatias
            });
        }
    }

    return opcoes;
}

function montarArranjoGuloso(totalFatias, opcoes, estrategia, tipoBolo) {
    if (estrategia === "gradacao-5-10") {
        return montarArranjoGradacao510(totalFatias, opcoes, tipoBolo);
    }

    var disponiveis = opcoes.slice();
    var restante = totalFatias;
    var tamanhos = [];
    var total = 0;

    while (disponiveis.length) {
        var escolhido = escolherMelhorOpcao(restante, disponiveis, estrategia);
        if (!escolhido) {
            break;
        }

        tamanhos.push(escolhido.tamanho);
        total += escolhido.fatias;
        restante = totalFatias - total;

        var indice = disponiveis.indexOf(escolhido);
        if (indice >= 0) {
            disponiveis.splice(indice, 1);
        }

        if (restante <= 0) {
            break;
        }
    }

    tamanhos.sort(function (a, b) { return a - b; });

    return {
        estrategia: estrategia,
        tipoBolo: tipoBolo,
        tamanhos: tamanhos,
        totalFatias: total,
        diferenca: Math.abs(totalFatias - total),
        quantidadeBolos: tamanhos.length
    };
}

function montarArranjoGradacao510(totalFatias, opcoes, tipoBolo) {
    var melhorArranjo = null;
    var melhorDiferenca = Infinity;

    function gerarCombinacoesGradacao(tamanhoAtual, totalAcumulado, tamanhosSelecionados, indiceInicial) {
        if (tamanhosSelecionados.length > 0) {
            var diferenca = Math.abs(totalFatias - totalAcumulado);
            if (diferenca < melhorDiferenca) {
                melhorDiferenca = diferenca;
                melhorArranjo = {
                    tamanhos: tamanhosSelecionados.slice(),
                    totalFatias: totalAcumulado,
                    diferenca: diferenca
                };
            }
        }

        if (totalAcumulado >= totalFatias) {
            return;
        }

        for (var i = indiceInicial; i < opcoes.length; i++) {
            var proximoTamanho = opcoes[i].tamanho;
            var proximasFatias = opcoes[i].fatias;

            // Se é o primeiro, adiciona sem verificar distância
            if (tamanhosSelecionados.length === 0) {
                tamanhosSelecionados.push(proximoTamanho);
                gerarCombinacoesGradacao(proximoTamanho, totalAcumulado + proximasFatias, tamanhosSelecionados, i + 1);
                tamanhosSelecionados.pop();
            } else {
                // Verifica se a distância é 5 ou 10
                var distancia = Math.abs(proximoTamanho - tamanhoAtual);
                if (distancia === 5 || distancia === 10) {
                    tamanhosSelecionados.push(proximoTamanho);
                    gerarCombinacoesGradacao(proximoTamanho, totalAcumulado + proximasFatias, tamanhosSelecionados, i + 1);
                    tamanhosSelecionados.pop();
                }
            }
        }
    }

    gerarCombinacoesGradacao(null, 0, [], 0);

    var tamanhos = melhorArranjo ? melhorArranjo.tamanhos.slice().sort(function (a, b) { return a - b; }) : [];

    return {
        estrategia: "gradacao-5-10",
        tipoBolo: tipoBolo,
        tamanhos: tamanhos,
        totalFatias: melhorArranjo ? melhorArranjo.totalFatias : 0,
        diferenca: melhorDiferenca === Infinity ? 0 : melhorDiferenca,
        quantidadeBolos: tamanhos.length
    };
}

function escolherMelhorOpcao(restante, disponiveis, estrategia) {
    var i;
    var candidatosAteRestante = [];
    var candidatosAcimaRestante = [];

    for (i = 0; i < disponiveis.length; i++) {
        if (disponiveis[i].fatias <= restante) {
            candidatosAteRestante.push(disponiveis[i]);
        } else {
            candidatosAcimaRestante.push(disponiveis[i]);
        }
    }

    if (estrategia === "menor-primeiro") {
        return obterMenorFatias(disponiveis);
    }

    if (estrategia === "maior-primeiro") {
        return obterMaiorFatias(disponiveis);
    }

    if (estrategia === "mais-proximo-restante") {
        return obterMaisProximoDoRestante(restante, disponiveis);
    }

    if (estrategia === "menor-acima-restante") {
        if (candidatosAcimaRestante.length) {
            return obterMenorFatias(candidatosAcimaRestante);
        }
        return obterMaiorFatias(candidatosAteRestante);
    }

    if (candidatosAteRestante.length) {
        return obterMaiorFatias(candidatosAteRestante);
    }

    return obterMenorFatias(candidatosAcimaRestante);
}

function obterMaiorFatias(lista) {
    if (!lista.length) {
        return null;
    }

    var maior = lista[0];
    for (var i = 1; i < lista.length; i++) {
        if (lista[i].fatias > maior.fatias) {
            maior = lista[i];
        }
    }

    return maior;
}

function obterMenorFatias(lista) {
    if (!lista.length) {
        return null;
    }

    var menor = lista[0];
    for (var i = 1; i < lista.length; i++) {
        if (lista[i].fatias < menor.fatias) {
            menor = lista[i];
        }
    }

    return menor;
}

function obterMaisProximoDoRestante(restante, lista) {
    if (!lista.length) {
        return null;
    }

    var melhor = lista[0];
    var melhorDiferenca = Math.abs(restante - lista[0].fatias);

    for (var i = 1; i < lista.length; i++) {
        var diferencaAtual = Math.abs(restante - lista[i].fatias);
        if (diferencaAtual < melhorDiferenca) {
            melhor = lista[i];
            melhorDiferenca = diferencaAtual;
        }
    }

    return melhor;
}

function sugerirArranjosGulososDeArquivo(totalFatias, tipo, callback) {
    loadJSON('js/bolos.json', function (response) {
        var dadosBolos = JSON.parse(response);
        var sugestoes = sugerirArranjosGulosos(totalFatias, tipo, dadosBolos, 6);
        callback(sugestoes);
    });
}

function preencherSelectDeEstrategias(resultado, estrategiaSelecionada) {
    var selectEstrategia = document.getElementById("select-estrategia-sugestao");
    selectEstrategia.innerHTML = "";

    if (!resultado || !resultado.length) {
        return "";
    }

    var estrategiaExisteNoResultado = false;
    for (var i = 0; i < resultado.length; i++) {
        var estrategiaAtual = resultado[i].estrategia;
        var option = document.createElement("option");
        option.value = estrategiaAtual;
        option.textContent = estrategiaAtual;
        selectEstrategia.appendChild(option);

        if (estrategiaAtual === estrategiaSelecionada) {
            estrategiaExisteNoResultado = true;
        }
    }

    var estrategiaEfetiva = estrategiaExisteNoResultado
        ? estrategiaSelecionada
        : resultado[0].estrategia;

    selectEstrategia.value = estrategiaEfetiva;
    return estrategiaEfetiva;
}


function rederizarSugestoesDeArranjosGulosos(totalFatias) {
   
    desmarcarCheckboxesDaOpcaoBolo();

    var estrategiaSelecionada = document.getElementById("select-estrategia-sugestao").value;
    var tipoSelecionado = document.getElementById("select-tipo-bolo").value;

    totalFatias = parseInt(document.getElementById("quantidade-fatias-sugestao").value, 10) || totalFatias;
    
    sugerirArranjosGulososDeArquivo(totalFatias, tipoSelecionado, function(resultado) { 
        var estrategiaEfetiva = preencherSelectDeEstrategias(resultado, estrategiaSelecionada);
        if (!estrategiaEfetiva) {
            return;
        }

        var sugestaoSelecionada = resultado.find(function (u) {
            return u.estrategia === estrategiaEfetiva;
        });
        var tamanhos = sugestaoSelecionada ? sugestaoSelecionada.tamanhos : [];

        tamanhos.forEach((tamanho) => {
            var checkboxDoTamanho = document.getElementById(tamanho);
            var opcaoDefault = document.getElementById(tipoSelecionado + '-' + tamanho);  
             checkboxDoTamanho.checked = true;
             opcaoDefault.checked = true;
             atualizarQuantidade(tamanho); 
        });
        atualizaListaDeItens(); 

    });
    
}