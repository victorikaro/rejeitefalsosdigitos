# Documentação do Código - app.js

## Visão Geral
O arquivo `app.js` gerencia a lógica do jogo.
O arquivo `levels.json` lista os níveis do jogo.  

## Estrutura Principal

### Dados do Jogo
```javascript
let gameData = {
    currentLevel: 1,
    levels: []
};
```
Armazena o estado atual do jogo, incluindo o nível atual e a lista de níveis.

### Temas
```javascript
const themes = {
    dark: { /* configurações do tema escuro */ },
    'hidden-image': { /* configurações do tema de imagem oculta */ }
};
```
Define os temas visuais disponíveis no jogo.

## Funções Principais

### 1. Gerenciamento de Temas
- `applyTheme(themeName)`: Aplica um tema visual específico
- `resetTheme()`: Remove todos os temas aplicados

### 2. Carregamento de Dados
- `loadLevels()`: Carrega os níveis do arquivo JSON e dados salvos localmente
- `saveGameData()`: Salva o progresso do jogo no localStorage

### 3. Lógica do Jogo
- `getVisibleLevels()`: Retorna os níveis que devem ser mostrados no mapa
- `unlockConnectedLevels(level)`: Desbloqueia níveis conectados ao completar um nível
- `advanceToNextLevel()`: Avança para o próximo nível desbloqueado
- `checkAnswer()`: Verifica se a resposta do jogador está correta
- `selectLevel(level)`: Seleciona um nível para jogar

### 4. Interface do Usuário
- `showCorrectMessage(text)`: Mostra mensagem de feedback
- `showPuzzleScreen(level)`: Exibe a tela de quebra-cabeça
- `backToMap()`: Volta para a tela do mapa
- `createLevelNodes()`: Cria os elementos visuais dos níveis no mapa
- `createPath(fromLevel, toLevel)`: Desenha conexões entre níveis

### 5. Inicialização
- `init()`: Função de inicialização do jogo

## Checklist:

1. **Landing Page**:
   - [x] Os níveis são carregados do arquivo JSON
   - [x] Dados salvos são recuperados do localStorage
   - [ ] Mostrar a logo bem formatada

2. **Navegação**:
   - [x] O jogador pode clicar em nós desbloqueados no mapa
   - [ ] Interface da árvore mais elegante
   - [ ] Mostrar a logo bem formatada (nos outros níveis tambem)

3. **Outros**:
   - [x] O progresso é automaticamente salvo no localStorage
   - [x] Suporte de temas
   - [ ] Temas num arquivo separado (files/themes.json)
   - [ ] !ANIMAÇÕES DE TRANSIÇÃO ENTRE NÍVEIS

### Respostas aceitáveis
O sistema aceita:
- Respostas exatas (comparação case-insensitive)
- Respostas alternativas (definidas no JSON dos níveis)
- Redirecionamento para respostas incorretas

## Estrutura do JSON de Níveis
Cada nível contém:
- `id`: Identificador único
- `title`: Título exibido no mapa
- `x`, `y`: Posição no mapa
- `completed`, `unlocked`: Estado do nível
- `connections`: IDs de níveis conectados
- `puzzle`: Configuração do quebra-cabeça
  - `description`: Texto do enigma
  - `image`: Imagem associada (opcional)
  - `answer`: Resposta correta
  - `alternativeAnswers`: Respostas alternativas com efeitos especiais
  - `hint`: Dica (opcional)

## Considerações de Segurança
- O código usa `textContent` em vez de `innerHTML` onde possível para prevenir XSS
- Dados do localStorage são validados antes do uso
- Links externos usam `target="_blank"` com rel="noopener" implícito

## Mais checklist
[ ] Adicionar mais feedback visual para respostas corretas/incorretas
[ ] Melhorar tratamento de erros para falhas no carregamento