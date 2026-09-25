/* e-Cyber Cafe Automation Suite - Voter ID & Extensible Govt Document Studio */

const voterState = {
  cards: [], // Array of { id, name, cardType, frontImgData, backImgData, copies: 1, brightness: 100, contrast: 100, sharpBorder: true }
  pendingPdfFile: null,
  activeCroppingCardId: null,
  activeCroppingSide: 'front', // 'front' or 'back'
  customPresets: [], // Saved custom card types in localStorage
  defaultPresets: [
    { id: 'standard-cyber', name: 'Standard Cyber Cafe (85x60mm)', widthMm: 85, heightMm: 60, icon: 'fa-id-card' },
    { id: 'pouch-87x60', name: 'Lamination Pouch (87x60mm)', widthMm: 87, heightMm: 60, icon: 'fa-id-card' },
    { id: 'voter-epic', name: 'Voter ID (EPIC Card)', widthMm: 85.6, heightMm: 54, icon: 'fa-address-card' },
    { id: 'pan-card', name: 'PAN Card Format', widthMm: 85.6, heightMm: 54, icon: 'fa-credit-card' },
    { id: 'dl-card', name: 'Driving License (DL)', widthMm: 85.6, heightMm: 54, icon: 'fa-id-badge' },
    { id: 'ayushman-card', name: 'Ayushman / PMJAY Card', widthMm: 85.6, heightMm: 54, icon: 'fa-notes-medical' },
    { id: 'eshram-card', name: 'E-Shram Card', widthMm: 85.6, heightMm: 54, icon: 'fa-user-shield' }
  ]
};

document.addEventListener('DOMContentLoaded', () => {
  loadVoterCustomPresets();

  const fileInput = document.getElementById('voter-file-input');
  const presetSelect = document.getElementById('voter-card-preset');
  const sizeSelect = document.getElementById('voter-card-size');
  const layoutSelect = document.getElementById('voter-layout-type');
  const borderCheckbox = document.getElementById('voter-show-border');
  const cutLinesCheckbox = document.getElementById('voter-cut-lines');
  const printBtn = document.getElementById('btn-print-voter');

  // Tuning Sliders & Filters
  const brightnessSlider = document.getElementById('voter-brightness');
  const contrastSlider = document.getElementById('voter-contrast');
  const btnResetTuning = document.getElementById('btn-reset-voter-tuning');

  // Custom Preset Modal Controls
  const btnAddCustomPreset = document.getElementById('btn-add-custom-preset');
  const modalSavePresetBtn = document.getElementById('btn-save-custom-preset');
  const modalCancelPresetBtn = document.getElementById('btn-cancel-custom-preset');

  if (fileInput) fileInput.addEventListener('change', handleVoterFileUpload);

  [presetSelect, sizeSelect, layoutSelect, borderCheckbox, cutLinesCheckbox].forEach(ctrl => {
    if (ctrl) ctrl.addEventListener('change', renderVoterGrid);
  });

  if (brightnessSlider) {
    brightnessSlider.addEventListener('input', (e) => {
      document.getElementById('val-voter-brightness').innerText = `${e.target.value}%`;
      updateVoterCardTuning();
    });
  }

  if (contrastSlider) {
    contrastSlider.addEventListener('input', (e) => {
      document.getElementById('val-voter-contrast').innerText = `${e.target.value}%`;
      updateVoterCardTuning();
    });
  }

  if (btnResetTuning) {
    btnResetTuning.addEventListener('click', () => {
      if (brightnessSlider) brightnessSlider.value = 100;
      if (contrastSlider) contrastSlider.value = 100;
      document.getElementById('val-voter-brightness').innerText = '100%';
      document.getElementById('val-voter-contrast').innerText = '100%';
      updateVoterCardTuning();
    });
  }

  if (printBtn) printBtn.addEventListener('click', triggerPrint);

  // Crop Modal Buttons
  const cropCancelBtn = document.getElementById('btn-cancel-crop');
  const cropConfirmBtn = document.getElementById('btn-save-crop');

  if (cropConfirmBtn) {
    cropConfirmBtn.addEventListener('click', () => {
      if (voterState.cropperInstance && voterState.activeCroppingCardId) {
        saveVoterCropResult();
      }
    });
  }

  if (cropCancelBtn) {
    cropCancelBtn.addEventListener('click', () => {
      if (voterState.cropperInstance && voterState.activeCroppingCardId) {
        closeVoterCropModal();
      }
    });
  }

  // Custom Preset Modal Triggers
  if (btnAddCustomPreset) {
    btnAddCustomPreset.addEventListener('click', () => {
      document.getElementById('custom-preset-modal').classList.add('active');
    });
  }

  if (modalCancelPresetBtn) {
    modalCancelPresetBtn.addEventListener('click', () => {
      document.getElementById('custom-preset-modal').classList.remove('active');
    });
  }

  if (modalSavePresetBtn) {
    modalSavePresetBtn.addEventListener('click', saveNewCustomPreset);
  }
});

