# requirementcopilot 

## 🚀 Getting Started

This project requires running services in multiple terminals. Follow the steps below to start the application.

---

### 📋 Prerequisites

Make sure you have the following installed:

- Python (with necessary packages)
- Node.js and npm

---

### 🧠 Terminal 1: Start the LLM Service

```bash
cd ./backend
python start_llm_service.py
```

---

### 🌐 Terminal 2: Start the Node Server

```bash
cd ./backend
node server.js
```

---

### 🖥️ Terminal 3: Start the Frontend

```bash
cd ./frontend
npm start
```

---

### 📌 Note

If any dependencies are missing, install them using:

- For Python (inside the `backend` folder):

  ```bash
  pip install -r requirements.txt
  ```

- For Node.js (inside `frontend` or `backend` as needed):

  ```bash
  npm install
  ```
