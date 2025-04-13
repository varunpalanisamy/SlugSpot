# BananaBreak: UCSC Classroom Finder

**BananaBreak** is a full-stack system built to help UCSC students find empty classrooms to relax, study, or hang out between classes.
---

## Features

- Scrapes UCSC class & discussion schedule directly from [pisa.ucsc.edu](https://pisa.ucsc.edu/class_search/)
- Generates quarterly CSV each quarter (room, day, time) of every class, discussion, lab, etc.
- Analyzes which classrooms are available at any given time
- Visualizes free rooms on an interactive campus map(Google Maps API), helping students:
    - Find classrooms closest to them
    - Find classrooms between two scheduled classes
    - Find open study spaces or cafés
    - Quickly see which locations are free during a selected hour
- Uploads quarterly CSV to **MongoDB Atlas** for archival


---

## Project Structure

```
BananaBreak/
├── chromedriver-mac-arm64/             # ChromeDriver for Selenium (macOS ARM support)
├── myenv/                              # Python virtual environment (not tracked in Git)
├── newenv/                             # Another virtual environment (active environment)
├── node_modules/                       # Installed Node.js modules (auto-managed)
│
├── public/
│   ├── data/                           # Cleaned & raw datasets used in the pipeline
│   │   ├── all_discussion_sections.csv
│   │   ├── all_discussion_sections_cleaned.csv
│   │   ├── occupied_rooms.csv              # Final merged and cleaned dataset
│   │   ├── ucsc_class_data.csv
│   │   └── ucsc_class_data_preprocessed.csv
│   │
│   └── mapboxCode/                    # Contains CSVs and addresses for geolocation mapping
│
├── BananaBreak/                      # Python-based scraping, cleaning, and upload logic
│   ├── app.py                             # Streamlit UI to explore & filter class data
│   ├── class_scraper.py                  # Scrapes UCSC class listings from pisa.ucsc.edu
│   ├── scrape_discussion.py              # Scrapes discussion/lab sections for each class
│   ├── preprocess_classes.py             # Cleans raw class data
│   ├── preprocess_discussions.py         # Cleans raw discussion section data
│   ├── combine_datasets.py               # Combines cleaned classes + discussions
│   ├── store_in_mongo.py                 # Uploads final CSV into MongoDB Atlas
│   └── run_pipeline.py                   # One-click script to run full pipeline + upload
│
├── views/                              # Frontend rendered via EJS templates (Express)
│   ├── home.ejs
│   ├── map.ejs
│   ├── pickaroom.ejs
│   └── schedule.ejs
│
├── index.js                            # Main entry point for Node.js/Express server
├── config.js                           # App config file (e.g., API keys, constants)
├── styles.css                          # App styles (global CSS)
│
├── README.md                           # Project documentation
├── requirements.txt                    # Python dependencies for BananaBreak pipeline
├── package.json                        # Node.js dependencies and project metadata
└── package-lock.json                   # Auto-generated dependency lockfile

```

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
