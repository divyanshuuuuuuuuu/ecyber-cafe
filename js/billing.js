/* e-Cyber Cafe Automation Suite - Customer Receipt & Billing Engine */

const billingState = {
  items: [
    { name: 'Aadhaar Color Print', qty: 1, price: 30, total: 30 }
  ]
};

document.addEventListener('DOMContentLoaded', () => {
  const custNameInput = document.getElementById('bill-cust-name');
  const custPhoneInput = document.getElementById('bill-cust-phone');
  const itemPresetSelect = document.getElementById('bill-item-preset');
  const qtyInput = document.getElementById('bill-item-qty');
  const priceInput = document.getElementById('bill-item-price');
  const addBtn = document.getElementById('btn-add-bill-item');
  const printBtn = document.getElementById('btn-print-receipt');

  // Auto-set today date
  const dateStrSpan = document.getElementById('receipt-date-str');
  if (dateStrSpan) {
    const today = new Date();
    dateStrSpan.innerText = `Date: ${today.toLocaleDateString('en-IN')}`;
  }

  if (itemPresetSelect && priceInput) {
    itemPresetSelect.addEventListener('change', (e) => {
      const selectedOpt = e.target.options[e.target.selectedIndex];
      const defaultPrice = selectedOpt.getAttribute('data-price');
      if (defaultPrice !== null) {
        priceInput.value = defaultPrice;
      }
    });
  }

  if (custNameInput) {
    custNameInput.addEventListener('input', (e) => {
      document.getElementById('rec-disp-name').innerText = e.target.value.trim() || 'Cash Customer';
    });
  }

  if (custPhoneInput) {
    custPhoneInput.addEventListener('input', (e) => {
      document.getElementById('rec-disp-phone').innerText = e.target.value.trim() || '--';
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', addBillItem);
  }

  if (printBtn) {
    printBtn.addEventListener('click', printReceipt);
  }

  renderReceiptTable();
});

function addBillItem() {
  const presetSelect = document.getElementById('bill-item-preset');
  const qtyInput = document.getElementById('bill-item-qty');
  const priceInput = document.getElementById('bill-item-price');

  const itemName = presetSelect.value;
  const qty = parseInt(qtyInput.value, 10) || 1;
  const price = parseFloat(priceInput.value) || 0;

  if (qty <= 0 || price < 0) {
    showToast('Please enter valid quantity and price', 'warning');
    return;
  }

  billingState.items.push({
    name: itemName,
    qty: qty,
    price: price,
    total: qty * price
  });

  renderReceiptTable();
  showToast('Item added to receipt', 'success');
}

function renderReceiptTable() {
  const tbody = document.getElementById('receipt-items-tbody');
  const totalSpan = document.getElementById('receipt-total-amount');
  if (!tbody || !totalSpan) return;

  tbody.innerHTML = '';
  let grandTotal = 0;

  billingState.items.forEach((item, index) => {
    grandTotal += item.total;

    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #e2e8f0';

    tr.innerHTML = `
      <td style="padding:4px 0;">
        ${item.name}
        <i class="fa-solid fa-xmark" onclick="removeBillItem(${index})" style="color:#ef4444; cursor:pointer; margin-left:4px; font-size:0.7rem;"></i>
      </td>
      <td style="text-align:center;">${item.qty}</td>
      <td style="text-align:right;">₹${item.total}</td>
    `;

    tbody.appendChild(tr);
  });

  totalSpan.innerText = `₹${grandTotal}`;
}

function removeBillItem(index) {
  billingState.items.splice(index, 1);
  renderReceiptTable();
}

function printReceipt() {
  const receiptBox = document.getElementById('receipt-preview-box');
  if (!receiptBox) return;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  printWindow.document.write(`
    <html>
      <head>
        <title>Customer Receipt</title>
        <style>
          body { font-family: monospace; padding: 20px; background: white; color: black; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 4px 0; }
        </style>
      </head>
      <body>
        ${receiptBox.outerHTML}
        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
