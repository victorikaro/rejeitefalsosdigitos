const themes = {
    dark: {
        bodyBackground: '#000000',
        containerBackground: '#111111',
        textColor: '#ffffff',
        navBackground: 'linear-gradient(to bottom, #333333, #222222)',
        navBorder: '#444444'
    },
    hidden: {
        cssClass: 'hidden-image-theme',
        styles: {'--bg-image': 'url("files/background.png")'}
    }
};

export function applyTheme(themeName) {
    const theme = themes[themeName];
    if (!theme) return;
    
    document.documentElement.style.setProperty('--main-bg-color', theme.bodyBackground);
    document.documentElement.style.setProperty('--map-bg-color', theme.containerBackground);
}

export function resetTheme() {
    document.documentElement.style.removeProperty('--main-bg-color');
    document.documentElement.style.removeProperty('--map-bg-color');
}