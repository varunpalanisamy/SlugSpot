"""
scrape_all_discussions.py

This script uses Selenium, BeautifulSoup, and pandas to automate the scraping
of discussion section details for all classes returned by the UCSC class search.
It performs the following steps:

1. Navigate to the UCSC class search page: https://pisa.ucsc.edu/class_search/
2. Select term "Spring Quarter 2025" (value "2252") and status "All Classes".
3. Click on the Search button.
4. For each result page:
   a. Wait for the list of class panels (each with an id starting with "rowpanel_") to load.
   b. Loop through each class panel (there will be 25 per page):
      - Click the class link to open its detail menu.
      - Print the class name to show which class is being processed.
      - Wait for the discussion/lab section to be visible.
      - Scrape the discussion rows (ignoring those whose title is "Academic").
          * For each discussion row, extract:
                • The discussion code (e.g. "DIS 01A") and combine with the course prefix (from the main class link) to form the Section.
                • The Day/Time text.
                • The Location text (with "Loc:" removed).
      - Append the discussion data to a global list.
      - Click the “Back to results” link to return to the results.
   c. Every 25 classes processed, autosave the current scraped discussion data to a CSV file.
   d. Print progress messages.
   e. Click the “next” button to go to the next page of results (if available).
5. At the end, save any remaining discussion data into a CSV file
   (columns ordered as: Section, Location, Day/Time).

Usage:
    python scrape_all_discussions.py
"""

import time, re, os
import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup

def setup_driver(headless=True):
    options = webdriver.ChromeOptions()
    if headless:
        options.add_argument("--headless")
        options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    return webdriver.Chrome(
        service=ChromeService(ChromeDriverManager().install()),
        options=options
    )

def go_to_search_results(driver, wait):
    wait.until(EC.presence_of_all_elements_located((By.XPATH, "//div[starts-with(@id, 'rowpanel_')]")))

def scrape_discussions_from_class(driver, wait, course_prefix):
    """
    After a class detail page is loaded, scrape discussion section rows.
    Returns a list of dictionaries for each discussion row with keys:
       "Section", "Location", "Day/Time"
    """
    scraped = []
    try:
        # Scroll to discussion section area
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight/2);")
        time.sleep(2)
        # Wait for the discussion panel header (it should contain the text "Associated Discussion Sections")
        discussion_panels = driver.find_elements(By.XPATH, "//div[contains(@class, 'panel-heading-custom')][contains(., 'Associated Discussion Sections')]")
        if not discussion_panels:
            print("No discussion section found — skipping.")
            return []
        discussion_panel = discussion_panels[0]

        discussion_container = discussion_panel.find_element(By.XPATH, "./following-sibling::div[contains(@class, 'panel-body')]")
        discussion_html = discussion_container.get_attribute("innerHTML")
        soup = BeautifulSoup(discussion_html, "html.parser")
        rows = soup.find_all("div", class_="row")
        for row in rows:
            cols = row.find_all("div", class_=lambda x: x and "col-xs-6" in x and "col-sm-3" in x)
            if len(cols) < 4:
                continue
            raw_section = cols[0].get_text(strip=True)
            m_section = re.search(r"(DIS\s+\S+)", raw_section)
            discussion_code = m_section.group(1).strip() if m_section else raw_section
            full_section = f"{course_prefix} {discussion_code}"
            day_time = cols[1].get_text(strip=True)
            location = cols[3].get_text(strip=True)
            if location.startswith("Loc:"):
                location = location.replace("Loc:", "").strip()
            scraped.append({
                "Section": full_section,
                "Location": location,
                "Day/Time": day_time
            })
    except TimeoutException:
        print("Discussion section not found or timed out in this class.")
    return scraped

def go_back_to_results(driver, wait):
    try:
        back_link = wait.until(EC.element_to_be_clickable((By.ID, "back_link")))
        back_link.click()
        time.sleep(2)  # Wait for the results page to load again
    except Exception as e:
        print("Error clicking back to results:", e)

def autosave_to_csv(data, output_csv, mode='a', header_needed=False):
    if data:
        df = pd.DataFrame(data)
        df = df[["Section", "Location", "Day/Time"]]
        df.to_csv(output_csv, index=False, mode=mode, header=header_needed)