// Load Custom Card Presets from localStorage
function loadVoterCustomPresets() {
  try {
    const saved = localStorage.getItem('ecyber_custom_card_presets');
    if (saved) {
      voterState.customPresets = JSON.parse(saved);
      updatePresetDropdown();
    }
  } catch (err) {
    console.error('Failed to load custom card presets:', err);
  }
}

// Update Preset Dropdown with defaults + custom types
function updatePresetDropdown() {
  const select = document.getElementById('voter-card-preset');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '';

  // Default Presets Group
  const optGroupDefault = document.createElement('optgroup');
  optGroupDefault.label = 'Standard Government Cards';
  voterState.defaultPresets.forEach(preset => {
    const opt = document.createElement('option');
    opt.value = preset.id;
    opt.innerText = preset.name;
    optGroupDefault.appendChild(opt);
  });
  select.appendChild(optGroupDefault);

  // Custom Presets Group
  if (voterState.customPresets.length > 0) {
    const optGroupCustom = document.createElement('optgroup');
    optGroupCustom.label = 'Custom Added Formats';
    voterState.customPresets.forEach(preset => {
      const opt = document.createElement('option');
      opt.value = preset.id;
      opt.innerText = `${preset.name} (${preset.widthMm}x${preset.heightMm}mm)`;
      optGroupCustom.appendChild(opt);
    });
    select.appendChild(optGroupCustom);
  }

  if (currentVal) select.value = currentVal;
}

// Handle File Uploads (Supports PDF and Image formats)
async function handleVoterFileUpload(e) {
  const files = Array.from(e.target.files);
  if (!files || files.length === 0) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.type === 'application/pdf') {
      await processVoterPDF(file);
    } else if (file.type.startsWith('image/')) {
      const dataUrl = await fileToDataURL(file);
      await processVoterImage(dataUrl, file.name);
    }
  }

  showVoterControls();
  renderVoterCardsList();
  renderVoterGrid();
}

// Process Scanned Voter Card Image
function processVoterImage(dataUrl, fileName) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const crops = autoCropVoterFrontBack(canvas);
      const presetSelect = document.getElementById('voter-card-preset');

      voterState.cards.push({
        id: 'voter_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: `Voter Card #${voterState.cards.length + 1} (${fileName})`,
        cardType: presetSelect ? presetSelect.value : 'voter-epic',
        fullSourceDataUrl: dataUrl,
        frontImgData: crops.front,
        backImgData: crops.back,
        copies: 1,
        brightness: 100,
        contrast: 100
      });

      resolve();
    };
    img.src = dataUrl;
  });
}

// Process e-Voter PDF File using PDF.js
async function processVoterPDF(file, password = '') {
  try {
    showToast(`Reading e-Voter PDF: ${file.name}...`, 'info');
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password
    });

    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const scale = 3.0;
    const viewport = page.getViewport({ scale: scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    const dataUrl = canvas.toDataURL('image/png');
    const crops = autoCropVoterFrontBack(canvas);
    const presetSelect = document.getElementById('voter-card-preset');

    voterState.cards.push({
      id: 'voter_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: `Voter Card #${voterState.cards.length + 1} (${file.name})`,
      cardType: presetSelect ? presetSelect.value : 'voter-epic',
      fullSourceDataUrl: dataUrl,
      frontImgData: crops.front,
      backImgData: crops.back,
      copies: 1,
      brightness: 100,
      contrast: 100
    });

    showToast('Voter ID extracted & ready for print!', 'success');
  } catch (err) {
    if (err.name === 'PasswordException') {
      voterState.pendingPdfFile = file;
      document.getElementById('pdf-password-modal').classList.add('active');
    } else {
      console.error('PDF Read Error:', err);
      showToast('Error processing Voter PDF. Try uploading as Image.', 'error');
    }
  }
}

