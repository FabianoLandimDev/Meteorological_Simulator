# METEO OPMET Simulator

Simulador educacional 100% client-side para treinamento de evolução meteorológica, confecção de METAR e avaliação básica de gatilhos de SPECI.

## Publicação no GitHub Pages

1. Crie um repositório no GitHub.
2. Copie todos os arquivos deste projeto para a raiz do repositório.
3. Faça commit e push para `main`.
4. Em **Settings → Pages**, selecione **Deploy from a branch**, branch `main` e pasta `/root`.
5. Salve. O GitHub Pages publicará `index.html`.

Não há backend, Node.js ou banco de dados obrigatório.

## Estrutura

- `index.html` — interface.
- `css/style.css` — visual.
- `js/scenarios.js` — motor de evolução meteorológica.
- `js/metar.js` — codificação METAR.
- `js/speci.js` — detector de mudanças significativas para treinamento.
- `js/validator.js` — correção do METAR digitado pelo aluno.
- `js/aerodromes.js` — cadastro inicial de aeródromos.
- `js/app.js` — aplicação.

## Regras meteorológicas

O projeto foi estruturado com base nos conteúdos disponíveis na apostila do usuário e nos conceitos de codificação METAR/SPECI associados às ICA 105-15, ICA 105-16 e ICA 105-17. Entre os pontos implementados estão:

- vento em graus/KT, calma e rajada;
- visibilidade em incrementos de 50 m até 800 m, 100 m até 5000 m, 1000 m até 9000 m e 9999 para 10 km ou mais;
- visibilidade mínima condicional;
- RVR condicional;
- tempo presente;
- FEW/SCT/BKN/OVC;
- bases de nuvens em incrementos de 30 m / 100 ft até 3000 m / 10000 ft;
- CB e TCU;
- VV;
- CAVOK e NSC;
- temperatura e ponto de orvalho;
- QNH;
- tempo recente e wind shear como campos condicionais;
- evolução meteorológica por cenários;
- comparação entre estados para sinalizar mudanças que merecem análise de SPECI.

### Importante

Este projeto é um **simulador educacional**. Ele não deve ser utilizado para confecção operacional real sem uma revisão formal contra a edição vigente das publicações DECEA aplicáveis. As regras normativas podem ser alteradas e alguns critérios operacionais de SPECI dependem de contexto, procedimentos locais e documentação vigente.

## Personalização

Para inserir seu aeródromo, edite `js/aerodromes.js`.

Para criar novos cenários, edite `js/scenarios.js`.

Para revisar limiares de SPECI, edite `js/speci.js`.

## Licença

Use, modifique e adapte para fins de estudo conforme a licença que você escolher para o seu repositório.
