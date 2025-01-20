// Variables globales
let mediaFiles = {
    images: [],
    audio: null,
    drawing: null
};
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let canvas, ctx;
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Configuración inicial
document.addEventListener('DOMContentLoaded', () => {
    loadEntries();
    setupCanvas();
    setupImageUpload();
    setupAudioRecording();
});

// Configuración del canvas
function setupCanvas() {
    canvas = document.getElementById('drawingCanvas');
    ctx = canvas.getContext('2d');
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Soporte para eventos táctiles
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', stopDrawing);

    document.getElementById('toggleDrawing').addEventListener('click', () => {
        const container = document.querySelector('.canvas-container');
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    });
}

// Funciones para dibujo táctil
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    isDrawing = true;
    [lastX, lastY] = [x, y];
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!isDrawing) return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = document.getElementById('colorPicker').value;
    ctx.lineWidth = document.getElementById('brushSize').value;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    [lastX, lastY] = [x, y];
}

function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

function draw(e) {
    if (!isDrawing) return;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.strokeStyle = document.getElementById('colorPicker').value;
    ctx.lineWidth = document.getElementById('brushSize').value;
    ctx.lineCap = 'round';
    ctx.stroke();
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

function stopDrawing() {
    isDrawing = false;
    mediaFiles.drawing = canvas.toDataURL('image/png');
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    mediaFiles.drawing = null;
}

// Configuración de carga de imágenes
function setupImageUpload() {
    const imageInput = document.getElementById('imageInput');
    imageInput.addEventListener('change', handleImageUpload);
}

function handleImageUpload(e) {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
        if (file.size > 5 * 1024 * 1024) { // 5MB límite
            alert('La imagen es demasiado grande. El tamaño máximo es 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            mediaFiles.images.push(event.target.result);
            updateMediaPreview();
        };
        reader.readAsDataURL(file);
    });
}

// Configuración de grabación de audio
function setupAudioRecording() {
    const recordButton = document.getElementById('recordButton');
    recordButton.addEventListener('click', toggleRecording);
}

async function toggleRecording() {
    const recordButton = document.getElementById('recordButton');
    const statusElement = document.getElementById('recordingStatus');

    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.addEventListener('dataavailable', event => {
                audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener('stop', () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const reader = new FileReader();
                reader.onload = function(e) {
                    mediaFiles.audio = e.target.result;
                    updateMediaPreview();
                };
                reader.readAsDataURL(audioBlob);
                
                // Detener todos los tracks del stream
                stream.getTracks().forEach(track => track.stop());
            });

            mediaRecorder.start();
            isRecording = true;
            recordButton.textContent = '⏹️ Detener Grabación';
            statusElement.innerHTML = '<span class="recording-indicator">●</span> Grabando...';
        } catch (err) {
            console.error('Error al acceder al micrófono:', err);
            alert('No se pudo acceder al micrófono');
        }
    } else {
        mediaRecorder.stop();
        isRecording = false;
        recordButton.textContent = '🎤 Grabar Audio';
        statusElement.textContent = '';
    }
}

// Funciones de búsqueda
function searchEntries() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const entries = JSON.parse(localStorage.getItem('diaryEntries') || '[]');
    
    const filteredEntries = entries.filter(entry => 
        entry.title.toLowerCase().includes(searchTerm) ||
        entry.content.toLowerCase().includes(searchTerm)
    );

    renderEntries(filteredEntries);
}

// Gestión de la vista previa de medios
function updateMediaPreview() {
    const preview = document.getElementById('mediaPreview');
    preview.innerHTML = '';

    // Previsualizar imágenes
    mediaFiles.images.forEach((image, index) => {
        const container = document.createElement('div');
        container.className = 'preview-item';
        container.innerHTML = `
            <img src="${image}" alt="Imagen ${index + 1}">
            <button class="delete-btn" onclick="removeImage(${index})">×</button>
        `;
        preview.appendChild(container);
    });

    // Previsualizar audio
    if (mediaFiles.audio) {
        const container = document.createElement('div');
        container.className = 'preview-item';
        container.innerHTML = `
            <audio controls src="${mediaFiles.audio}"></audio>
            <button class="delete-btn" onclick="removeAudio()">×</button>
        `;
        preview.appendChild(container);
    }
}

