/* e-Cyber Cafe Automation Suite - Govt Form Photo & Signature Resizer Engine */

const resizerState = {
  rawImage: null,
  cropperInstance: null,
  compressedDataUrl: null,
  targetKB: 45,
  aspectRatio: 3.5 / 4.5
};

document.addEventListener('DOMContentLoaded', () => {
  const presetSelect = document.getElementById('resizer-preset');
  const targetKbInput = document.getElementById('resizer-target-kb');
  const fileInput = document.getElementById('resizer-file-input');
  const downloadBtn = document.getElementById('btn-download-resized');

  if (presetSelect) {
    presetSelect.addEventListener('change', handleResizerPresetChange);
  }

  if (targetKbInput) {
    targetKbInput.addEventListener('input', (e) => {
      resizerState.targetKB = parseInt(e.target.value, 10) || 45;
      if (resizerState.cropperInstance) compressAndRenderOutput();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', handleResizerFileUpload);
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadResizedImage);
  }
});

function handleResizerPresetChange(e) {
  const preset = e.target.value;
  const targetKbInput = document.getElementById('resizer-target-kb');

  switch (preset) {
    case 'ssc-photo':
      resizerState.targetKB = 45;
      resizerState.aspectRatio = 3.5 / 4.5;
      targetKbInput.value = 45;
      break;
    case 'ssc-sig':
      resizerState.targetKB = 18;
      resizerState.aspectRatio = 4.0 / 2.0;
      targetKbInput.value = 18;
      break;
    case 'upsc-photo':
    case 'upsc-sig':
      resizerState.targetKB = 250;
      resizerState.aspectRatio = preset === 'upsc-photo' ? 3.5 / 4.5 : 4.0 / 2.0;
      targetKbInput.value = 250;
      break;
    case 'rrb-photo':
    case 'ibps-photo':
      resizerState.targetKB = 45;
      resizerState.aspectRatio = 3.5 / 4.5;
      targetKbInput.value = 45;
      break;
    case 'custom':
      resizerState.aspectRatio = NaN; // Free crop
      break;
  }

  if (resizerState.cropperInstance) {
    resizerState.cropperInstance.setAspectRatio(resizerState.aspectRatio);
    compressAndRenderOutput();
  }
}

async function handleResizerFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const dataUrl = await fileToDataURL(file);
  resizerState.rawImage = dataUrl;

  document.getElementById('resizer-placeholder').style.display = 'none';
  document.getElementById('resizer-crop-box').style.display = 'block';
  document.getElementById('resizer-stats').style.display = 'block';

  const previewImg = document.getElementById('resizer-image-preview');
  previewImg.src = dataUrl;

  if (resizerState.cropperInstance) {
    resizerState.cropperInstance.destroy();
  }

  resizerState.cropperInstance = new Cropper(previewImg, {
    aspectRatio: resizerState.aspectRatio,
    viewMode: 1,
    autoCropArea: 0.9,
    cropend() {
      compressAndRenderOutput();
    },
    ready() {
      compressAndRenderOutput();
    }
  });
}

function compressAndRenderOutput() {
  if (!resizerState.cropperInstance) return;

  const canvas = resizerState.cropperInstance.getCroppedCanvas();
  if (!canvas) return;

  let quality = 0.95;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  let sizeKB = Math.round((dataUrl.length * 0.75) / 1024);

  // Iterative quality reduction to meet target KB limit
  while (sizeKB > resizerState.targetKB && quality > 0.1) {
    quality -= 0.05;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
    sizeKB = Math.round((dataUrl.length * 0.75) / 1024);
  }

  // If still too large, downscale canvas dimensions
  if (sizeKB > resizerState.targetKB) {
    const scaledCanvas = document.createElement('canvas');
    const scaleFactor = 0.75;
    scaledCanvas.width = Math.floor(canvas.width * scaleFactor);
    scaledCanvas.height = Math.floor(canvas.height * scaleFactor);

    const ctx = scaledCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
    dataUrl = scaledCanvas.toDataURL('image/jpeg', 0.85);
    sizeKB = Math.round((dataUrl.length * 0.75) / 1024);
  }

  resizerState.compressedDataUrl = dataUrl;

  // Update Stats UI
  const outputKbSpan = document.getElementById('resizer-output-kb');
  const outputDimSpan = document.getElementById('resizer-output-dim');
  const downloadBtn = document.getElementById('btn-download-resized');

  if (outputKbSpan) {
    outputKbSpan.innerText = `${sizeKB} KB`;
    outputKbSpan.style.color = sizeKB <= resizerState.targetKB ? 'var(--accent-emerald)' : 'var(--accent-rose)';
  }

  if (outputDimSpan) {
    outputDimSpan.innerText = `${canvas.width} x ${canvas.height} px`;
  }

  if (downloadBtn) {
    downloadBtn.disabled = false;
  }
}

function downloadResizedImage() {
  if (!resizerState.compressedDataUrl) return;

  const preset = document.getElementById('resizer-preset').value;
  const link = document.createElement('a');
  link.download = `govt_form_${preset}_${Date.now()}.jpg`;
  link.href = resizerState.compressedDataUrl;
  link.click();

  showToast('Resized photo downloaded successfully!', 'success');
}
