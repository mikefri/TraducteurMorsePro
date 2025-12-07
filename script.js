// --- DATA (Morse Code Map) ---
const MORSE_CODE = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..',
    '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
    '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----',
    ' ': '/', '.': '.-.-.-', ',': '--..--', '?': '..-..-', "'": '.----.',
    '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...',
    ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-',
    '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
};

const REVERSE_MORSE = Object.fromEntries(Object.entries(MORSE_CODE).map(([k, v]) => [v, k]));

// --- DOM ELEMENTS & STATE ---
const html = document.documentElement;
const themeIcon = document.getElementById('themeIcon');
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const wpmInput = document.getElementById('wpm');
const wpmValueDisplay = document.getElementById('wpmValue');
const signalBulb = document.getElementById('signal-bulb');
const playingStatusDisplay = document.getElementById('playing-status');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const loopToggleBtn = document.getElementById('loopToggleBtn');
const loopIcon = document.getElementById('loopIcon');
const loopStatusDisplay = document.getElementById('loopStatus');
const muteIcon = document.getElementById('muteIcon');
const flashIcon = document.getElementById('flashIcon');
const morseDictionaryContainer = document.getElementById('morseDictionaryContainer');
const morseDictionary = document.getElementById('morseDictionary');
const toggleIcon = document.getElementById('toggle-icon');
const modeTextToMorse = document.getElementById('mode-text-to-morse');
const modeMorseToText = document.getElementById('mode-morse-to-text');
const inputLabel = document.getElementById('inputLabel');
const outputLabel = document.getElementById('outputLabel');

let audioCtx = null;
let isPlaying = false;
let stopSignal = false;
let isLoopEnabled = false; 
let isMuted = false;
let isFlashEnabled = false;
let currentMode = 'textToMorse';
let isDictionaryOpen = false; 

const FIXED_FREQUENCY = 600;

// --- THEME MANAGEMENT ---

/** Bascule entre le thème clair et sombre. */
function toggleTheme() {
    const currentTheme = html.classList.contains('theme-dark') ? 'theme-dark' : 'theme-light';
    const newTheme = currentTheme === 'theme-light' ? 'theme-dark' : 'theme-light';
    
    html.classList.remove(currentTheme);
    html.classList.add(newTheme);

    // Sauvegarder la nouvelle préférence dans localStorage
    localStorage.setItem('theme', newTheme);

    // Mise à jour de l'icône
    if (newTheme === 'theme-dark') {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
        showToast("Thème Sombre Activé");
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
        showToast("Thème Clair Activé");
    }
}

/** Applique le thème initial au chargement. */
function applyInitialTheme() {
    const savedTheme = localStorage.getItem('theme') || 'theme-light';
    
    html.classList.remove('theme-light', 'theme-dark');
    html.classList.add(savedTheme);
    
    // Ajuster l'icône pour qu'elle corresponde à l'action de bascule (aller au thème opposé)
    if (savedTheme === 'theme-dark') {
        themeIcon.classList.remove('fa-moon'); 
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun'); 
        themeIcon.classList.add('fa-moon');
    }
}


// --- CORE CONVERSION LOGIC ---

/** Convertit le texte en code Morse. */
function convertToMorse(text) {
    text = text.toUpperCase();
    let result = "";
    for (let char of text) {
        if (char === '\n') {
            result += '\n';
        } else if (MORSE_CODE[char]) {
            result += MORSE_CODE[char] + " ";
        } else if (char === ' ') {
            result += "/ ";
        } else {
            result += ""; 
        }
    }
    return result.trim();
}

/** Convertit le code Morse en texte. */
function convertToText(morse) {
    morse = morse.trim();
    // Utiliser une expression régulière pour séparer par un espace, un slash ou plus (gère les séparations multiples)
    const elements = morse.split(/([/\s]+)/).filter(e => e.trim() !== '');

    let result = "";
    elements.forEach(element => {
        if (element === '/') {
            result += " "; 
        } else if (REVERSE_MORSE[element]) {
            result += REVERSE_MORSE[element];
        } else if (element.match(/^[.-]+$/)) {
            // Un code morse non reconnu
            result += "[?]";
        }
    });
    
    return result.trim();
}

