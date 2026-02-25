/* script.js */

// Use pdfjsLib from the global scope (loaded via CDN)
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let currentPdfBytes = null;
let currentPdfFile = null;
let pagesData = []; // Store page dimensions
let pdfDocumentObj = null;
let currentScale = 1.0;
let defaultScale = 1.0;
let widthFitScale = 1.0;
let currentColor = '#000000';

// UI Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const pdfContainer = document.getElementById('pdfContainer');
const addTextBtn = document.getElementById('addTextBtn');
const addSignatureBtn = document.getElementById('addSignatureBtn');
const saveBtn = document.getElementById('saveBtn');
const instructionText = document.getElementById('instructionText');

// Drag and Drop
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
});

async function handleFile(file) {
    if (file.type !== 'application/pdf') {
        alert('Please upload a valid PDF file.');
        return;
    }

    currentPdfFile = file;
    const arrayBuffer = await file.arrayBuffer();
    currentPdfBytes = new Uint8Array(arrayBuffer);

    // Hide upload area and text, show PDF container
    uploadArea.classList.add('hidden');
    document.getElementById('madeWithLove').classList.add('hidden');
    pdfContainer.classList.remove('hidden');

    addTextBtn.classList.remove('hidden');
    addTextBtn.disabled = false;
    document.getElementById('zoomGroup').classList.remove('hidden');
    document.getElementById('symbolsGroup').classList.remove('hidden');
    document.getElementById('textToolbar').classList.remove('hidden');
    document.getElementById('colorPickerGroup').classList.remove('hidden');
    addSignatureBtn.classList.remove('hidden');
    addSignatureBtn.disabled = false;
    saveBtn.classList.remove('hidden');
    saveBtn.disabled = false;
    instructionText.innerText = 'Add text/signature and Drag to position';

    renderPDF(currentPdfBytes);
}

async function renderPDF(pdfBytes, renderScale = null) {
    pdfContainer.innerHTML = '';
    pagesData = [];

    if (!pdfDocumentObj) {
        const loadingTask = pdfjsLib.getDocument({
            data: pdfBytes,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true
        });
        pdfDocumentObj = await loadingTask.promise;
    }

    for (let pageNum = 1; pageNum <= pdfDocumentObj.numPages; pageNum++) {
        const page = await pdfDocumentObj.getPage(pageNum);
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const availableHeight = window.innerHeight - document.querySelector('.navbar').offsetHeight - 40;
        const availableWidth = pdfContainer.clientWidth - 40;

        if (renderScale === null) {
            // Calculate scale for "Full Page View" (fitting vertical height)
            let scaleFitPage = availableHeight / unscaledViewport.height;

            // Ensure it doesn't overflow horizontally on narrow mobile screens
            if (unscaledViewport.width * scaleFitPage > availableWidth) {
                scaleFitPage = availableWidth / unscaledViewport.width;
            }
            // Prevent it from being too tiny or incredibly huge
            defaultScale = Math.max(0.5, Math.min(scaleFitPage, 3.0));
            widthFitScale = availableWidth / unscaledViewport.width;
            currentScale = defaultScale;
        } else {
            currentScale = renderScale;
        }

        document.getElementById('zoomLabel').innerText = Math.round(currentScale * 100) + '%';
        const viewport = page.getViewport({ scale: currentScale });

        const wrapper = document.createElement('div');
        wrapper.className = 'pdf-page-wrapper';
        wrapper.style.width = `${viewport.width}px`;
        wrapper.style.height = `${viewport.height}px`;
        wrapper.dataset.pageNumber = pageNum;

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        wrapper.appendChild(canvas);
        pdfContainer.appendChild(wrapper);

        pagesData.push({
            pageNumber: pageNum,
            width: viewport.width,
            height: viewport.height,
            scale: currentScale,
            originalWidth: viewport.viewBox[2],   // width in pdf points
            originalHeight: viewport.viewBox[3]   // height in pdf points
        });

        const renderContext = {
            canvasContext: canvas.getContext('2d'),
            viewport: viewport
        };
        await page.render(renderContext).promise;
    }
}

