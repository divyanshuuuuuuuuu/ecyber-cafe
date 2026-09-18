/* e-Cyber Cafe Automation Suite - Multi-Card Saver Studio */

const composerState = {
  items: [] // { id, name, dataUrl, width, height }
};

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('composer-file-input');
  const printBtn = document.getElementById('btn-print-composer');

  if (fileInput) {
    fileInput.addEventListener('change', handleComposerFileUpload);
  }

  if (printBtn) {
    printBtn.addEventListener('click', triggerPrint);
  }
});

async function handleComposerFileUpload(e) {
  const files = Array.from(e.target.files);
  if (!files || files.length === 0) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const dataUrl = await fileToDataURL(file);

    composerState.items.push({
      id: 'layer_' + Date.now() + '_' + i,
      name: file.name,
      dataUrl: dataUrl
    });
  }

  renderComposerCanvas();
  showToast(`${files.length} document(s) added to A4 composer`, 'success');
}

function renderComposerCanvas() {
  const previewSheet = document.getElementById('composer-paper-preview');
  const layersList = document.getElementById('composer-layers-list');
  if (!previewSheet || !layersList) return;

  previewSheet.innerHTML = '';
  layersList.innerHTML = '';

  if (composerState.items.length === 0) {
    previewSheet.innerHTML = `
      <div style="width:100%; text-align:center; color:#94a3b8; margin-top:200px;">
        <i class="fa-solid fa-layer-group" style="font-size:3.5rem; color:#cbd5e1; margin-bottom:1rem;"></i>
        <p style="font-size:1.1rem; font-weight:600; color:#475569;">Multi-Card Paper Saver Canvas</p>
        <p style="font-size:0.85rem; color:#94a3b8; margin-top:0.25rem;">Combine Aadhaar + PAN + Passport Photos on 1 A4 sheet to save customer printing costs.</p>
      </div>
    `;
    layersList.innerHTML = '<p style="font-size:0.8rem; color:var(--text-muted);">No images added to canvas yet.</p>';
    return;
  }

  composerState.items.forEach((item, index) => {
    // 1. Add Card Box to A4 Sheet Preview
    const cardItem = document.createElement('div');
    cardItem.className = 'id-card-item with-border';
    cardItem.style.width = '324px';
    cardItem.style.height = '204px';
    cardItem.style.position = 'relative';
    cardItem.style.display = 'inline-block';
    cardItem.style.margin = '6px';
    cardItem.style.background = '#fff';

    cardItem.innerHTML = `<img src="${item.dataUrl}" alt="${item.name}" style="width:100%; height:100%; object-fit:contain;">`;
    previewSheet.appendChild(cardItem);

    // 2. Add item control row in Layer List
    const layerRow = document.createElement('div');
    layerRow.style.display = 'flex';
    layerRow.style.alignItems = 'center';
    layerRow.style.justifyContent = 'space-between';
    layerRow.style.background = 'rgba(15, 23, 42, 0.6)';
    layerRow.style.padding = '0.5rem 0.75rem';
    layerRow.style.borderRadius = '6px';
    layerRow.style.border = '1px solid var(--border-color)';
    layerRow.style.fontSize = '0.8rem';

    layerRow.innerHTML = `
      <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">${item.name}</span>
      <button class="btn-secondary" onclick="removeComposerItem('${item.id}')" style="padding:0.2rem 0.5rem; color:var(--accent-rose);">
        <i class="fa-solid fa-trash"></i>
      </button>
    `;

    layersList.appendChild(layerRow);
  });
}

function removeComposerItem(id) {
  composerState.items = composerState.items.filter(item => item.id !== id);
  renderComposerCanvas();
  showToast('Item removed from composer', 'info');
}
