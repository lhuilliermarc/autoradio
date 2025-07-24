// Variables globales
let isDarkMode = true;
let showHistory = false;
let isGenerating = false;
let copied = false;

// Éléments DOM
const themeToggle = document.getElementById('themeToggle');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');
const historyBtn = document.getElementById('historyBtn');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const historyCount = document.getElementById('historyCount');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const precodeInput = document.getElementById('precode');
const inputIcon = document.querySelector('.input-icon');
const checkIcon = document.getElementById('checkIcon');
const errorIcon = document.getElementById('errorIcon');
const errorMessage = document.getElementById('errorMessage');
const loadingState = document.getElementById('loadingState');
const codeResult = document.getElementById('codeResult');
const generatedCode = document.getElementById('generatedCode');
const copyBtn = document.getElementById('copyBtn');
const copyIcon = document.getElementById('copyIcon');
const checkCopyIcon = document.getElementById('checkCopyIcon');
const copyMessage = document.getElementById('copyMessage');
const shareBtn = document.getElementById('shareBtn');
const shareOptions = document.getElementById('shareOptions');
const exampleBtns = document.querySelectorAll('.example-btn');

// Fonctions utilitaires
function normalize(precode) {
    precode = precode.toUpperCase();
    if (!/^[A-Z]\d{3}$/.test(precode) || precode.startsWith("A0")) {
        return "";
    }
    return precode;
}

function calculateCode(precode) {
    const normalizedPrecode = normalize(precode);
    if (normalizedPrecode === "") {
        return "";
    }
    
    const x = normalizedPrecode.charCodeAt(1) + normalizedPrecode.charCodeAt(0) * 10 - 698;
    const y = normalizedPrecode.charCodeAt(3) + normalizedPrecode.charCodeAt(2) * 10 + x - 528;
    const z = (y * 7) % 100;
    const code = Math.floor(z / 10) + (z % 10) * 10 + ((259 % x) % 100) * 100;
    
    return code.toString().padStart(4, '0');
}

function isValid(precode) {
    return normalize(precode) !== "";
}

// Gestion de l'historique
function saveToHistory(precode, code) {
    const history = getHistory();
    const newEntry = {
        id: Date.now().toString(),
        precode,
        code,
        timestamp: new Date()
    };
    
    // Éviter les doublons
    const filteredHistory = history.filter(entry => entry.precode !== precode);
    const updatedHistory = [newEntry, ...filteredHistory].slice(0, 10);
    
    localStorage.setItem('renault-radio-history', JSON.stringify(updatedHistory));
    updateHistoryDisplay();
}

function getHistory() {
    try {
        const stored = localStorage.getItem('renault-radio-history');
        if (!stored) return [];
        
        const parsed = JSON.parse(stored);
        return parsed.map(entry => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
        }));
    } catch {
        return [];
    }
}

function clearHistory() {
    localStorage.removeItem('renault-radio-history');
    updateHistoryDisplay();
}

function formatTimestamp(date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit',
        year: '2-digit'
    });
}

