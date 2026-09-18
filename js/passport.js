/* e-Cyber Cafe Automation Suite - Passport Studio Full AI Background Replacer */

// ============================================================================
// 🔑 REMOVE.BG API KEY CONFIGURATION
// Replace 'YOUR_REMOVE_BG_API_KEY_HERE' with your actual Remove.bg API key.
// ============================================================================
const REMOVE_BG_API_KEY = '7o4yMdmw9KX1s8bkqBKFMdhA';

const passportState = {
  candidates: [], // Array of { id, name, croppedCanvas, aiCutoutImage: null, processedDataUrl, photoCount: 6 }
  pendingFile: null,
  cropperInstance: null
};

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('passport-file-input');
  const photosPerRowSelect = document.getElementById('passport-photos-per-row');
  const paperPresetSelect = document.getElementById('passport-paper-preset');
  const bgColorInput = document.getElementById('passport-bg-color');
  const bgReplaceToggle = document.getElementById('passport-bg-replace-toggle');
  const aiRemoveBgBtn = document.getElementById('btn-ai-remove-bg');

  const sliderBrightness = document.getElementById('passport-brightness');
  const sliderContrast = document.getElementById('passport-contrast');
  const valBrightness = document.getElementById('val-brightness');
  const valContrast = document.getElementById('val-contrast');
  const cutGuidesCheckbox = document.getElementById('passport-cut-guides');
  const printBtn = document.getElementById('btn-print-passport');

  if (fileInput) fileInput.addEventListener('change', handlePassportFileUpload);

  [photosPerRowSelect, paperPresetSelect, cutGuidesCheckbox].forEach(ctrl => {
    if (ctrl) ctrl.addEventListener('change', renderPassportSheet);
  });

  if (bgColorInput) {
    bgColorInput.addEventListener('input', () => {
      passportState.candidates.forEach(cand => {
        applyBgAndAdjustments(cand);
      });
      renderPassportSheet();
    });
  }
  if (bgReplaceToggle) bgReplaceToggle.addEventListener('change', applyPhotoAdjustmentsAll);

  if (aiRemoveBgBtn) {
    aiRemoveBgBtn.addEventListener('click', () => {
      passportState.candidates.forEach(cand => performAiRemoveBgForCand(cand));
    });
  }

  // Bind Swatches Click Events
  document.querySelectorAll('.color-swatch-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const color = btn.getAttribute('data-color');
      if (color && bgColorInput) {
        bgColorInput.value = color;
        applyPhotoAdjustmentsAll();
      }
    });
  });

  if (sliderBrightness) {
    sliderBrightness.addEventListener('input', (e) => {
      valBrightness.innerText = `${e.target.value}%`;
      applyPhotoAdjustmentsAll();
    });
  }

  if (sliderContrast) {
    sliderContrast.addEventListener('input', (e) => {
      valContrast.innerText = `${e.target.value}%`;
      applyPhotoAdjustmentsAll();
    });
  }

  if (printBtn) printBtn.addEventListener('click', triggerPrint);
});

async function handlePassportFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const dataUrl = await fileToDataURL(file);
  const candId = 'cand_' + Date.now();
  const candName = `Person #${passportState.candidates.length + 1} (${file.name})`;

  passportState.pendingFile = { id: candId, name: candName, rawDataUrl: dataUrl };
  openPassportCropperModal();
}

function openPassportCropperModal() {
  if (!passportState.pendingFile) return;

  const modalImg = document.getElementById('crop-modal-img');
  const title = document.getElementById('crop-modal-title');
  title.innerText = `Crop Photo - ${passportState.pendingFile.name}`;
  modalImg.src = passportState.pendingFile.rawDataUrl;

  const modal = document.getElementById('crop-modal');
  modal.classList.add('active');

  if (passportState.cropperInstance) passportState.cropperInstance.destroy();

  setTimeout(() => {
    passportState.cropperInstance = new Cropper(modalImg, {
      aspectRatio: 3.5 / 4.5,
      viewMode: 1,
      autoCropArea: 0.85
    });
  }, 200);

  const saveBtn = document.getElementById('btn-save-crop');
  const onSave = async () => {
    if (!passportState.cropperInstance || !passportState.pendingFile) return;

    const croppedCanvas = passportState.cropperInstance.getCroppedCanvas({
      width: 413,
      height: 531
    });

    const perRow = parseInt(document.getElementById('passport-photos-per-row').value, 10) || 6;

    const newCand = {
      id: passportState.pendingFile.id,
      name: passportState.pendingFile.name,
      croppedCanvas: croppedCanvas,
      aiCutoutImage: null,
      processedDataUrl: null,
      photoCount: perRow
    };

    passportState.candidates.push(newCand);
    passportState.pendingFile = null;
    closeCropModal();

    // Auto-Trigger AI HD Remove.bg Background Removal
    showToast('Auto-removing photo background via AI...', 'info');
    await performAiRemoveBgForCand(newCand);

    saveBtn.removeEventListener('click', onSave);
  };

  saveBtn.onclick = onSave;
}

