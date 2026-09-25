/* e-Cyber Cafe Automation Suite - Aadhaar Multi-Person & Precision Auto-Crop Engine */

const aadhaarState = {
  cards: [], // Array of { id, name, fullSourceDataUrl, frontImgData, backImgData, copies: 1 }
  pendingPdfFile: null,
  activeCroppingCardId: null,
  activeCroppingSide: 'front', // 'front' or 'back'
  cropperInstance: null
};

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('aadhaar-file-input');
  const cardSizeSelect = document.getElementById('aadhaar-card-size');
  const layoutSelect = document.getElementById('aadhaar-layout-type');
  const borderCheckbox = document.getElementById('aadhaar-show-border');
  const cutLinesCheckbox = document.getElementById('aadhaar-cut-lines');
  const printBtn = document.getElementById('btn-print-aadhaar');

  // Password Modal Controls
  const pwdSubmitBtn = document.getElementById('btn-submit-pdf-pwd');
  const pwdCancelBtn = document.getElementById('btn-cancel-pdf-pwd');
  const pwdInput = document.getElementById('pdf-password-input');

  // Crop Modal Controls
  const cropCancelBtn = document.getElementById('btn-cancel-crop');
  const cropConfirmBtn = document.getElementById('btn-save-crop');

  if (fileInput) fileInput.addEventListener('change', handleAadhaarFileUpload);

  [cardSizeSelect, layoutSelect, borderCheckbox, cutLinesCheckbox].forEach(ctrl => {
    if (ctrl) ctrl.addEventListener('change', renderAadhaarGrid);
  });

  if (printBtn) printBtn.addEventListener('click', triggerPrint);

  if (pwdSubmitBtn) {
    pwdSubmitBtn.addEventListener('click', () => {
      const pwd = pwdInput.value.trim();
      if (pwd && aadhaarState.pendingPdfFile) {
        document.getElementById('pdf-password-modal').classList.remove('active');
        processAadhaarPDF(aadhaarState.pendingPdfFile, pwd);
      } else {
        showToast('Please enter password', 'warning');
      }
    });
  }

  if (pwdCancelBtn) {
    pwdCancelBtn.addEventListener('click', () => {
      document.getElementById('pdf-password-modal').classList.remove('active');
    });
  }

  if (cropCancelBtn) cropCancelBtn.addEventListener('click', closeCropModal);
  if (cropConfirmBtn) cropConfirmBtn.addEventListener('click', saveCropResult);
});

// Upload Handler for Multi-Card Support
async function handleAadhaarFileUpload(e) {
  const files = Array.from(e.target.files);
  if (!files || files.length === 0) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.type === 'application/pdf') {
      aadhaarState.pendingPdfFile = file;
      await processAadhaarPDF(file);
    } else if (file.type.startsWith('image/')) {
      const dataUrl = await fileToDataURL(file);
      await processAadhaarImage(dataUrl, file.name);
    }
  }

  showAadhaarControls();
  renderAadhaarCardsList();
  renderAadhaarGrid();
}

// Process Image file (Full page or Cutout)
function processAadhaarImage(dataUrl, fileName) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const crops = autoExtractFrontAndBack(canvas);

      aadhaarState.cards.push({
        id: 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: `Card #${aadhaarState.cards.length + 1} (${fileName})`,
        fullSourceDataUrl: dataUrl,
        frontImgData: crops.front,
        backImgData: crops.back,
        copies: 1
      });

      resolve();
    };
    img.src = dataUrl;
  });
}

// PDF Processor with Password Handling
async function processAadhaarPDF(file, password = '') {
  try {
    showToast(`Processing e-Aadhaar PDF: ${file.name}...`, 'info');
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
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    const fullSourceDataUrl = canvas.toDataURL('image/png');
    const crops = autoExtractFrontAndBack(canvas);

    aadhaarState.cards.push({
      id: 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: `Person #${aadhaarState.cards.length + 1} (e-Aadhaar)`,
      fullSourceDataUrl: fullSourceDataUrl,
      frontImgData: crops.front,
      backImgData: crops.back,
      copies: 1
    });

    showToast('Aadhaar added & precision auto-cropped!', 'success');
    showAadhaarControls();
    renderAadhaarCardsList();
    renderAadhaarGrid();

  } catch (err) {
    if (err.name === 'PasswordException') {
      document.getElementById('pdf-password-modal').classList.add('active');
      document.getElementById('pdf-password-input').focus();
    } else {
      showToast('Error reading PDF: ' + err.message, 'error');
    }
  }
}

