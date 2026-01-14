const textInput = document.getElementById('text-input');
const wpmInput = document.getElementById('wpm-input');
const sizeInput = document.getElementById('size-input');
const startBtn = document.getElementById('start-btn');
const settingsView = document.getElementById('settings-view');
const readerView = document.getElementById('reader-view');
const rsvpDisplay = document.getElementById('rsvp-display');
const currentWpmDisplay = document.getElementById('current-wpm-display');
const progressBar = document.getElementById('progress-bar');
const wordCounter = document.getElementById('word-counter');
const totalWords = document.getElementById('total-words');
const navTextBtn = document.getElementById('nav-text-btn');
const navSettingsBtn = document.getElementById('nav-settings-btn');
const modeInputBtn = document.getElementById('mode-input-btn');
const modeFileBtn = document.getElementById('mode-file-btn');
const fileUpload = document.getElementById('file-upload');
const sizeValue = document.getElementById('size-value');
const guideTop = document.getElementById('guide-top');
const guideBottom = document.getElementById('guide-bottom');
const appearanceMenu = document.getElementById('appearance-menu');
const fontBtns = document.querySelectorAll('.font-btn');
const themeBtns = document.querySelectorAll('.theme-btn');
const readerExitBtn = document.getElementById('reader-exit-btn');
const readerControls = document.getElementById('reader-controls');


let words = [];
let currentIndex = 0;
let isPlaying = false;
let wpm = 300;
let timer = null;
let mode = 'input'; // 'input' or 'file'

// Settings
let fontSize = 64;

// Default text
const defaultText = `RSVP (Rapid Serial Visual Presentation) is a method of displaying information (generally text) in which the items are displayed sequentially in a fixed location. This allows for reading at much faster speeds than normal because it eliminates the time spent on eye movement. Try pasting your own text here to see how fast you can read!`;

// Initialize
textInput.value = defaultText;
wpmInput.value = wpm;

// Event Listeners
startBtn.addEventListener('click', startReader);
navTextBtn.addEventListener('click', () => {
    if (!readerView.classList.contains('hidden')) {
        stopReader();
    }
    textInput.focus();
});
navSettingsBtn.addEventListener('click', () => {
    if (!readerView.classList.contains('hidden')) {
        stopReader();
    }
    
    // Toggle Appearance Menu if that's what we want, OR simple focus on toolbar.
    // User asked for "Secondary Menu".
    // Let's toggle the secondary menu, and if open, hide standard toolbar to reduce clutter? Or show below?
    // Let's toggle visibility
    
    if (appearanceMenu.classList.contains('hidden')) {
        appearanceMenu.classList.remove('hidden');
        // Trigger reflow
        void appearanceMenu.offsetWidth;
        appearanceMenu.classList.remove('opacity-0', 'scale-95');
        appearanceMenu.classList.add('opacity-100', 'scale-100');
        navSettingsBtn.querySelector('i').classList.add('animate-spin'); // Optional visual feedback
        setTimeout(() => navSettingsBtn.querySelector('i').classList.remove('animate-spin'), 500);
    } else {
        closeAppearanceMenu();
    }
});

function closeAppearanceMenu() {
    appearanceMenu.classList.remove('opacity-100', 'scale-100');
    appearanceMenu.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        appearanceMenu.classList.add('hidden');
    }, 300);
}

// Appearance Handling
fontBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from others
        fontBtns.forEach(b => b.classList.remove('text-[var(--main-color)]'));
        btn.classList.add('text-[var(--main-color)]');
        
        const font = btn.dataset.font;
        document.documentElement.style.setProperty('--font-main', font);
    });
});

themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Set Theme
        const theme = btn.dataset.theme;
        if (theme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
    });
});

// Hide appearance menu when clicking outside
document.addEventListener('click', (e) => {
    if (!appearanceMenu.classList.contains('hidden') && 
        !appearanceMenu.contains(e.target) && 
        !navSettingsBtn.contains(e.target)) {
        closeAppearanceMenu();
    }
});
wpmInput.addEventListener('change', (e) => wpm = parseInt(e.target.value));
sizeInput.addEventListener('input', (e) => {
    fontSize = e.target.value;
    sizeValue.textContent = `${fontSize}px`;
    rsvpDisplay.style.fontSize = `${fontSize}px`;
    updateGuideGap();
});