// Perform AI Background Removal automatically for candidate
async function performAiRemoveBgForCand(cand) {
  if (!cand || !cand.croppedCanvas) return;

  // Check if user has inserted their Remove.bg API key
  if (!REMOVE_BG_API_KEY || REMOVE_BG_API_KEY === 'YOUR_REMOVE_BG_API_KEY_HERE') {
    showToast('Remove.bg API key not configured in js/passport.js. Using Smart Canvas color swap.', 'warning');
    applyPhotoAdjustmentsAll();
    return;
  }

  try {
    showToast(`Auto-removing background for ${cand.name}...`, 'info');

    const base64Data = cand.croppedCanvas.toDataURL('image/png').split(',')[1];
    const formData = new FormData();
    formData.append('image_file_b64', base64Data);
    formData.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVE_BG_API_KEY.trim()
      },
      body: formData
    });

    if (!response.ok) {
      let errMsg = `Remove.bg HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.errors && errJson.errors[0]) {
          errMsg = errJson.errors[0].title;
        }
      } catch (e) { }
      throw new Error(errMsg);
    }

    const imgBlob = await response.blob();
    const transparentDataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(imgBlob);
    });

    const aiImg = new Image();
    await new Promise((resolve, reject) => {
      aiImg.onload = resolve;
      aiImg.onerror = reject;
      aiImg.src = transparentDataUrl;
    });

    cand.aiCutoutImage = aiImg;
    showToast(`Full background replaced for ${cand.name}!`, 'success');

  } catch (err) {
    console.error('AI BG Removal error:', err);
    showToast(`AI BG Removal note: ${err.message}. Using Canvas color replacement.`, 'warning');
  }

  applyPhotoAdjustmentsAll();
}

function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

// Render candidate photos with 100% full background replacement
function applyPhotoAdjustmentsAll() {
  const bgColorHex = document.getElementById('passport-bg-color').value;
  const bgReplace = document.getElementById('passport-bg-replace-toggle').checked;
  const brightness = document.getElementById('passport-brightness').value;
  const contrast = document.getElementById('passport-contrast').value;
  const targetRgb = hexToRgb(bgColorHex);

  passportState.candidates.forEach(cand => {
    if (!cand.croppedCanvas) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = cand.croppedCanvas.width;
    canvas.height = cand.croppedCanvas.height;

    // 1. Fill 100% Solid Passport Background Color across entire canvas
    ctx.fillStyle = bgColorHex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (cand.aiCutoutImage) {
      // 2. Draw HD Transparent AI Cutout over the full solid background
      ctx.drawImage(cand.aiCutoutImage, 0, 0, canvas.width, canvas.height);

    } else if (bgReplace) {
      // 3. Fallback Canvas Flood Color Swap for local processing
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tCtx = tempCanvas.getContext('2d');
      tCtx.drawImage(cand.croppedCanvas, 0, 0);

      const imgData = tCtx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Sample 4 corner regions
      const sample1 = (5 * canvas.width + 5) * 4;
      const sample2 = (5 * canvas.width + (canvas.width - 5)) * 4;

      const bgR = Math.round((data[sample1] + data[sample2]) / 2);
      const bgG = Math.round((data[sample1 + 1] + data[sample2 + 1]) / 2);
      const bgB = Math.round((data[sample1 + 2] + data[sample2 + 2]) / 2);

      const threshold = 65;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);

        if (dist < threshold) {
          const alpha = dist / threshold;
          data[i] = Math.round(targetRgb.r * (1 - alpha) + r * alpha);
          data[i + 1] = Math.round(targetRgb.g * (1 - alpha) + g * alpha);
          data[i + 2] = Math.round(targetRgb.b * (1 - alpha) + b * alpha);
        }
      }

      tCtx.putImageData(imgData, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0);

    } else {
      ctx.drawImage(cand.croppedCanvas, 0, 0);
    }

    // Apply Brightness & Contrast Adjustments
    const filterCanvas = document.createElement('canvas');
    filterCanvas.width = canvas.width;
    filterCanvas.height = canvas.height;
    const fCtx = filterCanvas.getContext('2d');

    fCtx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    fCtx.drawImage(canvas, 0, 0);
    fCtx.filter = 'none';

    // Thin Outer Border
    fCtx.strokeStyle = '#000000';
    fCtx.lineWidth = 4;
    fCtx.strokeRect(0, 0, filterCanvas.width, filterCanvas.height);

    cand.processedDataUrl = filterCanvas.toDataURL('image/jpeg', 0.95);
  });

  const thumbImg = document.getElementById('passport-live-thumb-img');
  if (passportState.candidates.length > 0 && thumbImg) {
    thumbImg.src = passportState.candidates[0].processedDataUrl;
  }

  showPassportControls();
  renderPassportCandidatesList();
  renderPassportSheet();
}

function showPassportControls() {
  document.getElementById('passport-controls').style.display = 'flex';
  document.getElementById('passport-candidates-section').style.display = 'flex';

  const thumbContainer = document.getElementById('passport-live-thumb-container');
  const thumbImg = document.getElementById('passport-live-thumb-img');
  if (passportState.candidates.length > 0 && thumbContainer && thumbImg) {
    thumbContainer.style.display = 'flex';
    thumbImg.src = passportState.candidates[0].processedDataUrl;
  }
}

function renderPassportCandidatesList() {
  const container = document.getElementById('passport-candidates-container');
  const countBadge = document.getElementById('passport-cand-count');
  if (!container) return;

  container.innerHTML = '';
  if (countBadge) countBadge.innerText = passportState.candidates.length;

  passportState.candidates.forEach((cand) => {
    const item = document.createElement('div');
    item.style.background = 'rgba(15, 23, 42, 0.6)';
    item.style.border = '1px solid var(--border-color)';
    item.style.borderRadius = '6px';
    item.style.padding = '0.5rem 0.75rem';
    item.style.fontSize = '0.8rem';
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.justifyContent = 'space-between';

    item.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <img src="${cand.processedDataUrl}" style="width:28px; height:36px; border-radius:2px; object-fit:cover;">
        <span style="font-weight:600; font-size:0.8rem;">${cand.name} ${cand.aiCutoutImage ? '✨ AI Studio BG' : ''}</span>
      </div>
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <div style="display:flex; align-items:center; gap:0.2rem;">
          <label style="font-size:0.75rem; color:var(--text-muted);">Photos:</label>
          <input type="number" min="1" max="36" value="${cand.photoCount}" onchange="updateCandPhotoCount('${cand.id}', this.value)" style="width:44px; background:rgba(0,0,0,0.5); border:1px solid var(--border-color); color:#fff; border-radius:4px; padding:2px 4px; text-align:center;">
        </div>
        <button class="btn-secondary" onclick="deletePassportCandidate('${cand.id}')" style="padding:0.25rem 0.4rem; color:var(--accent-rose);">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;

    container.appendChild(item);
  });
}

function updateCandPhotoCount(candId, val) {
  const cand = passportState.candidates.find(c => c.id === candId);
  if (cand) {
    cand.photoCount = parseInt(val, 10) || 6;
    renderPassportSheet();
  }
}

function deletePassportCandidate(candId) {
  passportState.candidates = passportState.candidates.filter(c => c.id !== candId);
  renderPassportCandidatesList();
  renderPassportSheet();
  showToast('Candidate removed from sheet', 'info');
}

function renderPassportSheet() {
  const paperPreview = document.getElementById('passport-paper-preview');
  const photoGrid = document.getElementById('passport-photo-grid');
  if (!paperPreview || !photoGrid) return;

  if (passportState.candidates.length === 0) {
    photoGrid.innerHTML = `
      <div style="width:100%; text-align:center; color:#94a3b8; margin-top:200px;">
        <i class="fa-solid fa-camera-retro" style="font-size:3.5rem; color:#cbd5e1; margin-bottom:1rem;"></i>
        <p style="font-size:1.1rem; font-weight:600; color:#475569;">No Passport Photo Uploaded</p>
        <p style="font-size:0.85rem; color:#94a3b8; margin-top:0.25rem;">Upload candidate photo to generate 6 per row or multi-person photo sheets.</p>
      </div>
    `;
    return;
  }

  const photosPerRow = parseInt(document.getElementById('passport-photos-per-row').value, 10) || 6;
  const paperPreset = document.getElementById('passport-paper-preset').value;
  const showCutGuides = document.getElementById('passport-cut-guides').checked;
  const cutGuideClass = showCutGuides ? 'cut-guides' : '';

  paperPreview.className = paperPreset === '4x6' ? 'paper-sheet paper-4x6' : 'paper-sheet paper-a4';
  photoGrid.innerHTML = '';

  const usableWidth = paperPreset === '4x6' ? 548 : 758;
  const gap = 4; // Tight gap between photos
  const itemWidth = Math.floor((usableWidth - (photosPerRow - 1) * gap) / photosPerRow);
  const itemHeight = Math.floor(itemWidth * (4.5 / 3.5));

  passportState.candidates.forEach(cand => {
    const candBlock = document.createElement('div');
    candBlock.style.width = '100%';
    candBlock.style.marginBottom = '4px';

    const rowContainer = document.createElement('div');
    rowContainer.style.display = 'flex';
    rowContainer.style.flexWrap = 'wrap';
    rowContainer.style.gap = `${gap}px`;
    rowContainer.style.width = '100%';

    for (let i = 0; i < cand.photoCount; i++) {
      const photoItem = document.createElement('div');
      photoItem.className = `passport-photo-item ${cutGuideClass}`;

      // Percentage width calculation guarantees 6 photos fit in Row 1 cleanly!
      photoItem.style.width = `calc((100% - ${(photosPerRow - 1) * gap}px) / ${photosPerRow})`;
      photoItem.style.aspectRatio = '3.5 / 4.5';
      photoItem.style.height = 'auto';

      photoItem.innerHTML = `<img src="${cand.processedDataUrl}" alt="${cand.name}">`;
      rowContainer.appendChild(photoItem);
    }

    candBlock.appendChild(rowContainer);
    photoGrid.appendChild(candBlock);
  });
}
