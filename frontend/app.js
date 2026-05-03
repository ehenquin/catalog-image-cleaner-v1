/**
 * Catalog Image Cleaner - App Logic
 */

// --- CONFIGURATION ---
const API_BASE_URL = "http://localhost:8000"; // CAMBIAR ESTO AL DESPLEGAR
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// --- STATE MANAGEMENT ---
let state = {
    currentStatus: 'idle', // idle, processing, editor, error
    originalImage: null,
    processedImage: null,
    canvasSettings: {
        bgType: 'transparent', // transparent, color, gradient
        bgColor: '#ffffff',
        format: 'square',
        scale: 0.8,
        margin: 0.1,
        shadowEnabled: false,
        shadowIntensity: 0.3,
        shadowBlur: 15,
        offsetX: 0,
        offsetY: 0
    }
};

const FORMAT_PRESETS = {
    square: { width: 1080, height: 1080 },
    whatsapp: { width: 1080, height: 1080 },
    instagram: { width: 1080, height: 1350 },
    story: { width: 1080, height: 1920 },
    mercado_libre: { width: 1200, height: 1200 }
};

// --- DOM ELEMENTS ---
const sections = {
    idle: document.getElementById('section-idle'),
    processing: document.getElementById('section-processing'),
    editor: document.getElementById('section-editor'),
    error: document.getElementById('section-error')
};

const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateUI();
});

function setupEventListeners() {
    // File Upload
    fileInput.addEventListener('change', handleFileSelect);
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', handleDrop);

    // Controls
    document.querySelectorAll('.bg-opt').forEach(opt => {
        opt.addEventListener('click', () => {
            const type = opt.dataset.type;
            if (type === 'picker') {
                document.getElementById('bg-color-picker').click();
            } else if (type === 'color') {
                updateSettings({ bgType: 'color', bgColor: opt.dataset.value });
            } else if (type === 'gradient') {
                updateSettings({ bgType: 'gradient' });
            } else {
                updateSettings({ bgType: type });
            }

            document.querySelectorAll('.bg-opt').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
        });
    });

    document.getElementById('bg-color-picker').addEventListener('input', (e) => {
        updateSettings({ bgType: 'color', bgColor: e.target.value });
        document.querySelectorAll('.bg-opt').forEach(o => o.classList.remove('active'));
        document.querySelector('.bg-opt[data-type="picker"]').classList.add('active');
    });

    document.getElementById('shadow-toggle').addEventListener('change', (e) => {
        updateSettings({ shadowEnabled: e.target.checked });
        document.getElementById('shadow-controls').classList.toggle('hidden', !e.target.checked);
    });

    document.getElementById('shadow-intensity').addEventListener('input', (e) => {
        updateSettings({ shadowIntensity: e.target.value / 100 });
    });

    document.getElementById('shadow-blur').addEventListener('input', (e) => {
        updateSettings({ shadowBlur: parseInt(e.target.value) });
    });

    document.getElementById('format-preset').addEventListener('change', (e) => {
        updateSettings({ format: e.target.value });
    });

    document.getElementById('product-scale').addEventListener('input', (e) => {
        const val = e.target.value;
        document.getElementById('scale-val').innerText = val + '%';
        updateSettings({ scale: val / 100 });
    });

    document.getElementById('product-margin').addEventListener('input', (e) => {
        const val = e.target.value;
        document.getElementById('margin-val').innerText = val + '%';
        updateSettings({ margin: val / 100 });
    });

    document.getElementById('btn-center').addEventListener('click', () => {
        updateSettings({ offsetX: 0, offsetY: 0 });
    });

    document.getElementById('btn-reset').addEventListener('click', resetSettings);

    // Actions
    document.getElementById('btn-download-png').addEventListener('click', () => downloadImage('png'));
    document.getElementById('btn-download-jpg').addEventListener('click', () => downloadImage('jpg'));
    document.getElementById('btn-download-webp').addEventListener('click', () => downloadImage('webp'));
    document.getElementById('btn-new-image').addEventListener('click', resetApp);
    document.getElementById('btn-new-image-top').addEventListener('click', resetApp);
    document.getElementById('btn-error-retry').addEventListener('click', resetApp);

    const toggleBtn = document.getElementById('btn-toggle-original');

    toggleBtn.addEventListener('mousedown', () => renderCanvas(true));
    toggleBtn.addEventListener('mouseup', () => renderCanvas());
    toggleBtn.addEventListener('mouseleave', () => renderCanvas());

    toggleBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        renderCanvas(true);
    });
    toggleBtn.addEventListener('touchend', () => renderCanvas());
    toggleBtn.addEventListener('touchcancel', () => renderCanvas());
}

// --- FILE HANDLING ---
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) processUpload(file);
}

function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processUpload(file);
}

