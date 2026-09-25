# METEO OPMET Simulator — v2

Simulador educacional de evolução meteorológica para treinamento de METAR/SPECI.

## Correção principal da v2

A versão anterior carregava vários módulos JavaScript. Um dos módulos (`scenarios.js`) continha literais numéricos com zero à esquerda (por exemplo `090`, `06`, `03`). Como módulos JavaScript são executados em modo estrito, esses literais provocavam erro de sintaxe e impediam todo o aplicativo de iniciar. O resultado era exatamente o comportamento observado: o HTML/CSS aparecia, mas os seletores permaneciam vazios e os botões não reagiam.

A v2 corrige esses literais e, adicionalmente, consolida o código em **um único `js/app.js`**, carregado com `defer`, reduzindo a quantidade de pontos de falha no GitHub Pages.

## Melhorias

- JavaScript consolidado em um único arquivo: `js/app.js`.
- Sem `type="module"` e sem cadeia de imports entre arquivos.
- Caminhos relativos explícitos (`./css/style.css` e `./js/app.js`).
- Diagnóstico visual de inicialização se o JavaScript não carregar.
- Botão para recarregar após falha de carregamento.
- Marcador `window.__METEO_APP_READY__` para confirmar o bootstrap.
- Mantidos os recursos da v1: cenários, evolução temporal, METAR, SPECI, modo aluno, histórico local e exportação JSON.

## Estrutura

```text
Meteorological_Simulator/
├── index.html
├── README.md
├── .gitignore
├── css/
│   └── style.css
└── js/
    └── app.js
```

## Publicação no GitHub Pages

1. Copie o conteúdo deste projeto para a raiz do repositório `Meteorological_Simulator`.
2. Faça commit e push.
3. Em **Settings → Pages**, selecione a branch de publicação e `/ (root)`.
4. Aguarde a publicação.
5. No navegador, use `Ctrl+Shift+R` para eliminar cache da versão anterior.

## Diagnóstico

Se o JavaScript não carregar, a v2 exibe um aviso no topo. Se os campos **Aeródromo** e **Cenário** estiverem preenchidos, o bootstrap foi executado.

No console do navegador (`F12` → Console), erros 404 em `js/app.js` indicam problema de publicação/estrutura do repositório.

## Aviso

Ferramenta exclusivamente educacional. As regras de codificação METAR/SPECI e os critérios de emissão devem ser conferidos na documentação normativa vigente antes de qualquer utilização operacional.