// Zoom Controls
document.getElementById('zoomInBtn').addEventListener('click', () => {
    if (currentScale < 3.0) renderPDF(currentPdfBytes, currentScale + 0.25);
});
document.getElementById('zoomOutBtn').addEventListener('click', () => {
    if (currentScale > 0.5) renderPDF(currentPdfBytes, currentScale - 0.25);
});
document.getElementById('zoomFitWidthBtn').addEventListener('click', () => {
    renderPDF(currentPdfBytes, widthFitScale);
});
document.getElementById('zoomFitPageBtn').addEventListener('click', () => {
    renderPDF(currentPdfBytes, defaultScale);
});

function getVisiblePage() {
    const pages = document.querySelectorAll('.pdf-page-wrapper');
    if (!pages.length) return null;
    for (let i = 0; i < pages.length; i++) {
        const rect = pages[i].getBoundingClientRect();
        if (rect.top >= 0 || rect.bottom > window.innerHeight / 2) {
            return pages[i];
        }
    }
    return pages[0];
}

// Add Text Functionality
// Common function for adding draggable text/symbols
function addTextOverlay(defaultText, isEditable = true) {
    const targetPage = getVisiblePage();
    if (!targetPage) return null;

    const wrapper = document.createElement('div');
    wrapper.className = 'draggable-text active';
    wrapper.style.left = '50px';
    wrapper.style.top = '50px';

    const textContent = document.createElement('div');
    textContent.className = 'text-content';
    textContent.innerText = defaultText;
    textContent.style.color = currentColor;
    textContent.style.whiteSpace = 'pre-wrap';
    textContent.style.wordBreak = 'break-word';
    textContent.style.lineHeight = '1.2';
    textContent.style.outline = 'none';
    textContent.style.minWidth = '20px';

    if (isEditable) {
        textContent.style.cursor = 'text';
    } else {
        textContent.style.cursor = 'move';
        // Make symbols slightly larger by default
        textContent.style.fontSize = '24px';
    }

    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'text-delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => {
        e.stopPropagation(); // Avoid triggering any outside click event
        wrapper.remove();
    };

    wrapper.appendChild(textContent);
    wrapper.appendChild(deleteBtn);
    targetPage.appendChild(wrapper);

    makeDraggable(wrapper, targetPage);

    if (isEditable) {
        wrapper.addEventListener('dblclick', () => {
            textContent.contentEditable = true;
            textContent.focus();
            document.execCommand('selectAll', false, null);
        });

        textContent.addEventListener('blur', () => {
            textContent.contentEditable = false;
            if (textContent.innerText.trim() === '') {
                textContent.innerText = defaultText;
            }
        });
    }

    wrapper.addEventListener('mousedown', () => {
        document.querySelectorAll('.draggable-text, .draggable-signature').forEach(el => el.classList.remove('active'));
        wrapper.classList.add('active');
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target) &&
            !e.target.closest('#addTextBtn') &&
            !e.target.closest('#symbolsGroup') &&
            !e.target.closest('#textToolbar') &&
            !e.target.closest('#colorPickerGroup')) {
            wrapper.classList.remove('active');
        }
    });

    return wrapper;
}

// Add Text Functionality
addTextBtn.addEventListener('click', () => {
    const wrapper = addTextOverlay('Double-click to edit', true);
    if (wrapper) {
        // Trigger focus for quick edit on regular text blocks
        const txt = wrapper.querySelector('.text-content');
        txt.contentEditable = true;
        txt.focus();
        document.execCommand('selectAll', false, null);
    }
});

// Symbols Functionality
document.getElementById('addCheckBtn').addEventListener('click', () => addTextOverlay('✔', false));
document.getElementById('addXBtn').addEventListener('click', () => addTextOverlay('✘', false));
document.getElementById('addCircleBtn').addEventListener('click', () => addTextOverlay('●', false));

// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const actionsMenu = document.getElementById('actionsMenu');
if (mobileMenuBtn && actionsMenu) {
    mobileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent immediate close by document listener
        actionsMenu.classList.toggle('show');
    });

    // Auto-close menu on document click outside
    document.addEventListener('click', (e) => {
        if (!actionsMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            actionsMenu.classList.remove('show');
        }
    });

    // Auto-close menu when a button inside is clicked
    actionsMenu.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            actionsMenu.classList.remove('show');
        });
    });
}

// Font size functionality
const btnIncreaseText = document.getElementById('btnIncreaseText');
const btnDecreaseText = document.getElementById('btnDecreaseText');

btnIncreaseText.addEventListener('click', () => {
    const activeText = document.querySelector('.draggable-text.active .text-content');
    if (activeText) {
        let currentSize = parseInt(window.getComputedStyle(activeText).fontSize);
        activeText.style.fontSize = (currentSize + 2) + 'px';
    }
});

btnDecreaseText.addEventListener('click', () => {
    const activeText = document.querySelector('.draggable-text.active .text-content');
    if (activeText) {
        let currentSize = parseInt(window.getComputedStyle(activeText).fontSize);
        activeText.style.fontSize = Math.max(8, currentSize - 2) + 'px';
    }
});

// Color Picker Functionality
document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
        // Update active swatch indicator
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active-swatch'));
        swatch.classList.add('active-swatch');
        currentColor = swatch.dataset.color;

        // Apply color to currently active text element
        const activeText = document.querySelector('.draggable-text.active .text-content');
        if (activeText) {
            activeText.style.color = currentColor;
        }
    });
});

// Signature Drag Functionality
function addSignatureToPage(imgData) {
    const targetPage = getVisiblePage();
    if (!targetPage) return;

    const sigDiv = document.createElement('div');
    sigDiv.className = 'draggable-signature active';
    sigDiv.style.left = '50px';
    sigDiv.style.top = '50px';

    const img = document.createElement('img');
    img.src = imgData;
    img.style.height = '60px';

    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'text-delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        sigDiv.remove();
    };

    const resizer = document.createElement('div');
    resizer.className = 'img-resizer';

    sigDiv.appendChild(img);
    sigDiv.appendChild(deleteBtn);
    sigDiv.appendChild(resizer);
    targetPage.appendChild(sigDiv);

    makeDraggable(sigDiv, targetPage);
    makeResizable(sigDiv, img, resizer);


    document.addEventListener('click', (e) => {
        if (!sigDiv.contains(e.target) && !e.target.closest('#addSignatureBtn')) {
            sigDiv.classList.remove('active');
        }
    });
    sigDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.draggable-signature').forEach(el => el.classList.remove('active'));
        sigDiv.classList.add('active');
    });
}

function makeDraggable(element, container) {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    element.addEventListener('mousedown', dragStart);

    function dragStart(e) {
        if (e.target.classList.contains('text-delete-btn')) return;

        if (e.target.isContentEditable) {
            return;
        }

        element.classList.add('active');
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialX = element.offsetLeft;
        initialY = element.offsetTop;

        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();

        let dx = e.clientX - startX;
        let dy = e.clientY - startY;

        let newX = initialX + dx;
        let newY = initialY + dy;

        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX + element.offsetWidth > container.offsetWidth) newX = container.offsetWidth - element.offsetWidth;
        if (newY + element.offsetHeight > container.offsetHeight) newY = container.offsetHeight - element.offsetHeight;

        element.style.left = newX + 'px';
        element.style.top = newY + 'px';
    }

    function dragEnd() {
        isDragging = false;
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', dragEnd);
    }
}

function makeResizable(wrapper, img, resizer) {
    let isResizing = false;
    let startY, startHeight;

    resizer.addEventListener('mousedown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        startY = e.clientY;
        startHeight = img.getBoundingClientRect().height;

        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
    });

    function resize(e) {
        if (!isResizing) return;
        const dy = e.clientY - startY;
        const newHeight = Math.max(20, startHeight + dy);
        img.style.height = newHeight + 'px';
    }

    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
    }
}

