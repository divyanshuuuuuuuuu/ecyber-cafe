# 🖥️ eCyber Cafe Automation Suite

An all-in-one web-based automation toolkit designed for cyber cafes and digital service centers to streamline customer document processing, ID card formatting, photo resizing, document composition, and instant billing.

---

## 🌟 Key Features

### 📄 Document & ID Processing Tools
* **🆔 Aadhaar Card Formatting (`js/aadhaar.js`)**
  * Auto-alignment, crop, and printable layout generator with Standard Cyber Cafe sizing (85mm x 57mm).
* **🗳️ Voter ID Card Processing (`js/voter.js`)**
  * Quick formatting, card resizing, and printable document setup with Standard Cyber Cafe sizing (85mm x 57mm).
* **🛂 Passport Photo & Document Formatting (`js/passport.js`)**
  * Standard passport size photo generator (35mm x 45mm), background tools, and grid printing layouts (6, 8, 12 photos).

### 🛠️ Utility & Image Tools
* **🖼️ Document Resizer (`js/resizer.js`)**
  * Custom dimension and file size optimizer for online job application uploads (KB/MB constraints).
* **📑 Page & Image Composer (`js/composer.js`)**
  * Combine multiple customer documents onto a single A4 page for cost-effective printing.

### 💰 Cafe Management
* **🧾 Quick Billing & Receipt Generator (`js/billing.js`)**
  * Instant receipt generation for customer services with customizable rates and print support.

---

## 🚀 Live Demo & Hosting

### Live Website
Access the live web application on GitHub Pages:
**[https://divyanshuuuuuuuuu.github.io/ecyber-cafe/](https://divyanshuuuuuuuuu.github.io/ecyber-cafe/)**

### Local Access
Open `index.html` directly in any web browser or start a local HTTP server:
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000`.

### Configuring Remove.bg API Key
To enable automatic AI background removal for all users:
1. Open `js/passport.js`.
2. Locate line 7:
   ```javascript
   const REMOVE_BG_API_KEY = '7o4yMdmw9KX1s8bkqBKFMdhA';
   ```
3. Replace `'7o4yMdmw9KX1s8bkqBKFMdhA'` with your actual Remove.bg API key.

---

## 📁 Project Structure

```
ecyber cafe/
├── index.html         # Main dashboard and user interface
├── styles.css         # Modern responsive CSS design system
├── README.md          # Project documentation
└── js/
    ├── aadhaar.js     # Aadhaar card processing logic
    ├── voter.js       # Voter ID processing logic
    ├── passport.js    # Passport photo formatting, background removal & print grids
    ├── resizer.js     # Image resizing & compression utilities
    ├── composer.js    # Multi-document page composer
    ├── billing.js     # Customer billing and invoice generation
    └── app.js         # Core application setup & event handlers
```

---

## 🛠️ Built With

* **HTML5** & **CSS3** (Responsive design system with dark/light UI tokens)
* **Vanilla JavaScript (ES6+)**
* Zero external backend dependencies – 100% fast, client-side browser processing!

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
