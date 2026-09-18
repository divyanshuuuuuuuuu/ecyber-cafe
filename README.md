# 🖥️ eCyber Cafe Automation Suite

An all-in-one web-based automation toolkit designed for cyber cafes and digital service centers to streamline customer document processing, ID card formatting, photo resizing, document composition, and instant billing.

---

## 🌟 Key Features

### 📄 Document & ID Processing Tools
* **🆔 Aadhaar Card Formatting (`js/aadhaar.js`)**
  * Auto-alignment, crop, and printable layout generator for Aadhaar cards.
* **🗳️ Voter ID Card Processing (`js/voter.js`)**
  * Quick formatting, card resizing, and printable document setup for Voter IDs.
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

## 🚀 Live Demo, Local Setup & Hosting

### 1. Configure Environment Variables
Copy `.env.example` to `.env` and enter your Remove.bg API key:
```bash
cp .env.example .env
```
In `.env`:
```env
REMOVE_BG_API_KEY=your_actual_remove_bg_api_key_here
PORT=8000
```
> **Security Note:** `.env` is gitignored and will never be committed to GitHub. Your API key remains secure on the server side.

### 2. Local Access
Run using Python (standard library, zero dependencies):
```bash
python server.py 8000
```
Or run using Node.js:
```bash
npm start
# or: node server.js 8000
```
Then visit `http://localhost:8000`.

### 3. Serverless Deployment (Vercel / Netlify)
This repository is configured for zero-config serverless deployment:
1. Push this repository to GitHub.
2. Import the repository on [Vercel](https://vercel.com).
3. In Project Settings > **Environment Variables**, add:
   - `REMOVE_BG_API_KEY`: Your Remove.bg API Key
4. Deploy! The `/api/removebg` serverless route will securely handle background removal requests.

---

## 📁 Project Structure

```
ecyber cafe/
├── index.html         # Main dashboard and user interface
├── styles.css         # Modern responsive CSS design system
├── README.md          # Project documentation
├── .env.example       # Example environment variable template
├── vercel.json        # Vercel serverless deployment routing
├── package.json       # Project configuration and scripts
├── server.py          # Python dev server with /api/removebg proxy (zero dependencies)
├── server.js          # Node dev server with /api/removebg proxy (zero dependencies)
├── api/
│   └── removebg.js    # Vercel / Node serverless function for Remove.bg
└── js/
    ├── aadhaar.js     # Aadhaar card processing logic
    ├── voter.js       # Voter ID processing logic
    ├── passport.js    # Passport photo formatting & print grids
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
