let gameData = {
    currentLevel: 1,
    levels: []
};

const themes = {
    dark: {
        cssClass: 'level-2-theme',
        styles: {
            '--main-bg-color': '#000000',
            '--map-bg-color': '#111111',
            '--text-color': '#ffffff',
            '--nav-bg': 'linear-gradient(to bottom, #333333, #222222)',
            '--nav-border': '#444444'
        }
    },
    'hidden-image': {
        cssClass: 'hidden-image-theme',
        styles: {
            '--bg-image': 'url("files/background.png")',
            '--bg-size': '200px 200px' 
        }
    }
};

function applyTheme(themeName) {
    resetTheme();
    
    const theme = themes[themeName];
    if (!theme) return;
    
    if (theme.cssClass) {
        document.body.classList.add(theme.cssClass);
    }
    
    if (theme.styles) {
        const root = document.documentElement;
        Object.entries(theme.styles).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });
    }
}

function resetTheme() {
    Object.values(themes).forEach(theme => {
        if (theme.cssClass) {
            document.body.classList.remove(theme.cssClass);
        }
    });
    
    const root = document.documentElement;
    Object.keys(themes.dark.styles).forEach(property => {
        root.style.removeProperty(property);
    });
}

function getVisibleLevels() {
    const visibleLevels = [];
    const queue = [];
    
    gameData.levels.forEach(level => {
        if (level.unlocked) {
            queue.push(level);
            visibleLevels.push(level);
        }
    });
    
    
    let depth = 0;
    while (queue.length > 0 && depth < 3) {
        const currentLevel = queue.shift();
        
        currentLevel.connections.forEach(connectedId => {
            const connectedLevel = gameData.levels.find(l => l.id === connectedId);
            if (connectedLevel && !visibleLevels.includes(connectedLevel)) {
                visibleLevels.push(connectedLevel);
                queue.push(connectedLevel);
            }
        });
        
        depth++;
    }
    
    return visibleLevels;
}

async function loadLevels() {
    try {
        const response = await fetch('levels.json');
        const data = await response.json();
        gameData.levels = data.levels;
        
        const savedData = localStorage.getItem('enigmaGameData');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            gameData.levels.forEach((level, index) => {
                if (parsedData.levels[index]) {
                    level.completed = parsedData.levels[index].completed;
                    level.unlocked = parsedData.levels[index].unlocked;
                }
            });
            gameData.currentLevel = parsedData.currentLevel || 1;
        }

        // ✅ Chamada correta — DEIXE AQUI MESMO:
        markTerminalLevelsAsCompleted();

    } catch (error) {
        console.error('Error loading levels:', error);
    }
}

function saveGameData() {
    localStorage.setItem('enigmaGameData', JSON.stringify(gameData));
}

function markTerminalLevelsAsCompleted() {
    gameData.levels.forEach(level => {
        if (
            level.unlocked &&
            !level.completed &&
            (!level.puzzle || (
                (!level.puzzle.answer || level.puzzle.answer.trim() === "") &&
                (!level.puzzle.alternativeAnswers || level.puzzle.alternativeAnswers.length === 0)
            ))
        ) {
            level.completed = true;
        }
    });
}

function unlockConnectedLevels(level) {
    level.connections.forEach(connectedId => {
        const connectedLevel = gameData.levels.find(l => l.id === connectedId);
        if (connectedLevel) connectedLevel.unlocked = true;
    });
    
    if (level.puzzle?.alternativeAnswers) {
        const input = document.querySelector('.puzzle-input').value.trim().toLowerCase();
        level.puzzle.alternativeAnswers.forEach(alt => {
            if (input === alt.answer.toLowerCase()) {
                alt.unlocks.forEach(id => {
                    const unlockedLevel = gameData.levels.find(l => l.id === id);
                    if (unlockedLevel) unlockedLevel.unlocked = true;
                });
            }
        });
    }
    
    saveGameData();
}

function advanceToNextLevel() {
    const currentLevel = gameData.levels.find(l => l.id === gameData.currentLevel);
    if (!currentLevel) return;
    
    let nextLevel = null;
    
    for (const connectedId of currentLevel.connections) {
        const level = gameData.levels.find(l => l.id === connectedId);
        if (level && level.unlocked) {
            nextLevel = level;
            break;
        }
    }
    
    if (!nextLevel && currentLevel.puzzle?.alternativeAnswers) {
        const input = document.querySelector('.puzzle-input').value.trim().toLowerCase();
        for (const alt of currentLevel.puzzle.alternativeAnswers) {
            if (input === alt.answer.toLowerCase()) {
                for (const id of alt.unlocks) {
                    const level = gameData.levels.find(l => l.id === id);
                    if (level && level.unlocked) {
                        nextLevel = level;
                        break;
                    }
                }
                if (nextLevel) break;
            }
        }
    }
    
    if (nextLevel) {
        selectLevel(nextLevel);
    } else {
        backToMap();
    }
}