// --- MODE MANAGEMENT ---

/** Change le mode de traduction et met à jour l'UI. */
function setMode(mode) {
    currentMode = mode;
    
    // Reset styles
    const allModeButtons = [modeTextToMorse, modeMorseToText];
    allModeButtons.forEach(btn => {
        btn.classList.remove('mode-toggle-active');
        btn.classList.remove('text-white');
        btn.classList.add('text-[var(--color-text-subtle)]');
        btn.classList.add('hover:bg-[var(--color-gray-50)]');
    });

    if (mode === 'textToMorse') {
        modeTextToMorse.classList.add('mode-toggle-active', 'text-white');
        modeTextToMorse.classList.remove('text-[var(--color-text-subtle)]');
        inputLabel.textContent = "ENTRÉE TEXTE";
        outputLabel.textContent = "SORTIE CODE MORSE";
        inputText.placeholder = "Commencez à taper votre message ici...";
        outputText.placeholder = "Résultat de la conversion en Morse...";

    } else {
        modeMorseToText.classList.add('mode-toggle-active', 'text-white');
        modeMorseToText.classList.remove('text-[var(--color-text-subtle)]');
        inputLabel.textContent = "ENTRÉE CODE MORSE";
        outputLabel.textContent = "SORTIE TEXTE";
        inputText.placeholder = "Entrez votre code Morse ici (. - /)...";
        outputText.placeholder = "Résultat de la conversion en texte...";
    }
    
    // Swap content (pour garder le résultat dans la boîte de droite, s'il y a lieu)
    const tempInput = inputText.value;
    inputText.value = outputText.value;
    outputText.value = tempInput;

    handleInput();
}

/** Gère l'événement de saisie et lance la conversion. */
function handleInput() {
    if (currentMode === 'textToMorse') {
        outputText.value = convertToMorse(inputText.value);
    } else {
        outputText.value = convertToText(inputText.value);
    }
}


// --- AUDIO/VISUAL ENGINE ---

/** Exécute la séquence Morse visuelle et sonore. */
async function runMorseSequence(morse) {
    const wpm = parseInt(wpmInput.value);
    const freq = FIXED_FREQUENCY;
    // Formule pour le temps unitaire (1 point) basé sur WPM (1200ms pour 20 WPM, 60ms/WPM)
    const unitTime = 1200 / wpm; 

    for (let i = 0; i < morse.length; i++) {
        if (stopSignal) break;

        const char = morse[i];
        
        if (char === '.' || char === '-') {
            // Le tiret (dash) est trois fois le temps du point (dot)
            const duration = char === '.' ? unitTime : unitTime * 3;
            
            toggleSignal(true); 
            if (!isMuted) playTone(freq, duration); 
            await wait(duration);
            
            toggleSignal(false); 
            // Inter-élément (entre points et tirets d'une même lettre) = 1 unité
            await wait(unitTime); 
        } else if (char === ' ') {
            // Inter-caractère (entre lettres) = 3 unités (on a déjà attendu 1 unité après le dernier élément)
            await wait(unitTime * 2); 
        } else if (char === '/') {
            // Inter-mot (entre espaces) = 7 unités (on a déjà attendu 1 unité après le dernier élément + 2 pour l'espace)
            await wait(unitTime * 6);
        }
    }
    return !stopSignal;
}

/** Lance ou boucle la lecture du code Morse. */
async function playMorse() {
    if (isPlaying) return;
    const morse = currentMode === 'textToMorse' ? outputText.value.trim() : inputText.value.trim();

    if (!morse) {
        showToast("Veuillez saisir du Texte ou du Code Morse à jouer !");
        return;
    }

    // Initialiser le contexte audio (nécessite une interaction utilisateur)
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    isPlaying = true;
    stopSignal = false;
    updatePlayUI('play');

    do {
        const completed = await runMorseSequence(morse);
        if (stopSignal) break; 
        
        if (isLoopEnabled && completed) {
            // Pause plus longue entre les répétitions
            await wait(3000); 
        }

    } while (isLoopEnabled && !stopSignal); 

    isPlaying = false;
    stopSignal = false;
    updatePlayUI('stop');
    toggleSignal(false);
}