function removeImage(index) {
    mediaFiles.images.splice(index, 1);
    updateMediaPreview();
}

function removeAudio() {
    mediaFiles.audio = null;
    updateMediaPreview();
}

// Gestión de entradas
function addEntry() {
    const titleInput = document.getElementById('entryTitle');
    const contentInput = document.getElementById('entryContent');
    const colorInput = document.getElementById('entryColor');
    
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const color = colorInput.value;

    if (!title || !content) {
        alert('Por favor completa el título y el contenido');
        return;
    }

    const entry = {
        id: Date.now(),
        title,
        content,
        color,
        date: new Date().toLocaleString('es-ES'),
        media: {
            images: [...mediaFiles.images],
            audio: mediaFiles.audio,
            drawing: mediaFiles.drawing
        }
    };

    let entries = JSON.parse(localStorage.getItem('diaryEntries') || '[]');
    entries.unshift(entry);
    localStorage.setItem('diaryEntries', JSON.stringify(entries));

    // Limpiar campos
    titleInput.value = '';
    contentInput.value = '';
    mediaFiles = { images: [], audio: null, drawing: null };
    clearCanvas();
    updateMediaPreview();

    loadEntries();
}

function renderEntries(entries) {
    const entriesList = document.getElementById('entriesList');

    if (entries.length === 0) {
        entriesList.innerHTML = `
            <div class="empty-state">
                <p>No se encontraron entradas</p>
            </div>
        `;
        return;
    }

    entriesList.innerHTML = entries.map(entry => `
        <div class="entry-card" 
             data-color="${entry.color || '#4A90E2'}"
             style="--entry-color: ${entry.color || '#4A90E2'}">
            <button class="delete-btn" onclick="deleteEntry(${entry.id})">×</button>
            <h3>${entry.title}</h3>
            <div class="entry-meta">${entry.date}</div>
            <p>${entry.content}</p>
            <div class="entry-media">
                ${entry.media.images.map((img, index) => `
                    <img src="${img}" alt="Imagen ${index + 1}" class="entry-image">
                `).join('')}
                
                ${entry.media.audio ? `
                    <div class="audio-player">
                        <audio controls>
                            <source src="${entry.media.audio}" type="audio/wav">
                            Tu navegador no soporta el elemento de audio.
                        </audio>
                    </div>
                ` : ''}
                
                ${entry.media.drawing ? `
                    <img src="${entry.media.drawing}" alt="Dibujo" class="entry-drawing">
                ` : ''}
            </div>
        </div>
    `).join('');
}

function loadEntries() {
    const entries = JSON.parse(localStorage.getItem('diaryEntries') || '[]');
    renderEntries(entries);
}

function deleteEntry(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta entrada?')) {
        return;
    }

    let entries = JSON.parse(localStorage.getItem('diaryEntries') || '[]');
    entries = entries.filter(entry => entry.id !== id);
    localStorage.setItem('diaryEntries', JSON.stringify(entries));
    loadEntries();
}

// Funciones de exportación/importación
function exportDiary() {
    const entries = JSON.parse(localStorage.getItem('diaryEntries') || '[]');
    const dataStr = JSON.stringify(entries, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportLink = document.createElement('a');
    exportLink.setAttribute('href', dataUri);
    exportLink.setAttribute('download', 'mi_diario.json');
    exportLink.click();
}

function importDiary(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const entries = JSON.parse(e.target.result);
            localStorage.setItem('diaryEntries', JSON.stringify(entries));
            loadEntries();
            alert('Diario importado exitosamente');
        } catch (error) {
            alert('Error al importar el archivo');
        }
    };
    reader.readAsText(file);
}