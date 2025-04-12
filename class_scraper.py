import time
import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import NoSuchElementException, TimeoutException

def scrape_ucsc_classes():
    # 1) Setup Chrome Options
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")  # run headless; remove if you want to watch the browser
    options.add_argument("--disable-gpu")

    # 2) Initialize the Driver (webdriver-manager auto-installs the correct ChromeDriver)
    driver = webdriver.Chrome(
        service=ChromeService(ChromeDriverManager().install()),
        options=options
    )

    wait = WebDriverWait(driver, 10)

    # 3) Go to Class Search
    driver.get("https://pisa.ucsc.edu/class_search/")

    # 4) Select “2025 Spring Quarter” from Term dropdown (value="2252")
    term_dropdown = Select(wait.until(EC.element_to_be_clickable((By.ID, "term_dropdown"))))
    term_dropdown.select_by_value("2252")

    # 5) Select “All Classes” from Status dropdown (value="all")
    reg_status_dropdown = Select(wait.until(EC.element_to_be_clickable((By.ID, "reg_status"))))
    reg_status_dropdown.select_by_value("all")

    # 6) Click Search
    search_button = wait.until(
        EC.element_to_be_clickable((By.XPATH, "//input[@type='submit' and @value='Search']"))
    )
    search_button.click()

    # 7) Pause to let the results load
    time.sleep(3)

    data = []
    page_count = 1

    # 8) Loop through all pages until there is no next button
    while True:
        print(f"Scraping page {page_count}...")

        # Wait until all panels for this page are present.
        try:
            panel_divs = wait.until(
                EC.presence_of_all_elements_located((By.XPATH, "//div[starts-with(@id,'rowpanel_')]"))
            )
        except TimeoutException:
            print("No panels found on the page.")
            break

        # 9) Extract Class, Location, Day/Time from each panel on the current page
        for i, panel in enumerate(panel_divs):
            # print(f"  Scraping rowpanel_{i}...")

            # -- Class Name --
            try:
                class_elem = panel.find_element(By.XPATH, ".//div[contains(@class,'panel-heading-custom')]//h2/a")
                class_name = class_elem.text.strip()
            except NoSuchElementException:
                class_name = "N/A"

            # -- Location and Day/Time --
            location_text = "N/A"
            day_time_text = "N/A"
            try:
                info_container = panel.find_element(
                    By.XPATH,
                    ".//div[contains(@class,'panel-body')]//div[contains(@class,'col-xs-12') and contains(@class,'col-sm-6')]"
                )
                sub_divs = info_container.find_elements(
                    By.XPATH,
                    ".//div[contains(@class,'col-xs-6') and contains(@class,'col-sm-6')]"
                )
                if len(sub_divs) >= 2:
                    # Remove the "Location:\n" and "Day and Time:\n" prefixes using replace.
                    location_text = sub_divs[0].text.strip().replace("Location:\n", "")
                    day_time_text = sub_divs[1].text.strip().replace("Day and Time:\n", "")
            except NoSuchElementException:
                pass

            data.append({
                "Class": class_name,
                "Location": location_text,
                "Day/Time": day_time_text
            })

        # 10) Try clicking the "next" button; break loop if not found.
        try:
            next_button = wait.until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//div[contains(@class,'row hide-print')]//a[contains(., 'next')]")
                )
            )
            # Click the next button
            next_button.click()
            page_count += 1
            # Wait for the next page to load (adjust the sleep duration if needed)
            time.sleep(3)
        except (NoSuchElementException, TimeoutException):
            print("No more pages found. Ending scrape.")
            break

    # 11) Close Browser
    driver.quit()

    # 12) Build and return a DataFrame
    df = pd.DataFrame(data)
    return df

if __name__ == "__main__":
    df_classes = scrape_ucsc_classes()
    print(df_classes)
    df_classes.to_csv("ucsc_class_data.csv", index=False)