def scrape_all_discussion_sections():
    driver = setup_driver(headless=True)
    wait = WebDriverWait(driver, 15)
    all_discussions = []  # used as a temporary container for the current batch
    total_processed = 0
    output_csv = "all_discussion_sections.csv"

    # Remove existing CSV to start fresh
    if os.path.exists(output_csv):
        os.remove(output_csv)

    try:
        # --- Navigate to the UCSC class search page and set search parameters ---
        driver.get("https://pisa.ucsc.edu/class_search/")
        time.sleep(3)
        term_dropdown = Select(wait.until(EC.element_to_be_clickable((By.ID, "term_dropdown"))))
        term_dropdown.select_by_value("2252")  # Spring Quarter 2025
        
        reg_status_dropdown = Select(wait.until(EC.element_to_be_clickable((By.ID, "reg_status"))))
        reg_status_dropdown.select_by_value("all")
        
        # Set additional filters:
        # (Assumes the additional selectors and fields have the IDs as in the HTML provided.)
        # For Course Units: select "between" and set units to between 5 and 15.
        crse_units_op = Select(wait.until(EC.element_to_be_clickable((By.ID, "crse_units_op"))))
        crse_units_op.select_by_value("between")
        # For between input fields, wait a moment to allow the field to be displayed.
        time.sleep(1)
        driver.find_element(By.ID, "crse_units_from").send_keys("5")
        driver.find_element(By.ID, "crse_units_to").send_keys("15")

        # For Course Career: select Undergraduate (value "UGRD")
        acad_career = Select(wait.until(EC.element_to_be_clickable((By.ID, "acad_career"))))
        acad_career.select_by_value("UGRD")
        
        # Deselect the checkboxes for asynchronous, hybrid, and synchronous online;
        # keep only "In Person" checked.
        # Note: Here we assume that we can click these checkboxes to deselect them.
        try:
            asynch = driver.find_element(By.ID, "asynchOnline")
            if asynch.is_selected():
                asynch.click()
            hybrid = driver.find_element(By.ID, "hybrid")
            if hybrid.is_selected():
                hybrid.click()
            synch = driver.find_element(By.ID, "synchOnline")
            if synch.is_selected():
                synch.click()
        except Exception as e:
            print("Error deselecting online options:", e)

        # Click search
        search_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//input[@type='submit' and @value='Search']")))
        search_button.click()
        time.sleep(3)

        # --- Now loop through each result page (25 classes per page) ---
        while True:
            go_to_search_results(driver, wait)
            panels = driver.find_elements(By.XPATH, "//div[starts-with(@id, 'rowpanel_')]")
            num_panels = len(panels)
            print(f"\nFound {num_panels} classes on this page.")

            for i in range(num_panels):
                panels = driver.find_elements(By.XPATH, "//div[starts-with(@id, 'rowpanel_')]")
                if i >= len(panels):
                    break  # In case the number changes during processing
                panel = panels[i]
                try:
                    class_link = panel.find_element(By.CSS_SELECTOR, "div.panel-heading-custom h2 a")
                    main_class_text = class_link.text.strip()
                    print(f"Processing class {total_processed + 1}: {main_class_text}")
                    
                    # Extract course prefix using regex; fallback to first 3 tokens.
                    m = re.match(r"^([A-Z]+\s*\d+\s*-\s*\d+)", main_class_text)
                    course_prefix = m.group(1).strip() if m else " ".join(main_class_text.split()[:3])
                    
                    # Click the class to open the detail panel.
                    class_link.click()
                    time.sleep(2)
                    
                    # Scrape the discussion sections for this class.
                    discussions = scrape_discussions_from_class(driver, wait, course_prefix)
                    if discussions:
                        all_discussions.extend(discussions)
                    
                    total_processed += 1

                    # After every 25 classes, autosave the data and clear the batch.
                    if total_processed % 25 == 0:
                        print(f"Autosaving after processing {total_processed} classes...")
                        autosave_to_csv(all_discussions, output_csv,
                                         mode='a',
                                         header_needed=(total_processed == 25))
                        all_discussions.clear()

                    # Print progress for every 25 classes processed.
                    if total_processed % 25 == 0:
                        print(f"{total_processed} classes processed so far.")

                    # Click the “Back to results” link.
                    go_back_to_results(driver, wait)
                    time.sleep(2)
                except Exception as e:
                    print(f"Error processing class {i+1} on this page: {e}")
                    # Attempt to go back to results if an error occurs.
                    try:
                        go_back_to_results(driver, wait)
                    except:
                        pass
                    continue

            print(f"Finished processing current page; total classes processed: {total_processed}")
            try:
                next_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'next')]")))
                next_button.click()
                time.sleep(3)
            except TimeoutException:
                print("No more pages found. Ending scrape.")
                break

        # Save any remaining data after the loop ends.
        if all_discussions:
            print("Saving final batch...")
            autosave_to_csv(all_discussions, output_csv,
                             mode='a',
                             header_needed=(not os.path.exists(output_csv)))
            print(f"Final autosave done. Total classes processed: {total_processed}")

    finally:
        driver.quit()
        print(f"Scraping complete. Total discussion entries saved to {output_csv}.")

if __name__ == "__main__":
    scrape_all_discussion_sections()