/** Gère les boutons Play/Stop. */
function togglePlayStop(action) {
    if (action === 'play' && !isPlaying) {
        playMorse();
    } else if (action === 'stop') {
        stopMorse();
    }
}

/** Arrête la lecture du code Morse. */
function stopMorse() {
    if (isPlaying) {
        stopSignal = true;
        if(audioCtx) audioCtx.suspend();
        toggleSignal(false); 
        updatePlayUI('stop');
        showToast("Signal arrêté");
        // Attendre brièvement pour permettre la suspension du contexte audio
        setTimeout(() => { if(audioCtx) audioCtx.resume(); }, 100);
    }
}

/** Génère un bip sonore. */
function playTone(freq, duration) {
    if (isMuted) return;
    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;
    
    // Ajout d'une petite rampe pour éviter les "clics" sonores au début et à la fin
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + (duration / 1000) - 0.01);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + (duration / 1000));
}

/** Fonction utilitaire pour attendre. */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- TOGGLES ---

/** Gère l'activation/désactivation de la boucle. */
function toggleLoop() {
    isLoopEnabled = !isLoopEnabled;
    [loopToggleBtn].forEach(btn => { 
        btn.classList.toggle('bg-[var(--color-accent-cyan)]', isLoopEnabled);
        btn.classList.toggle('text-white', isLoopEnabled);
        btn.classList.toggle('bg-[var(--color-gray-50)]', !isLoopEnabled);
        btn.classList.toggle('text-[var(--color-text-subtle)]', !isLoopEnabled);
    });
    loopStatusDisplay.textContent = isLoopEnabled ? "BOUCLE ON" : "BOUCLE OFF";
    loopIcon.classList.toggle('fa-spin', isLoopEnabled);

    showToast(isLoopEnabled ? "Mode Répéter Activé" : "Mode Répéter Désactivé");
}

/** Gère l'activation/désactivation du son. */
function toggleMute() {
    isMuted = !isMuted;
    const buttons = [muteToggleBtn];
    const icons = [muteIcon];
    
    icons.forEach(icon => {
        icon.classList.toggle('fa-volume-xmark', isMuted);
        icon.classList.toggle('fa-volume-high', !isMuted);
    });
    
    buttons.forEach(btn => {
        btn.classList.toggle('bg-red-500', isMuted);
        btn.classList.toggle('text-white', isMuted);
        btn.classList.toggle('bg-[var(--color-gray-50)]', !isMuted);
        btn.classList.toggle('text-[var(--color-text-subtle)]', !isMuted);
    });

    showToast(isMuted ? "Audio Muet" : "Audio ON");
}

/** Gère l'activation/désactivation du mode Flash d'écran. */
function toggleFlashlightMode() {
     isFlashEnabled = !isFlashEnabled;
     const buttons = [flashToggleBtn];
     
     buttons.forEach(btn => {
        btn.classList.toggle('bg-[var(--color-accent-cyan)]', isFlashEnabled);
        btn.classList.toggle('text-white', isFlashEnabled);
        btn.classList.toggle('bg-[var(--color-gray-50)]', !isFlashEnabled);
        btn.classList.toggle('text-[var(--color-text-subtle)]', !isFlashEnabled);
     });
     
     showToast(isFlashEnabled ? "Lampe Torche Écran : ON" : "Lampe Torche Écran : OFF");
}


// --- UI HELPERS ---

/** Active ou désactive l'indicateur visuel (ampoule et flash écran). */
function toggleSignal(on) {
    // 1. Bulb (Internal UI indicator)
    signalBulb.classList.toggle('signal-active', on);
    
    // 2. Body Flash (Full-screen effect, only if enabled)
    if (isFlashEnabled) {
        document.body.classList.toggle('flash-active', on);
    }
}