// Precision Auto Crop: Detects standard Indian e-Aadhaar PDF bottom wallet card boundaries
function autoExtractFrontAndBack(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const aspectRatio = w / h;

  let fx, fy, fw, fh;
  let bx, by, bw, bh;

  if (aspectRatio > 1.25) {
    // Pre-cut horizontal cutout image (Front & Back side-by-side)
    fx = Math.floor(w * 0.01);
    fy = Math.floor(h * 0.02);
    fw = Math.floor(w * 0.485);
    fh = Math.floor(h * 0.96);

    bx = Math.floor(w * 0.505);
    by = Math.floor(h * 0.02);
    bw = Math.floor(w * 0.485);
    bh = Math.floor(h * 0.96);
  } else {
    // Full Vertical A4 e-Aadhaar Page
    // Standard wallet cards are precisely located at Y: 71.8% to 97.6% of page height
    fx = Math.floor(w * 0.035);
    fy = Math.floor(h * 0.718);
    fw = Math.floor(w * 0.455);
    fh = Math.floor(h * 0.258);

    bx = Math.floor(w * 0.510);
    by = Math.floor(h * 0.718);
    bw = Math.floor(w * 0.455);
    bh = Math.floor(h * 0.258);
  }

  // Render Front Crop
  const frontCanvas = document.createElement('canvas');
  frontCanvas.width = fw;
  frontCanvas.height = fh;
  frontCanvas.getContext('2d').drawImage(canvas, fx, fy, fw, fh, 0, 0, fw, fh);

  // Render Back Crop
  const backCanvas = document.createElement('canvas');
  backCanvas.width = bw;
  backCanvas.height = bh;
  backCanvas.getContext('2d').drawImage(canvas, bx, by, bw, bh, 0, 0, bw, bh);

  return {
    front: frontCanvas.toDataURL('image/png'),
    back: backCanvas.toDataURL('image/png')
  };
}

function showAadhaarControls() {
  document.getElementById('aadhaar-controls').style.display = 'flex';
  document.getElementById('aadhaar-card-list-section').style.display = 'flex';
}