// Signature Pad Logic
const signatureModal = document.getElementById('signatureModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const clearSignatureBtn = document.getElementById('clearSignatureBtn');
const insertSignatureBtn = document.getElementById('insertSignatureBtn');
const signatureCanvas = document.getElementById('signatureCanvas');
const ctx = signatureCanvas.getContext('2d');
let drawing = false;

addSignatureBtn.addEventListener('click', () => {
    signatureModal.classList.remove('hidden');
    clearCanvas();
});

closeModalBtn.addEventListener('click', () => {
    signatureModal.classList.add('hidden');
});

clearSignatureBtn.addEventListener('click', clearCanvas);

insertSignatureBtn.addEventListener('click', () => {
    if (isCanvasBlank(signatureCanvas)) {
        alert("Please draw a signature first.");
        return;
    }
    const dataURL = signatureCanvas.toDataURL('image/png');
    addSignatureToPage(dataURL);
    signatureModal.classList.add('hidden');
});

// Canvas drawing events
signatureCanvas.addEventListener('mousedown', startPosition);
signatureCanvas.addEventListener('mouseup', endPosition);
signatureCanvas.addEventListener('mouseout', endPosition);
signatureCanvas.addEventListener('mousemove', draw);

signatureCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    signatureCanvas.dispatchEvent(mouseEvent);
}, { passive: false });

signatureCanvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    signatureCanvas.dispatchEvent(mouseEvent);
}, { passive: false });

signatureCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    signatureCanvas.dispatchEvent(mouseEvent);
}, { passive: false });

function startPosition(e) {
    drawing = true;
    draw(e);
}

function endPosition() {
    drawing = false;
    ctx.beginPath();
}

function draw(e) {
    if (!drawing) return;

    const rect = signatureCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function clearCanvas() {
    ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
}

function isCanvasBlank(canvas) {
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
}

// Extract pure text ignoring the delete button
function extractTextSafely(element) {
    let text = '';
    for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent;
        } else if (node.nodeName === 'DIV' || node.nodeName === 'BR') {
            if (node.classList && node.classList.contains('text-delete-btn')) continue;
            // A new div or br usually means a new line in contenteditable
            text += '\n' + extractTextSafely(node);
        }
    }
    return text.replace(/\n{2,}/g, '\n'); // simple cleanup
}