function checkAnswer() {
    const level = gameData.levels.find(l => l.id === gameData.currentLevel);
    const input = normalize(document.querySelector('.puzzle-input').value);

    if (!level || !input) return;

    // Verifica se há alternativa correta
    const matchedAlt = level.puzzle?.alternativeAnswers?.find(alt => normalize(alt.answer) === input);

    if (matchedAlt) {
        level.completed = true;

        matchedAlt.unlocks.forEach(id => {
            const unlockedLevel = gameData.levels.find(l => l.id === id);
            if (unlockedLevel) unlockedLevel.unlocked = true;
        });

        saveGameData();
        showCorrectMessage(matchedAlt.message || "Desbloqueado!");
        return;
    }

    // Verifica se a resposta principal está correta
    if (normalize(level.puzzle?.answer || '') === input) {
        level.completed = true;

        unlockConnectedLevels(level); // desbloqueia conexões principais
        saveGameData();
        showCorrectMessage("Resposta correta!");
        return;
    }

    // Resposta errada
    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(input)}`;
}

function showCorrectMessage(text) {
    const message = document.querySelector('.message');
    const messageText = document.querySelector('.message-text');
    
    messageText.textContent = text;
    message.style.display = 'block';
    
    document.querySelector('.message-ok').onclick = () => {
        message.style.display = 'none';
        advanceToNextLevel();
    };
}

function selectLevel(level) {
    if (!level.unlocked) return;
    
    gameData.currentLevel = level.id;
    saveGameData();
    
    document.querySelectorAll('.level-node').forEach(node => {
        node.classList.remove('level-selected');
    });
    
    const levelNode = document.querySelector(`.level-node[data-id="${level.id}"]`);
    if (levelNode) {
        levelNode.classList.add('level-selected');
    }
    
    showPuzzleScreen(level);
}

function showPuzzleScreen(level) {
    document.querySelector('.map-container').style.display = 'none';
    document.querySelector('.puzzle-container').style.display = 'flex';

    if (level.theme) {
        applyTheme(level.theme);
    } else {
        resetTheme();
    }
    
    const puzzleTitle = document.querySelector('.puzzle-title');
    const puzzleDescription = document.querySelector('.puzzle-description');
    const puzzleInputContainer = document.querySelector('.puzzle-input-container');
    const puzzleButtons = document.querySelector('.puzzle-buttons');
    const submitButton = document.querySelector('.puzzle-submit');
    const hintButton = document.querySelector('#puzzle-hint');
    
    // Controla exibição do input e botão enviar
    if (level.hideInput || level.theme === 'hidden-image') {
        puzzleInputContainer.style.display = 'none';
        if (submitButton) submitButton.style.display = 'none';
    } else {
        puzzleInputContainer.style.display = '';
        if (submitButton) submitButton.style.display = '';
    }
    
    // Controla exibição dos botões
    if (level.hideInput && !level.hideHintButton) {
        // Se esconder input mas não o botão hint, centraliza o botão hint
        puzzleButtons.style.display = 'flex';
        puzzleButtons.style.justifyContent = 'center';
        if (hintButton) hintButton.style.margin = '0 auto';
    } else if (level.theme === 'hidden-image') {
        puzzleButtons.style.display = 'flex';
    } else {
        puzzleButtons.style.display = '';
        puzzleButtons.style.justifyContent = '';
        if (hintButton) hintButton.style.margin = '';
    }
    
    puzzleTitle.textContent = level.title || '';
    
    const puzzleLogo = document.querySelector('.puzzle-container .logo');
    if (puzzleLogo) {
        if (level.hideLogo) {
            // Oculta o logo completamente
            puzzleLogo.style.display = 'none';
        } else {
            puzzleLogo.innerHTML = '';
            const logoImg = document.createElement('img');
            logoImg.src = 'files/logo.png';
            logoImg.style.display = 'block';
            logoImg.style.margin = '0 auto';
            logoImg.style.maxWidth = '100%';
            logoImg.style.height = 'auto';
            puzzleLogo.appendChild(logoImg);
            puzzleLogo.style.display = '';
            
            if (level.id === 1) {
                logoImg.style.display = 'none';
            }
        }
    }
    
    puzzleDescription.innerHTML = '';
    puzzleDescription.classList.add('typing');
    
    const fullText = level.puzzle.description.replace(/\n/g, '<br>');
    let i = 0;
    const speed = 20; 
    
    function typeWriter() {
        if (i < fullText.length) {
            puzzleDescription.innerHTML = fullText.substring(0, i + 1);
            i++;
            setTimeout(typeWriter, speed);
        } else {
            puzzleDescription.classList.remove('typing');
        }
    }
    
    typeWriter();
    
    const imageContainer = document.querySelector('.puzzle-image-container');
    imageContainer.innerHTML = '';

    if (level.puzzle.image) {
        // Verifica se é um arquivo para download (extensões como .txt, .pdf, .doc, etc.)
        const fileExtensions = ['.txt', '.pdf', '.doc', '.docx', '.zip', '.rar', '.json', '.xml', '.csv'];
        const isDownloadableFile = fileExtensions.some(ext => level.puzzle.image.toLowerCase().endsWith(ext));
        
        if (isDownloadableFile) {
            // Criar container para o arquivo
            const fileContainer = document.createElement('div');
            fileContainer.style.display = 'flex';
            fileContainer.style.flexDirection = 'column';
            fileContainer.style.alignItems = 'center';
            fileContainer.style.justifyContent = 'center';
            fileContainer.style.padding = '20px';
            fileContainer.style.cursor = 'pointer';
            fileContainer.style.borderRadius = '10px';
            fileContainer.style.transition = 'all 0.3s ease';
            fileContainer.style.border = '2px dashed #ccc';
            fileContainer.style.backgroundColor = '#f9f9f9';
            
            // Ícone do arquivo
            const fileIcon = document.createElement('div');
            fileIcon.innerHTML = '📄';
            fileIcon.style.fontSize = '48px';
            fileIcon.style.marginBottom = '10px';
            
            // Nome do arquivo
            const fileName = document.createElement('div');
            fileName.textContent = level.puzzle.image.split('/').pop(); // pega só o nome do arquivo
            fileName.style.fontSize = '16px';
            fileName.style.fontWeight = 'bold';
            fileName.style.color = '#333';
            fileName.style.marginBottom = '5px';
            
            // Texto de instrução
            const downloadText = document.createElement('div');
            downloadText.textContent = 'Clique para baixar';
            downloadText.style.fontSize = '12px';
            downloadText.style.color = '#666';
            
            // Efeito hover
            fileContainer.addEventListener('mouseenter', () => {
                fileContainer.style.backgroundColor = '#e8f4fd';
                fileContainer.style.borderColor = '#2196F3';
                fileContainer.style.transform = 'scale(1.05)';
            });
            
            fileContainer.addEventListener('mouseleave', () => {
                fileContainer.style.backgroundColor = '#f9f9f9';
                fileContainer.style.borderColor = '#ccc';
                fileContainer.style.transform = 'scale(1)';
            });
            
            // Função de download
            fileContainer.addEventListener('click', () => {
                const link = document.createElement('a');
                link.href = level.puzzle.image;
                link.download = level.puzzle.image.split('/').pop();
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
            
            fileContainer.appendChild(fileIcon);
            fileContainer.appendChild(fileName);
            fileContainer.appendChild(downloadText);
            imageContainer.appendChild(fileContainer);
            imageContainer.style.display = 'flex';
            imageContainer.style.justifyContent = 'center';
            imageContainer.style.alignItems = 'center';
        } else {
            // Comportamento normal para imagens
            const img = document.createElement('img');
            img.src = level.puzzle.image;
            img.alt = 'Imagem do enigma';
            img.className = 'puzzle-image';
            imageContainer.appendChild(img);
            imageContainer.style.display = 'block';
        }
    } else if (level.puzzle.music) {
        // Container para centralizar o áudio
        const audioContainer = document.createElement('div');
        audioContainer.style.display = 'flex';
        audioContainer.style.flexDirection = 'column';
        audioContainer.style.alignItems = 'center';
        audioContainer.style.justifyContent = 'center';
        audioContainer.style.width = '100%';
        audioContainer.style.padding = '20px 0';
        
        // Texto explicativo
        const audioText = document.createElement('p');
        audioText.textContent = 'além do lcd';
        audioText.style.textAlign = 'center';
        audioText.style.marginBottom = '15px';
        audioText.style.fontSize = '16px';
        audioText.style.color = 'inherit';
        
        // Player de áudio
        const audioPlayer = document.createElement('audio');
        audioPlayer.src = level.puzzle.music;
        audioPlayer.controls = true;
        audioPlayer.className = 'puzzle-audio';
        audioPlayer.style.width = '100%';
        audioPlayer.style.maxWidth = '600px';
        audioPlayer.style.minWidth = '400px';
        audioPlayer.style.height = '60px';
        audioPlayer.style.borderRadius = '8px';
        audioPlayer.style.backgroundColor = '#f5f5f5';
        audioPlayer.style.border = '1px solid #ddd';
        
        // Adiciona os elementos ao container
        audioContainer.appendChild(audioText);
        audioContainer.appendChild(audioPlayer);
        
        imageContainer.appendChild(audioContainer);
        imageContainer.style.display = 'flex';
        imageContainer.style.justifyContent = 'center';
        imageContainer.style.alignItems = 'center';
    } else {
        imageContainer.style.display = 'none';
    }

    if (level.theme !== 'hidden-image') {
        document.querySelector('.puzzle-input').value = '';
        document.querySelector('.puzzle-input').focus();
    }
}

function backToMap() {
    resetTheme();
    
    const puzzleDescription = document.querySelector('.puzzle-description');
    puzzleDescription.classList.remove('typing');
    
    document.querySelector('.puzzle-title').style.display = '';
    document.querySelector('.puzzle-input').style.display = '';
    document.querySelector('.puzzle-buttons').style.display = '';
    document.querySelector('.nav').style.display = '';
    document.querySelector('.footer').style.display = '';

    puzzleDescription.style.position = '';
    puzzleDescription.style.top = '';
    puzzleDescription.style.left = '';
    puzzleDescription.style.transform = '';
    puzzleDescription.style.backgroundColor = '';
    puzzleDescription.style.padding = '';
    puzzleDescription.style.borderRadius = '';
    puzzleDescription.style.textAlign = '';
    
    document.querySelector('.map-container').style.display = 'block';
    document.querySelector('.puzzle-container').style.display = 'none';
    createLevelNodes();
}

function createLevelNodes() {
    const container = document.getElementById('levels-container');
    container.innerHTML = '';
    
    const visibleLevels = getVisibleLevels();
    
    visibleLevels.forEach(level => {
        level.connections.forEach(connectedId => {
            const connectedLevel = visibleLevels.find(l => l.id === connectedId);
            if (connectedLevel) {
                createPath(level, connectedLevel);
            }
        });
    });
    
    visibleLevels.forEach(level => {
        const node = document.createElement('div');
        node.className = `level-node ${level.unlocked ? 'level-unlocked' : 'level-locked'} ${level.completed ? 'level-completed' : ''}`;
        node.dataset.id = level.id;
        node.style.left = `${level.x}px`;
        node.style.top = `${level.y}px`;
        node.textContent = level.title || '?';
        
        if (level.unlocked) {
            node.addEventListener('click', () => selectLevel(level));
        }
        
        container.appendChild(node);
    });
}

function createPath(fromLevel, toLevel) {
    const container = document.getElementById('levels-container');
    const path = document.createElement('div');
    path.className = 'path';
    
    const fromX = fromLevel.x + 30;
    const fromY = fromLevel.y + 30;
    const toX = toLevel.x + 30;
    const toY = toLevel.y + 30;
    
    const length = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
    const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
    
    path.style.width = `${length}px`;
    path.style.left = `${fromX}px`;
    path.style.top = `${fromY}px`;
    path.style.transformOrigin = '0 0';
    path.style.transform = `rotate(${angle}deg)`;
    
    if (fromLevel.completed && toLevel.completed) {
        path.style.background = '#4CAF50';
    } else {
        path.style.background = '#bdbdbd';
    }
    
    container.appendChild(path);
}

function normalize(text) {
    return text
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
        .replace(/[^a-z0-9 ]/gi, '') // remove pontuação
        .replace(/\s+/g, ' ') // espaços múltiplos
        .trim();
}

async function init() {
    await loadLevels();
    
    document.getElementById('puzzle-hint').addEventListener('click', backToMap);
    document.querySelector('.puzzle-submit').addEventListener('click', checkAnswer);
    document.querySelector('.puzzle-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkAnswer();
    });
    
    const currentLevel = gameData.levels.find(l => l.id === gameData.currentLevel);
    if (currentLevel) {
        showPuzzleScreen(currentLevel);
    }
    
    setTimeout(() => {
        document.querySelector('.loading-screen').style.display = 'none';
    }, 1500);
}

window.addEventListener('load', init);