// Auto Detect & Crop Front & Back for Voter Cards
function autoCropVoterFrontBack(canvas) {
  const w = canvas.width;
  const h = canvas.height;

  // Aspect ratio check
  if (w > h * 1.2) {
    // Landscape Page: Split left half and right half
    const halfW = Math.floor(w * 0.48);
    const cardH = Math.floor(h * 0.7);
    const topY = Math.floor(h * 0.15);

    const frontCanvas = document.createElement('canvas');
    frontCanvas.width = halfW;
    frontCanvas.height = cardH;
    frontCanvas.getContext('2d').drawImage(canvas, Math.floor(w * 0.02), topY, halfW, cardH, 0, 0, halfW, cardH);

    const backCanvas = document.createElement('canvas');
    backCanvas.width = halfW;
    backCanvas.height = cardH;
    backCanvas.getContext('2d').drawImage(canvas, Math.floor(w * 0.50), topY, halfW, cardH, 0, 0, halfW, cardH);

    return {
      front: frontCanvas.toDataURL('image/png'),
      back: backCanvas.toDataURL('image/png')
    };
  } else {
    // Portrait e-Voter Page: Extract lower bottom cards
    const cardW = Math.floor(w * 0.45);
    const cardH = Math.floor(h * 0.32);
    const bottomY = Math.floor(h * 0.65);

    const frontCanvas = document.createElement('canvas');
    frontCanvas.width = cardW;
    frontCanvas.height = cardH;
    frontCanvas.getContext('2d').drawImage(canvas, Math.floor(w * 0.04), bottomY, cardW, cardH, 0, 0, cardW, cardH);

    const backCanvas = document.createElement('canvas');
    backCanvas.width = cardW;
    backCanvas.height = cardH;
    backCanvas.getContext('2d').drawImage(canvas, Math.floor(w * 0.51), bottomY, cardW, cardH, 0, 0, cardW, cardH);

    return {
      front: frontCanvas.toDataURL('image/png'),
      back: backCanvas.toDataURL('image/png')
    };
  }
}

// Show Sidebar Control Panels
function showVoterControls() {
  const cardListSec = document.getElementById('voter-card-list-section');
  if (cardListSec) cardListSec.style.display = 'flex';
}