// Saving using pdf-lib
saveBtn.addEventListener('click', async () => {
    if (!currentPdfFile) return;
    saveBtn.innerText = 'Saving...';
    saveBtn.disabled = true;

    try {
        const freshBuffer = await currentPdfFile.arrayBuffer();
        const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
        const pdfDoc = await PDFDocument.load(freshBuffer, {
            ignoreEncryption: true
        });

        // Helvetica is default for standard text
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        // ZapfDingbats supports standard symbols (Checks, X's)
        const dingbatsFont = await pdfDoc.embedFont(StandardFonts.ZapfDingbats);

        const pages = pdfDoc.getPages();

        // ... rest of saving code to remain unchanged except what is above


        const wrappers = document.querySelectorAll('.pdf-page-wrapper');

        for (let i = 0; i < wrappers.length; i++) {
            const wrapper = wrappers[i];
            const pageNum = parseInt(wrapper.dataset.pageNumber, 10);
            const pdfPage = pages[pageNum - 1]; // 0-indexed

            const pData = pagesData.find(p => p.pageNumber === pageNum);
            if (!pData) continue;

            const containerWidth = pData.width;
            const containerHeight = pData.height;
            const pdfOriginalWidth = pData.originalWidth;
            const pdfOriginalHeight = pData.originalHeight;

            // Process Texts
            const texts = wrapper.querySelectorAll('.draggable-text');
            texts.forEach(wrapperEl => {
                const textContentEl = wrapperEl.querySelector('.text-content');
                if (!textContentEl) return;

                const textContent = extractTextSafely(wrapperEl).trim();
                if (!textContent || textContent === 'Double-click to edit') return;

                const left = parseFloat(wrapperEl.style.left) || 0;
                const top = parseFloat(wrapperEl.style.top) || 0;

                // HTML mapped top to PDF (PDF y=0 is bottom)
                const pdfY_top = ((containerHeight - top) / containerHeight) * pdfOriginalHeight;
                const pdfX = (left / containerWidth) * pdfOriginalWidth;

                // Extract custom font size if present
                let fontSize = 14; // Default
                if (textContentEl.style.fontSize) {
                    fontSize = parseInt(textContentEl.style.fontSize);
                }

                const pdfFontSize = (fontSize / pData.scale) * 1.25;
                const lineHeight = pdfFontSize * 1.2;

                // Handle special symbols that crash standard Helvetica
                let fontToUse = helveticaFont;
                let textToDraw = textContent;

                // Use ZapfDingbats which natively supports these Unicode symbols in pdf-lib
                if (textContent === '✔' || textContent === '✘' || textContent === '●') {
                    fontToUse = dingbatsFont;
                }

                pdfPage.drawText(textToDraw, {
                    x: pdfX + 2, // Slight padding adjustment
                    y: pdfY_top - pdfFontSize, // Align top baseline
                    size: pdfFontSize,
                    lineHeight: lineHeight,
                    font: fontToUse,
                    color: (() => {
                        const elColor = textContentEl.style.color;
                        if (elColor) {
                            // Parse hex colors like #D32F2F
                            const hexMatch = elColor.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
                            if (hexMatch) {
                                return rgb(
                                    parseInt(hexMatch[1], 16) / 255,
                                    parseInt(hexMatch[2], 16) / 255,
                                    parseInt(hexMatch[3], 16) / 255
                                );
                            }
                            // Parse rgb() colors
                            const rgbMatch = elColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                            if (rgbMatch) {
                                return rgb(
                                    parseInt(rgbMatch[1]) / 255,
                                    parseInt(rgbMatch[2]) / 255,
                                    parseInt(rgbMatch[3]) / 255
                                );
                            }
                        }
                        return rgb(0, 0, 0);
                    })(),
                });
            });

            // Process Signatures
            const signatures = wrapper.querySelectorAll('.draggable-signature');
            for (let j = 0; j < signatures.length; j++) {
                const sig = signatures[j];
                const imgEl = sig.querySelector('img');
                const imgDataUrl = imgEl.src;

                const imgBytes = await fetch(imgDataUrl).then(res => res.arrayBuffer());
                const pdfImage = await pdfDoc.embedPng(imgBytes);

                const left = parseFloat(sig.style.left) || 0;
                const top = parseFloat(sig.style.top) || 0;
                const sigWidth = sig.offsetWidth;
                const sigHeight = sig.offsetHeight;

                // For images we need the bottom coordinate
                const bottom = containerHeight - (top + sigHeight);

                const pdfX = (left / containerWidth) * pdfOriginalWidth;
                const pdfY = (bottom / containerHeight) * pdfOriginalHeight;
                const pdfW = (sigWidth / containerWidth) * pdfOriginalWidth;
                const pdfH = (sigHeight / containerHeight) * pdfOriginalHeight;

                pdfPage.drawImage(pdfImage, {
                    x: pdfX,
                    y: pdfY,
                    width: pdfW,
                    height: pdfH
                });
            }
        }

        // Flatten any existing interactive form fields so they don't block the user's overlaid text
        try {
            const form = pdfDoc.getForm();
            if (form) {
                form.flatten();
            }
        } catch (err) {
            console.warn("No form to flatten or flattening failed:", err);
        }

        const pdfBytes = await pdfDoc.save();
        download(pdfBytes, "filled_document.pdf", "application/pdf");

    } catch (e) {
        console.error(e);
        alert('An error occurred while saving the PDF.');
    } finally {
        saveBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Save';
        saveBtn.disabled = false;
    }
});

function download(data, filename, type) {
    const blob = new Blob([data], { type: type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
