# BananaBreak: UCSC Classroom Finder

**BananaBreak** is a full-stack system built to help UCSC students find empty classrooms to relax, study, or hang out between classes.
---

## How to Run

### 1. Clone the repo & setup environment

```bash
git clone https://github.com/varunpalanisamy/BananaBreak.git
cd BananaBreak
python -m venv newenv
source newenv/bin/activate
pip install -r requirements.txt
```

---

### 2. Run Website

```bash
node index.js
```

Visit `http://localhost:3000` in your browser.

---

## Dependencies

All dependencies are listed in `requirements.txt`:

- `selenium`
- `webdriver-manager`
- `pandas`
- `bs4`
- `pymongo`
- `streamlit`
- `urllib3`

Install all at once:

```bash
pip install -r requirements.txt
```

---

## Made by Varun Palanisamy and Shivani Belambe

*Project for UCSC – helping students find quiet classrooms and reduce stress during breaks between classes.*
