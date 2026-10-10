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