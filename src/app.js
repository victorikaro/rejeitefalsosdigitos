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
    } catch (error) {
        console.error('Error loading levels:', error);
    }
}

function saveGameData() {
    localStorage.setItem('enigmaGameData', JSON.stringify(gameData));
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
    const input = document.querySelector('.puzzle-input').value.trim().toLowerCase();
    
    if (!level) return;
    
    if (level.puzzle?.alternativeAnswers) {
        for (const alt of level.puzzle.alternativeAnswers) {
            if (input === alt.answer.toLowerCase()) {
                level.completed = true;
                unlockConnectedLevels(level);
                showCorrectMessage(alt.message || "Path unlocked!");
                return;
            }
        }
    }
    
    if (input === level.puzzle.answer.toLowerCase()) {
        level.completed = true;
        unlockConnectedLevels(level);
        showCorrectMessage("Correct answer!");
    } else {
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(input)}`;
    }
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
    
    if (level.theme === 'hidden-image') {
        puzzleInputContainer.style.display = 'none';
        puzzleButtons.style.display = 'flex';
    } else {
        puzzleInputContainer.style.display = '';
        puzzleButtons.style.display = '';
    }
    
    puzzleTitle.textContent = level.title || '';
    
    const puzzleLogo = document.querySelector('.puzzle-container .logo');
    if (puzzleLogo) {
        puzzleLogo.innerHTML = '';
        const logoImg = document.createElement('img');
        logoImg.src = 'files/logo.png';
        logoImg.style.display = 'block';
        logoImg.style.margin = '0 auto';
        logoImg.style.maxWidth = '100%';
        logoImg.style.height = 'auto';
        puzzleLogo.appendChild(logoImg);
        if (level.id === 1) {logoImg.style.display = 'none'}
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