/** Met à jour l'interface utilisateur pour l'état de lecture. */
function updatePlayUI(state) {
    const disableControls = state === 'play';
    
    playBtn.classList.toggle('hidden', disableControls);
    stopBtn.classList.toggle('hidden', !disableControls);

    inputText.disabled = disableControls;
    wpmInput.disabled = disableControls;
    
    // Désactiver les boutons de contrôle (sauf Stop, Mute, Flash) pendant la lecture
    document.querySelectorAll('.btn-action, .mode-button').forEach(btn => {
        if (btn.id !== 'stopBtn' && btn.id !== 'muteToggleBtn' && btn.id !== 'flashToggleBtn') {
            btn.disabled = disableControls;
        }
    });
    
    playingStatusDisplay.textContent = disableControls ? "TRANSMISSION EN COURS..." : "PRÊT";
    playingStatusDisplay.classList.toggle('text-red-500', disableControls);
    playingStatusDisplay.classList.toggle('animate-pulse', disableControls);
}

/** Efface le contenu d'un champ de texte. */
function clearInput(id) {
    document.getElementById(id).value = '';
    handleInput();
    showToast('Champ effacé');
}

/** Copie le contenu d'un élément dans le presse-papiers. */
function copyToClipboard(id, message) {
    const copyText = document.getElementById(id);
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    document.execCommand('copy');
    showToast(message);
    if (window.getSelection) {window.getSelection().removeAllRanges();}
}

/** Affiche une notification toast temporaire. */
function showToast(message) {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-msg');
    msg.innerText = message;
    
    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 2500);
}

/** Génère la table de référence du code Morse. */
function generateDictionaryTable() {
    morseDictionary.innerHTML = ''; 
    
    const filteredMorse = Object.entries(MORSE_CODE).filter(([char, code]) => char !== ' ');

    filteredMorse.forEach(([char, code]) => {
        const div = document.createElement('div');
        div.className = 'dictionary-item';
        div.innerHTML = `
            <span class="dict-char">${char.toUpperCase()}</span>
            <span class="dict-code mono-code">${code}</span>
        `;
        morseDictionary.appendChild(div);
    });
}

/** Gère le repliement/dépliement du dictionnaire. */
function toggleDictionary() {
    isDictionaryOpen = !isDictionaryOpen;
    
    if (isDictionaryOpen) {
        // Open: Set max-height to its scroll height and rotate icon up
        morseDictionaryContainer.style.maxHeight = morseDictionaryContainer.scrollHeight + "px";
        toggleIcon.classList.remove('rotated');
    } else {
        // Close: Set max-height to 0 and rotate icon down
        morseDictionaryContainer.style.maxHeight = '0';
        toggleIcon.classList.add('rotated');
    }
}


// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    // Événement du slider WPM
    wpmInput.addEventListener('input', () => {
        wpmValueDisplay.textContent = wpmInput.value;
    });
    wpmValueDisplay.textContent = wpmInput.value; // Initialiser l'affichage

    setMode(currentMode); // Initialiser le mode par défaut
    generateDictionaryTable(); // Remplir le dictionnaire
    
    // Dictionnaire fermé par défaut
    toggleIcon.classList.add('rotated'); 
    
    // Appliquer le thème sauvegardé (ou par défaut)
    applyInitialTheme();
});


// --- PWA: ENREGISTREMENT DU SERVICE WORKER (Fonction à garder si la PWA est voulue) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Ajuster le chemin pour la production (GitHub Pages) ou le développement
        const BASE_PATH = '/TraducteurMorsePro/';
        const SW_URL = window.location.hostname === 'mikefri.github.io' ? BASE_PATH + 'service-worker.js' : '/service-worker.js';

        navigator.serviceWorker.register(SW_URL)
            .then(registration => {
                console.log('Service Worker enregistré avec succès:', registration.scope);
            })
            .catch(error => {
                console.error('Échec de l\'enregistrement du Service Worker:', error);
            });
    });
}