// Mode switching
modeInputBtn.addEventListener('click', () => {
    setMode('input');
});

modeFileBtn.addEventListener('click', () => {
    setMode('file');
    fileUpload.click();
});

fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        textInput.value = e.target.result;
        modeFileBtn.innerHTML = `file (loaded)`;
        // Restore styling after 2s
        setTimeout(() => {
             modeFileBtn.innerHTML = `file`;
        }, 2000);
    };
    reader.readAsText(file);
});

function setMode(newMode) {
    mode = newMode;
    if (mode === 'input') {
        modeInputBtn.className = "text-[var(--main-color)] font-bold transition-colors";
        modeFileBtn.className = "hover:text-[var(--text-color)] transition-colors";
        textInput.classList.remove('opacity-50', 'pointer-events-none');
        modeFileBtn.innerHTML = "file";
    } else {
        modeFileBtn.className = "text-[var(--main-color)] font-bold transition-colors";
        modeInputBtn.className = "hover:text-[var(--text-color)] transition-colors";
    }
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (settingsView.classList.contains('hidden')) {
            // Reader activated: Toggle Play
            e.preventDefault();
            togglePlay();
        } else {
            // Settings view: Check if we are typing
            const activeTag = document.activeElement.tagName.toLowerCase();
            // Don't start if user is typing in textarea or input
            if (activeTag !== 'textarea' && activeTag !== 'input') {
                e.preventDefault();
                startReader();
            }
        }
    } else if (e.code === 'Escape') {
        if (!settingsView.classList.contains('hidden')) return;
        stopReader();
    } else if (e.code === 'ArrowUp') {
        if (!readerView.classList.contains('hidden')) {
            wpm += 10;
            updateSpeed();
        }
    } else if (e.code === 'ArrowDown') {
        if (!readerView.classList.contains('hidden')) {
            wpm = Math.max(10, wpm - 10);
            updateSpeed();
        }
    } else if (e.code === 'ArrowLeft') {
        if (!readerView.classList.contains('hidden')) {
           move(-1);
        }
    } else if (e.code === 'ArrowRight') {
         if (!readerView.classList.contains('hidden')) {
           move(1);
        }
    }
});

function startReader() {
    const rawText = textInput.value.trim() || defaultText;
    words = rawText.split(/\s+/); // Simple split by whitespace
    if (words.length === 0) return;

    currentIndex = 0;
    wpm = parseInt(wpmInput.value) || 300;
    
    // Switch Views
    settingsView.classList.add('hidden');
    // Hide body overflow
    document.body.style.overflow = 'hidden';
    readerView.classList.remove('hidden');
    readerView.classList.add('flex');

    totalWords.textContent = words.length;
    
    updateSpeed(); // Show WPM
    updateGuideGap();
    
    // UI Cleanup
    setReaderControlsVisibility(false);

    // Small delay before starting
    setTimeout(() => {
        isPlaying = true;
        renderLoop();
    }, 500);
}

function stopReader() {
    isPlaying = false;
    clearTimeout(timer);
    readerView.classList.add('hidden');
    readerView.classList.remove('flex');
    settingsView.classList.remove('hidden');
    document.body.style.overflow = '';
    // Show cursor again just in case
    document.body.style.cursor = 'default';
}

function togglePlay() {
    isPlaying = !isPlaying;
    if (isPlaying) {
        setReaderControlsVisibility(false);
        renderLoop();
    } else {
        setReaderControlsVisibility(true);
        clearTimeout(timer);
    }
}