// Render List of Uploaded Voter Cards in Control Panel
function renderVoterCardsList() {
  const container = document.getElementById('voter-cards-container');
  const countBadge = document.getElementById('voter-card-count-badge');
  if (!container) return;

  container.innerHTML = '';
  if (countBadge) countBadge.innerText = voterState.cards.length;

  if (voterState.cards.length === 0) {
    document.getElementById('voter-card-list-section').style.display = 'none';
    return;
  }

  voterState.cards.forEach((card) => {
    const cardItem = document.createElement('div');
    cardItem.style.display = 'flex';
    cardItem.style.alignItems = 'center';
    cardItem.style.justifyContent = 'space-between';
    cardItem.style.background = 'rgba(15, 23, 42, 0.6)';
    cardItem.style.padding = '0.5rem 0.75rem';
    cardItem.style.borderRadius = '6px';
    cardItem.style.border = '1px solid var(--border-color)';

    cardItem.innerHTML = `
      <div style="display:flex; flex-direction:column; overflow:hidden;">
        <span style="font-weight:600; font-size:0.82rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:160px; color:var(--text-main);">
          ${card.name}
        </span>
        <span style="font-size:0.72rem; color:var(--text-muted);">Front & Back Extracted</span>
      </div>

      <div style="display:flex; align-items:center; gap:0.4rem;">
        <button class="btn-secondary" onclick="openVoterCropModal('${card.id}', 'front')" title="Re-crop Front" style="padding:0.25rem 0.4rem; font-size:0.7rem;">
          <i class="fa-solid fa-crop"></i> Front
        </button>
        <button class="btn-secondary" onclick="openVoterCropModal('${card.id}', 'back')" title="Re-crop Back" style="padding:0.25rem 0.4rem; font-size:0.7rem;">
          <i class="fa-solid fa-crop"></i> Back
        </button>
        <button class="btn-secondary" onclick="removeVoterCard('${card.id}')" title="Delete" style="padding:0.25rem 0.4rem; font-size:0.7rem; color:var(--accent-rose);">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;

    container.appendChild(cardItem);
  });
}

// Remove Voter Card Item
function removeVoterCard(id) {
  voterState.cards = voterState.cards.filter(c => c.id !== id);
  renderVoterCardsList();
  renderVoterGrid();
  showToast('Card removed from list', 'info');
}

// Interactive Crop Modal Handler
function openVoterCropModal(cardId, side) {
  const card = voterState.cards.find(c => c.id === cardId);
  if (!card) return;

  voterState.activeCroppingCardId = cardId;
  voterState.activeCroppingSide = side;

  const modal = document.getElementById('crop-modal');
  const cropImg = document.getElementById('crop-modal-img');
  const modalTitle = document.getElementById('crop-modal-title');

  if (!modal || !cropImg) return;

  modalTitle.innerHTML = `<i class="fa-solid fa-crop"></i> Adjust Crop for ${card.name} (${side.toUpperCase()})`;
  
  // Use full source image if available, else side image
  cropImg.src = card.fullSourceDataUrl || (side === 'front' ? card.frontImgData : card.backImgData);

  modal.classList.add('active');

  if (voterState.cropperInstance) {
    voterState.cropperInstance.destroy();
    voterState.cropperInstance = null;
  }

  const sizeType = document.getElementById('voter-card-size')?.value || '85x60';
  let cropAspect = 85 / 60; // 85mm x 60mm Standard Cyber Cafe
  if (sizeType === '87x60') {
    cropAspect = 87 / 60;
  } else if (sizeType === 'standard') {
    cropAspect = 85.6 / 54;
  } else if (sizeType === '80x54') {
    cropAspect = 80 / 54;
  } else if (sizeType === 'small') {
    cropAspect = 72 / 48;
  }

  setTimeout(() => {
    voterState.cropperInstance = new Cropper(cropImg, {
      aspectRatio: cropAspect,
      viewMode: 1,
      autoCropArea: 0.85
    });
  }, 150);
}

function closeVoterCropModal() {
  const modal = document.getElementById('crop-modal');
  if (modal) modal.classList.remove('active');

  if (voterState.cropperInstance) {
    voterState.cropperInstance.destroy();
    voterState.cropperInstance = null;
  }
  voterState.activeCroppingCardId = null;
}

function saveVoterCropResult() {
  if (!voterState.cropperInstance || !voterState.activeCroppingCardId) return;

  const sizeType = document.getElementById('voter-card-size')?.value || '85x60';
  let targetW = 1020, targetH = 720; // 85mm x 60mm HD resolution
  if (sizeType === '87x60') {
    targetW = 1044; targetH = 720; // 87mm x 60mm HD
  } else if (sizeType === 'standard') {
    targetW = 1027; targetH = 648;
  } else if (sizeType === '80x54') {
    targetW = 960; targetH = 648;
  } else if (sizeType === 'small') {
    targetW = 864; targetH = 576;
  }

  const canvas = voterState.cropperInstance.getCroppedCanvas({ width: targetW, height: targetH });
  if (canvas) {
    const croppedDataUrl = canvas.toDataURL('image/png');
    const card = voterState.cards.find(c => c.id === voterState.activeCroppingCardId);
    if (card) {
      if (voterState.activeCroppingSide === 'front') {
        card.frontImgData = croppedDataUrl;
      } else {
        card.backImgData = croppedDataUrl;
      }
    }
  }

  closeVoterCropModal();
  renderVoterGrid();
  showToast('Voter card side crop updated successfully!', 'success');
}

// Apply Card Filter Tuning (Brightness & Contrast)
function updateVoterCardTuning() {
  const b = document.getElementById('voter-brightness').value;
  const c = document.getElementById('voter-contrast').value;

  voterState.cards.forEach(card => {
    card.brightness = b;
    card.contrast = c;
  });

  renderVoterGrid();
}

// Render A4 Paper Grid for Printing
function renderVoterGrid() {
  const grid = document.getElementById('voter-card-grid');
  if (!grid) return;

  grid.innerHTML = '';

  if (voterState.cards.length === 0) {
    grid.innerHTML = `
      <div style="width:100%; text-align:center; color:#94a3b8; margin-top:200px;">
        <i class="fa-solid fa-address-card" style="font-size:3.5rem; color:#cbd5e1; margin-bottom:1rem;"></i>
        <p style="font-size:1.1rem; font-weight:600; color:#475569;">No Voter Cards / IDs Loaded</p>
        <p style="font-size:0.85rem; color:#94a3b8; margin-top:0.25rem;">Upload e-Voter PDF or scanned front/back images on the left panel to auto-generate sheet.</p>
      </div>
    `;
    return;
  }

  const sizeType = document.getElementById('voter-card-size')?.value || '85x60'; // '85x60', 'standard', '80x54', 'small'
  const layoutType = document.getElementById('voter-layout-type')?.value || 'side-by-side'; // 'side-by-side', 'stacked'
  const showBorder = document.getElementById('voter-show-border')?.checked ?? true;
  const cutLines = document.getElementById('voter-cut-lines')?.checked ?? true;

  // Update preview toolbar size indicator badge
  const sizeBadge = document.getElementById('voter-size-badge');
  if (sizeBadge) {
    const sizeSelect = document.getElementById('voter-card-size');
    const selectedText = sizeSelect && sizeSelect.options[sizeSelect.selectedIndex] ? sizeSelect.options[sizeSelect.selectedIndex].text : 'Standard Cyber Cafe (85mm x 60mm)';
    sizeBadge.innerHTML = `<i class="fa-solid fa-ruler"></i> ${selectedText}`;
  }

  // Calculate width & height for card preset (85mm x 60mm Standard Cyber Cafe default)
  let cardWidth = '85mm';  // 85mm x 60mm Standard Cyber Cafe
  let cardHeight = '60mm';

  if (sizeType === '85x60') {
    cardWidth = '85mm';
    cardHeight = '60mm';
  } else if (sizeType === '87x60') {
    cardWidth = '87mm';
    cardHeight = '60mm';
  } else if (sizeType === 'standard') {
    cardWidth = '85.6mm';
    cardHeight = '54mm';
  } else if (sizeType === '80x54') {
    cardWidth = '80mm';
    cardHeight = '54mm';
  } else if (sizeType === 'small') {
    cardWidth = '72mm';
    cardHeight = '48mm';
  }

  voterState.cards.forEach(card => {
    for (let copy = 0; copy < card.copies; copy++) {
      const cardPairContainer = document.createElement('div');
      cardPairContainer.className = `voter-card-pair ${layoutType} ${cutLines ? 'cut-guides' : ''}`;
      cardPairContainer.style.display = 'inline-flex';
      cardPairContainer.style.flexDirection = layoutType === 'side-by-side' ? 'row' : 'column';
      cardPairContainer.style.gap = '6px';
      cardPairContainer.style.margin = '10px';
      cardPairContainer.style.padding = cutLines ? '4px' : '0';
      cardPairContainer.style.border = cutLines ? '1px dashed #cbd5e1' : 'none';
      cardPairContainer.style.position = 'relative';

      const filterCss = `brightness(${card.brightness}%) contrast(${card.contrast}%)`;

      // Front Image Element
      const frontBox = document.createElement('div');
      frontBox.className = `id-card-item ${showBorder ? 'with-border' : ''}`;
      frontBox.style.width = cardWidth;
      frontBox.style.height = cardHeight;
      frontBox.style.background = '#fff';
      frontBox.style.overflow = 'hidden';

      frontBox.innerHTML = `<img src="${card.frontImgData}" alt="Voter Front" style="width:100%; height:100%; object-fit:fill; filter:${filterCss};">`;

      // Back Image Element
      const backBox = document.createElement('div');
      backBox.className = `id-card-item ${showBorder ? 'with-border' : ''}`;
      backBox.style.width = cardWidth;
      backBox.style.height = cardHeight;
      backBox.style.background = '#fff';
      backBox.style.overflow = 'hidden';

      backBox.innerHTML = `<img src="${card.backImgData}" alt="Voter Back" style="width:100%; height:100%; object-fit:fill; filter:${filterCss};">`;

      cardPairContainer.appendChild(frontBox);
      cardPairContainer.appendChild(backBox);

      grid.appendChild(cardPairContainer);
    }
  });
}

// Save New Custom Preset Handler for Future Document Formats
function saveNewCustomPreset() {
  const nameInput = document.getElementById('custom-preset-name');
  const wInput = document.getElementById('custom-preset-width');
  const hInput = document.getElementById('custom-preset-height');

  const name = nameInput ? nameInput.value.trim() : '';
  const widthMm = wInput ? parseFloat(wInput.value) : 85;
  const heightMm = hInput ? parseFloat(hInput.value) : 60;

  if (!name || isNaN(widthMm) || isNaN(heightMm)) {
    showToast('Please fill in valid name and dimensions', 'warning');
    return;
  }

  const newPreset = {
    id: 'custom_' + Date.now(),
    name: name,
    widthMm: widthMm,
    heightMm: heightMm
  };

  voterState.customPresets.push(newPreset);
  try {
    localStorage.setItem('ecyber_custom_card_presets', JSON.stringify(voterState.customPresets));
  } catch (e) {
    console.error(e);
  }

  updatePresetDropdown();
  document.getElementById('custom-preset-modal').classList.remove('active');
  if (nameInput) nameInput.value = '';

  showToast(`Custom format "${name}" added successfully!`, 'success');
}