async function processUpload(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showError('Formato no válido', 'Por favor subí una imagen JPG, PNG o WEBP.');
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        showError('Archivo muy grande', 'El tamaño máximo permitido es 10MB.');
        return;
    }

    setStatus('processing');

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => { state.originalImage = img; };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/api/remove-background`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Error en el servidor');
        }

        const blob = await response.blob();
        const processedUrl = URL.createObjectURL(blob);

        const processedImg = new Image();
        processedImg.onload = () => {
            state.processedImage = processedImg;
            setStatus('editor');
            resetSettings();
            renderCanvas();
        };
        processedImg.src = processedUrl;

    } catch (err) {
        console.error(err);
        showError('Error de procesamiento', err.message || 'No se pudo eliminar el fondo. ¿Está prendido el backend?');
    }
}

// --- CANVAS ENGINE ---
function renderCanvas(showOriginal = false) {
    if (!state.processedImage && !state.originalImage) return;

    const preset = FORMAT_PRESETS[state.canvasSettings.format];
    canvas.width = preset.width;
    canvas.height = preset.height;

    // 1. Draw Background
    if (state.canvasSettings.bgType === 'color') {
        ctx.fillStyle = state.canvasSettings.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (state.canvasSettings.bgType === 'gradient') {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#dbeafe');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (state.canvasSettings.bgType === 'transparent') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    const imgToDraw = showOriginal ? state.originalImage : state.processedImage;
    if (!imgToDraw) return;

    // 2. Calculate Dimensions
    const marginPx = canvas.width * state.canvasSettings.margin;
    const availableWidth = canvas.width - (marginPx * 2);
    const availableHeight = canvas.height - (marginPx * 2);

    let drawWidth, drawHeight;
    const imgAspect = imgToDraw.width / imgToDraw.height;
    const canvasAspect = availableWidth / availableHeight;

    if (imgAspect > canvasAspect) {
        drawWidth = availableWidth * state.canvasSettings.scale;
        drawHeight = drawWidth / imgAspect;
    } else {
        drawHeight = availableHeight * state.canvasSettings.scale;
        drawWidth = drawHeight * imgAspect;
    }

    const x = (canvas.width - drawWidth) / 2 + state.canvasSettings.offsetX;
    const y = (canvas.height - drawHeight) / 2 + state.canvasSettings.offsetY;

    // 3. Draw Shadow
    if (state.canvasSettings.shadowEnabled && !showOriginal) {
        ctx.save();
        ctx.shadowColor = `rgba(0, 0, 0, ${state.canvasSettings.shadowIntensity})`;
        ctx.shadowBlur = state.canvasSettings.shadowBlur;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = state.canvasSettings.shadowBlur / 2;
        ctx.drawImage(imgToDraw, x, y, drawWidth, drawHeight);
        ctx.restore();
    } else {
        ctx.drawImage(imgToDraw, x, y, drawWidth, drawHeight);
    }
}

// --- UTILS ---
function setStatus(newStatus) {
    state.currentStatus = newStatus;
    updateUI();
}

function updateUI() {
    Object.keys(sections).forEach(key => {
        sections[key].classList.toggle('active', state.currentStatus === key);
    });
}

function updateSettings(newSettings) {
    state.canvasSettings = { ...state.canvasSettings, ...newSettings };
    renderCanvas();
}

function resetSettings() {
    state.canvasSettings = {
        bgType: 'transparent',
        bgColor: '#ffffff',
        format: 'square',
        scale: 0.8,
        margin: 0.1,
        shadowEnabled: false,
        shadowIntensity: 0.3,
        shadowBlur: 15,
        offsetX: 0,
        offsetY: 0
    };

    document.getElementById('format-preset').value = 'square';
    document.getElementById('product-scale').value = 80;
    document.getElementById('scale-val').innerText = '80%';
    document.getElementById('product-margin').value = 10;
    document.getElementById('margin-val').innerText = '10%';
    document.getElementById('shadow-toggle').checked = false;
    document.getElementById('shadow-controls').classList.add('hidden');

    document.querySelectorAll('.bg-opt').forEach(o => o.classList.remove('active'));
    document.querySelector('.bg-opt[data-type="transparent"]').classList.add('active');

    renderCanvas();
}

function resetApp() {
    state.originalImage = null;
    state.processedImage = null;
    fileInput.value = '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    resetSettings();
    setStatus('idle');
}

function showError(title, message) {
    document.getElementById('error-title').innerText = title;
    document.getElementById('error-message').innerText = message;
    setStatus('error');
}

function downloadImage(format) {
    if (format === 'jpg' && state.canvasSettings.bgType === 'transparent') {
        const oldBgType = state.canvasSettings.bgType;
        const oldBgColor = state.canvasSettings.bgColor;

        state.canvasSettings.bgType = 'color';
        state.canvasSettings.bgColor = '#ffffff';
        renderCanvas();

        const link = document.createElement('a');
        link.download = `producto-catalogo.${format}`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();

        state.canvasSettings.bgType = oldBgType;
        state.canvasSettings.bgColor = oldBgColor;
        renderCanvas();
    } else {
        const mime = format === 'png' ? 'image/png' : (format === 'webp' ? 'image/webp' : 'image/jpeg');
        const link = document.createElement('a');
        link.download = `producto-catalogo.${format}`;
        link.href = canvas.toDataURL(mime, 0.9);
        link.click();
    }

    showToast(`Imagen descargada como ${format.toUpperCase()}`);
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