function setReaderControlsVisibility(visible) {
    if (visible) {
        readerControls.classList.remove('opacity-0', 'pointer-events-none'); // Enable interaction
        readerExitBtn.classList.remove('opacity-0', 'scale-90', 'pointer-events-none'); // Enable interaction
        readerExitBtn.classList.add('scale-100');
        document.body.style.cursor = 'default';
    } else {
        readerControls.classList.add('opacity-0', 'pointer-events-none'); // Disable interaction
        readerExitBtn.classList.remove('scale-100');
        readerExitBtn.classList.add('opacity-0', 'scale-90', 'pointer-events-none'); // Disable interaction
        document.body.style.cursor = 'none'; // Hide cursor for immersion
    }
}

// Click to toggle play in reader view
readerView.addEventListener('click', (e) => {
    // Ignore if clicking the exit button directly (it has its own handler)
    if (readerExitBtn.contains(e.target)) return;
    togglePlay();
});

readerExitBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent toggling play
    stopReader();
});

function updateSpeed() {
    wpmInput.value = wpm;
    currentWpmDisplay.textContent = `${wpm} wpm`;
}

function move(delta) {
    currentIndex = Math.max(0, Math.min(words.length - 1, currentIndex + delta));
    renderWord(words[currentIndex]);
    updateProgress();
}

function renderLoop() {
    if (!isPlaying) return;
    if (currentIndex >= words.length) {
        isPlaying = false;
        setReaderControlsVisibility(true); // Show controls when finished
        return;
    }

    const word = words[currentIndex];
    renderWord(word);
    updateProgress();

    // Calculate delay based on WPM
    // Standard word length is often considered 5 chars.
    // But basic WPM = 60000 ms / WPM
    let delay = 60000 / wpm;

    // Heuristics for natural pauses
    if (word.endsWith('.') || word.endsWith('!') || word.endsWith('?')) {
        delay *= 2.0; // Pause longer at sentence end
    } else if (word.endsWith(',') || word.endsWith(';') || word.endsWith(':')) {
        delay *= 1.5; // Pause slightly at clauses
    } else if (word.length > 8) {
        delay *= 1.2; // Slight pause for long words
    }

    currentIndex++;
    timer = setTimeout(renderLoop, delay);
}

function updateProgress() {
    const percent = ((currentIndex) / words.length) * 100;
    progressBar.style.width = `${percent}%`;
    wordCounter.textContent = currentIndex;
}

function getPivotIndex(length) {
    if (length === 1) return 0;
    if (length >= 2 && length <= 5) return 1;
    if (length >= 6 && length <= 9) return 2;
    if (length >= 10 && length <= 13) return 3;
    return 4; 
}

function renderWord(word) {
    if (!word) return;

    const length = word.length;
    const pivotIndex = getPivotIndex(length);
    
    // Split word into parts
    const prefix = word.substring(0, pivotIndex);
    const pivot = word[pivotIndex];
    const suffix = word.substring(pivotIndex + 1);

    // Using Flexbox alignment trick with flex-1 on sides
    // Does not rely on monospace fonts or ch units for alignment
    // The Pivot Character is in its own container which is centered.
    // The Prefix is in a container that aligns end (right)
    // The Suffix is in a container that aligns start (left)
    
    let html = `
        <div class="flex items-baseline justify-center w-full">
            <div class="flex-1 text-right flex justify-end">
                <span class="text-[var(--text-color)]">${prefix}</span>
            </div>
            <div class="flex-none flex justify-center w-[1ch]"> <!-- Fixed width for pivot assumed roughly 1ch if mono, or auto if we want strict center -->
                 <!-- Actually, if we want strict center of the CHARACTER, we should just let it be center -->
                 <!-- If font is monospaced, 1ch is perfect. -->
                <span class="pivot-char relative z-10">${pivot}</span>
            </div>
            <div class="flex-1 text-left flex justify-start">
               <span class="text-[var(--text-color)]">${suffix}</span>
            </div>
        </div>
    `;
    
    rsvpDisplay.innerHTML = html;
}

function updateGuideGap() {
    // Adjust the vertical translation of the guides based on font size
    if(!guideTop || !guideBottom) return;
    const gap = Math.floor(fontSize * 0.6 + 20); 
    guideTop.style.transform = `translateY(-${gap}px)`;
    guideBottom.style.transform = `translateY(${gap}px)`;
}