function renderAadhaarCardsList() {
  const container = document.getElementById('aadhaar-cards-container');
  const badge = document.getElementById('aadhaar-card-count-badge');
  if (!container) return;

  container.innerHTML = '';
  if (badge) badge.innerText = aadhaarState.cards.length;

  aadhaarState.cards.forEach((card) => {
    const item = document.createElement('div');
    item.style.background = 'rgba(15, 23, 42, 0.6)';
    item.style.border = '1px solid var(--border-color)';
    item.style.borderRadius = '6px';
    item.style.padding = '0.6rem 0.75rem';
    item.style.fontSize = '0.8rem';
    item.style.display = 'flex';
    item.style.flexDirection = 'column';
    item.style.gap = '0.4rem';

    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong style="color:var(--text-main); font-size:0.82rem;">${card.name}</strong>
        <button class="btn-secondary" onclick="deleteAadhaarCard('${card.id}')" style="padding:0.2rem 0.4rem; color:var(--accent-rose);">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
      <div style="display:flex; gap:0.4rem; align-items:center;">
        <button class="btn-secondary" onclick="openAadhaarCrop('${card.id}', 'front')" style="flex:1; padding:0.25rem 0.4rem; font-size:0.75rem;">
          <i class="fa-solid fa-crop"></i> Re-Crop Front
        </button>
        <button class="btn-secondary" onclick="openAadhaarCrop('${card.id}', 'back')" style="flex:1; padding:0.25rem 0.4rem; font-size:0.75rem;">
          <i class="fa-solid fa-crop"></i> Re-Crop Back
        </button>
        <div style="display:flex; align-items:center; gap:0.2rem;">
          <label style="font-size:0.75rem;">Qty:</label>
          <input type="number" min="1" max="10" value="${card.copies}" onchange="updateCardCopies('${card.id}', this.value)" style="width:40px; background:rgba(0,0,0,0.5); border:1px solid var(--border-color); color:#fff; border-radius:4px; padding:2px 4px; text-align:center;">
        </div>
      </div>
    `;
    container.appendChild(item);
  });
}

function updateCardCopies(cardId, val) {
  const card = aadhaarState.cards.find(c => c.id === cardId);
  if (card) {
    card.copies = parseInt(val, 10) || 1;
    renderAadhaarGrid();
  }
}

function deleteAadhaarCard(cardId) {
  aadhaarState.cards = aadhaarState.cards.filter(c => c.id !== cardId);
  renderAadhaarCardsList();
  renderAadhaarGrid();
  showToast('Card removed from sheet', 'info');
}

function renderAadhaarGrid() {
  const gridContainer = document.getElementById('aadhaar-card-grid');
  if (!gridContainer) return;

  if (aadhaarState.cards.length === 0) {
    gridContainer.innerHTML = `
      <div style="width:100%; text-align:center; color:#94a3b8; margin-top:200px;">
        <i class="fa-solid fa-id-card" style="font-size:3.5rem; color:#cbd5e1; margin-bottom:1rem;"></i>
        <p style="font-size:1.1rem; font-weight:600; color:#475569;">No e-Aadhaar Loaded Yet</p>
        <p style="font-size:0.85rem; color:#94a3b8; margin-top:0.25rem;">Upload your e-Aadhaar PDF or scanned card images on the left panel to auto-generate print layout.</p>
      </div>
    `;
    return;
  }

  const cardSizePreset = document.getElementById('aadhaar-card-size').value;
  const layout = document.getElementById('aadhaar-layout-type').value;
  const showBorder = document.getElementById('aadhaar-show-border').checked;
  const cutLines = document.getElementById('aadhaar-cut-lines').checked;

  gridContainer.innerHTML = '';
  gridContainer.style.display = 'flex';
  gridContainer.style.flexDirection = 'column';
  gridContainer.style.gap = '4px';
  const borderClass = showBorder ? 'with-border' : '';

  // Update preview toolbar size indicator badge
  const sizeBadge = document.getElementById('aadhaar-size-badge');
  if (sizeBadge) {
    const sizeSelect = document.getElementById('aadhaar-card-size');
    const selectedText = sizeSelect && sizeSelect.options[sizeSelect.selectedIndex] ? sizeSelect.options[sizeSelect.selectedIndex].text : 'Standard Cyber Cafe (85mm x 60mm)';
    sizeBadge.innerHTML = `<i class="fa-solid fa-ruler"></i> ${selectedText}`;
  }

  // Determine card dimensions based on size preset (85mm x 60mm standard cyber cafe)
  let cardWidth = '85mm';  // 85mm x 60mm Standard Cyber Cafe
  let cardHeight = '60mm';

  if (cardSizePreset === '85x60') {
    cardWidth = '85mm';
    cardHeight = '60mm';
  } else if (cardSizePreset === 'standard') {
    cardWidth = '85.6mm'; // 85.6mm x 54mm Full Wallet
    cardHeight = '54mm';
  } else if (cardSizePreset === 'small') {
    cardWidth = '72mm';   // 72mm x 48mm Compact
    cardHeight = '48mm';
  } else if (cardSizePreset === '80x54') {
    cardWidth = '80mm';   // 80mm x 54mm Classic Mini
    cardHeight = '54mm';
  }

  aadhaarState.cards.forEach((card) => {
    for (let c = 0; c < card.copies; c++) {
      const cardSetBox = document.createElement('div');
      cardSetBox.style.display = 'flex';
      cardSetBox.style.gap = '4px'; // Reduced tight gap between Front & Back card
      cardSetBox.style.marginBottom = '4px'; // Reduced tight gap between Card 1 & Card 2
      cardSetBox.style.flexDirection = layout === 'stacked' ? 'column' : 'row';

      // Front Card Box
      const frontItem = document.createElement('div');
      frontItem.className = `id-card-item ${borderClass}`;
      frontItem.style.width = cardWidth;
      frontItem.style.height = cardHeight;
      if (cutLines) frontItem.style.borderStyle = 'dashed';
      frontItem.innerHTML = `<img src="${card.frontImgData}" alt="Aadhaar Front">`;

      // Back Card Box
      const backItem = document.createElement('div');
      backItem.className = `id-card-item ${borderClass}`;
      backItem.style.width = cardWidth;
      backItem.style.height = cardHeight;
      if (cutLines) backItem.style.borderStyle = 'dashed';
      backItem.innerHTML = `<img src="${card.backImgData}" alt="Aadhaar Back">`;

      cardSetBox.appendChild(frontItem);
      cardSetBox.appendChild(backItem);

      gridContainer.appendChild(cardSetBox);
    }
  });
}

// Manual Cropper opens on FULL SOURCE image pre-aligned to bottom card area
function openAadhaarCrop(cardId, side) {
  aadhaarState.activeCroppingCardId = cardId;
  aadhaarState.activeCroppingSide = side;

  const card = aadhaarState.cards.find(c => c.id === cardId);
  if (!card) return;

  const modalImg = document.getElementById('crop-modal-img');
  const title = document.getElementById('crop-modal-title');
  title.innerText = `Re-Crop ${card.name} - Select ${side.toUpperCase()} Side Area`;
  modalImg.src = card.fullSourceDataUrl || card.frontImgData;

  const modal = document.getElementById('crop-modal');
  modal.classList.add('active');

  if (aadhaarState.cropperInstance) aadhaarState.cropperInstance.destroy();

  const cardSizePreset = document.getElementById('aadhaar-card-size')?.value || '85x60';
  let aspect = 85 / 60; // 85mm x 60mm Cyber Cafe Standard
  if (cardSizePreset === 'standard') {
    aspect = 85.6 / 54;
  } else if (cardSizePreset === '80x54') {
    aspect = 80 / 54;
  } else if (cardSizePreset === 'small') {
    aspect = 72 / 48;
  }

  setTimeout(() => {
    aadhaarState.cropperInstance = new Cropper(modalImg, {
      aspectRatio: aspect,
      viewMode: 1,
      autoCropArea: 0.4
    });
  }, 200);
}

function closeCropModal() {
  if (!aadhaarState.cropperInstance && !aadhaarState.activeCroppingCardId) return;
  document.getElementById('crop-modal').classList.remove('active');
  if (aadhaarState.cropperInstance) {
    aadhaarState.cropperInstance.destroy();
    aadhaarState.cropperInstance = null;
  }
  aadhaarState.activeCroppingCardId = null;
}

function saveCropResult() {
  if (!aadhaarState.cropperInstance || !aadhaarState.activeCroppingCardId) return;

  const cardSizePreset = document.getElementById('aadhaar-card-size')?.value || '85x60';
  let targetW = 1020, targetH = 720; // 85mm x 60mm HD resolution
  if (cardSizePreset === 'standard') {
    targetW = 1027; targetH = 648;
  } else if (cardSizePreset === '80x54') {
    targetW = 960; targetH = 648;
  } else if (cardSizePreset === 'small') {
    targetW = 864; targetH = 576;
  }

  const canvas = aadhaarState.cropperInstance.getCroppedCanvas({ width: targetW, height: targetH });
  const croppedDataUrl = canvas.toDataURL('image/png');

  const card = aadhaarState.cards.find(c => c.id === aadhaarState.activeCroppingCardId);
  if (card) {
    if (aadhaarState.activeCroppingSide === 'front') {
      card.frontImgData = croppedDataUrl;
    } else {
      card.backImgData = croppedDataUrl;
    }
  }

  closeCropModal();
  renderAadhaarGrid();
  showToast('Card side crop updated!', 'success');
}