function updateHistoryDisplay() {
    const history = getHistory();
    historyCount.textContent = history.length;
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="history-empty">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                    <path d="M12 7v5l4 2"/>
                </svg>
                <p>Aucun code dans l'historique</p>
                <p class="small">Les codes générés apparaîtront ici</p>
            </div>
        `;
    } else {
        historyList.innerHTML = history.map((entry, index) => `
            <div class="history-item animate-slide-up" style="animation-delay: ${index * 0.1}s" data-precode="${entry.precode}">
                <div class="history-item-content">
                    <div class="history-precode">${entry.precode}</div>
                    <div class="history-code">${entry.code}</div>
                </div>
                <div class="history-timestamp">${formatTimestamp(entry.timestamp)}</div>
            </div>
        `).join('');
        
        // Ajouter les event listeners pour les éléments d'historique
        document.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const precode = item.dataset.precode;
                precodeInput.value = precode;
                handlePrecodeChange();
                toggleHistory();
            });
        });
    }
}

// Gestion du thème
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    
    if (isDarkMode) {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    } else {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }
}

function toggleHistory() {
    showHistory = !showHistory;
    historyBtn.classList.toggle('active', showHistory);
    
    if (showHistory) {
        historyPanel.classList.remove('hidden');
        historyPanel.classList.add('animate-slide-down');
        updateHistoryDisplay();
    } else {
        historyPanel.classList.add('hidden');
        historyPanel.classList.remove('animate-slide-down');
    }
}

// Gestion de la saisie
function handlePrecodeChange() {
    const value = precodeInput.value;
    const valid = isValid(value);
    
    // Reset des états
    precodeInput.classList.remove('valid', 'invalid', 'animate-shake', 'animate-success-pulse');
    inputIcon.classList.add('hidden');
    checkIcon.classList.add('hidden');
    errorIcon.classList.add('hidden');
    errorMessage.classList.add('hidden');
    loadingState.classList.add('hidden');
    codeResult.classList.add('hidden');
    copied = false;
    updateCopyButton();
    
    if (value === '') {
        return;
    }
    
    if (valid) {
        precodeInput.classList.add('valid', 'animate-success-pulse');
        inputIcon.classList.remove('hidden');
        checkIcon.classList.remove('hidden');
        checkIcon.classList.add('animate-bounce-in');
        
        // Simuler la génération
        if (value.length === 4) {
            isGenerating = true;
            loadingState.classList.remove('hidden');
            loadingState.classList.add('animate-slide-down');
            
            setTimeout(() => {
                isGenerating = false;
                loadingState.classList.add('hidden');
                
                const code = calculateCode(value);
                if (code) {
                    generatedCode.textContent = code;
                    generatedCode.classList.add('animate-code-reveal');
                    codeResult.classList.remove('hidden');
                    codeResult.classList.add('animate-slide-down');
                    
                    // Sauvegarder dans l'historique
                    saveToHistory(value, code);
                }
            }, 800);
        }
    } else {
        precodeInput.classList.add('invalid', 'animate-shake');
        inputIcon.classList.remove('hidden');
        errorIcon.classList.remove('hidden');
        errorMessage.classList.remove('hidden');
        errorMessage.classList.add('animate-slide-down');
    }
}

// Gestion de la copie
async function handleCopyCode() {
    const code = generatedCode.textContent;
    if (!code || !isValid(precodeInput.value)) return;
    
    try {
        await navigator.clipboard.writeText(code);
        copied = true;
        updateCopyButton();
        
        copyMessage.classList.remove('hidden');
        copyMessage.classList.add('animate-bounce-in');
        
        setTimeout(() => {
            copied = false;
            updateCopyButton();
            copyMessage.classList.add('hidden');
            copyMessage.classList.remove('animate-bounce-in');
        }, 2000);
    } catch (err) {
        console.error('Échec de la copie:', err);
    }
}

function updateCopyButton() {
    if (copied) {
        copyBtn.classList.add('success');
        copyIcon.classList.add('hidden');
        checkCopyIcon.classList.remove('hidden');
    } else {
        copyBtn.classList.remove('success');
        copyIcon.classList.remove('hidden');
        checkCopyIcon.classList.add('hidden');
    }
}

// Gestion du partage
function toggleShareOptions() {
    const isVisible = !shareOptions.classList.contains('hidden');
    
    if (isVisible) {
        shareOptions.classList.add('hidden');
        shareOptions.classList.remove('animate-slide-down');
    } else {
        shareOptions.classList.remove('hidden');
        shareOptions.classList.add('animate-slide-down');
    }
}

async function handleShare(method) {
    const precode = precodeInput.value;
    const code = generatedCode.textContent;
    
    if (!code || !isValid(precode)) {
        alert('Veuillez d\'abord générer un code valide');
        return;
    }
    
    const shareText = `🚗 Code autoradio Renault\n\nPrécode: ${precode}\nCode de déverrouillage: ${code}\n\nGénéré avec le décodeur gratuit: ${window.location.href}`;
    const shareUrl = `${window.location.href}?precode=${precode}&code=${code}`;
    
    // Fermer le menu de partage
    toggleShareOptions();
    
    try {
        switch (method) {
            case 'native':
                if (navigator.share) {
                    await navigator.share({
                        title: 'Code Autoradio Renault',
                        text: shareText,
                        url: shareUrl
                    });
                }
                break;
                
            case 'whatsapp':
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                window.open(whatsappUrl, '_blank');
                break;
                
            case 'sms':
                const smsUrl = `sms:?body=${encodeURIComponent(shareText)}`;
                window.open(smsUrl);
                break;
                
            case 'email':
                const emailUrl = `mailto:?subject=${encodeURIComponent('Code Autoradio Renault')}&body=${encodeURIComponent(shareText)}`;
                window.open(emailUrl);
                break;
                
            case 'telegram':
                const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
                window.open(telegramUrl, '_blank');
                break;
                
            case 'copy-link':
                await navigator.clipboard.writeText(shareUrl);
                showShareSuccess('Lien copié dans le presse-papiers !');
                break;
        }
        
        showShareSuccess('Partage effectué avec succès !');
    } catch (error) {
        console.error('Erreur lors du partage:', error);
        showShareSuccess('Erreur lors du partage', true);
    }
}

function showShareSuccess(message, isError = false) {
    // Créer un message de succès temporaire
    const successMessage = document.createElement('div');
    successMessage.className = `share-success ${isError ? 'error' : ''}`;
    successMessage.textContent = message;
    successMessage.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: ${isError ? '#ef4444' : '#10b981'};
        color: white;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        font-size: 0.875rem;
        font-weight: 500;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(successMessage);
    
    setTimeout(() => {
        successMessage.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => {
            document.body.removeChild(successMessage);
        }, 300);
    }, 3000);
}

// Fermer le menu de partage en cliquant ailleurs
function handleClickOutside(event) {
    if (!shareOptions.classList.contains('hidden') && 
        !shareBtn.contains(event.target) && 
        !shareOptions.contains(event.target)) {
        toggleShareOptions();
    }
}

// Initialisation
function init() {
    // Appliquer les animations d'entrée
    document.body.classList.add('animate-fade-in');
    
    const animatedElements = [
        { selector: '.container', delay: 200 },
        { selector: '.logo', delay: 400 },
        { selector: '.header h1', delay: 600 },
        { selector: '.subtitle', delay: 800 },
        { selector: '.instructions', delay: 1000 },
        { selector: '.main-content', delay: 1200 },
        { selector: '.examples', delay: 1400 },
        { selector: '.footer', delay: 1600 }
    ];
    
    animatedElements.forEach(({ selector, delay }) => {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('animate-slide-up', `delay-${delay}`);
        }
    });
    
    // Initialiser le thème
    document.body.setAttribute('data-theme', 'dark');
    
    // Event listeners
    themeToggle.addEventListener('click', toggleTheme);
    historyBtn.addEventListener('click', toggleHistory);
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    precodeInput.addEventListener('input', (e) => {
        const value = e.target.value;
        // Limiter à 4 caractères et permettre seulement lettres et chiffres
        if (value.length <= 4 && /^[A-Za-z0-9]*$/.test(value)) {
            handlePrecodeChange();
        } else {
            e.target.value = e.target.value.slice(0, 4).replace(/[^A-Za-z0-9]/g, '');
        }
    });
    
    copyBtn.addEventListener('click', handleCopyCode);
    
    shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Vérifier si le partage natif est disponible
        if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            handleShare('native');
        } else {
            toggleShareOptions();
        }
    });
    
    // Event listeners pour les options de partage
    document.querySelectorAll('.share-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const method = option.dataset.method;
            handleShare(method);
        });
    });
    
    // Fermer le menu en cliquant ailleurs
    document.addEventListener('click', handleClickOutside);
    
    exampleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const example = btn.dataset.example;
            precodeInput.value = example;
            handlePrecodeChange();
        });
    });
    
    // Initialiser l'affichage de l'historique
    updateHistoryDisplay();
}

// Démarrer l'application
document.addEventListener('DOMContentLoaded', init);

// Gestion des paramètres URL pour le partage
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedPrecode = urlParams.get('precode');
    const sharedCode = urlParams.get('code');
    
    if (sharedPrecode && sharedCode) {
        precodeInput.value = sharedPrecode;
        handlePrecodeChange();
        
        // Afficher un message indiquant que le code a été partagé
        setTimeout(() => {
            showShareSuccess('Code partagé chargé avec succès !');
        }, 1000);
    }
});