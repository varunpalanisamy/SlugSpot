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
    options = webdriver.ChromeOptions()
    options.add_argument("--headless") 
    options.add_argument("--disable-gpu")

    driver = webdriver.Chrome(
        service=ChromeService(ChromeDriverManager().install()),
        options=options
    )

    wait = WebDriverWait(driver, 10)

    driver.get("https://pisa.ucsc.edu/class_search/")

    term_dropdown = Select(wait.until(EC.element_to_be_clickable((By.ID, "term_dropdown"))))
    term_dropdown.select_by_value("2252")

    reg_status_dropdown = Select(wait.until(EC.element_to_be_clickable((By.ID, "reg_status"))))
    reg_status_dropdown.select_by_value("all")

    search_button = wait.until(
        EC.element_to_be_clickable((By.XPATH, "//input[@type='submit' and @value='Search']"))
    )
    search_button.click()

    time.sleep(3)

    data = []
    page_count = 1

    while True:
        print(f"Scraping page {page_count}...")

        try:
            panel_divs = wait.until(
                EC.presence_of_all_elements_located((By.XPATH, "//div[starts-with(@id,'rowpanel_')]"))
            )
        except TimeoutException:
            print("No panels found on the page.")
            break

        for i, panel in enumerate(panel_divs):

            try:
                class_elem = panel.find_element(By.XPATH, ".//div[contains(@class,'panel-heading-custom')]//h2/a")
                class_name = class_elem.text.strip()
            except NoSuchElementException:
                class_name = "N/A"

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
                    location_text = sub_divs[0].text.strip().replace("Location:\n", "")
                    day_time_text = sub_divs[1].text.strip().replace("Day and Time:\n", "")
            except NoSuchElementException:
                pass

            data.append({
                "Class": class_name,
                "Location": location_text,
                "Day/Time": day_time_text
            })

        try:
            next_button = wait.until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//div[contains(@class,'row hide-print')]//a[contains(., 'next')]")
                )
            )
            next_button.click()
            page_count += 1
            time.sleep(3)
        except (NoSuchElementException, TimeoutException):
            print("No more pages found. Ending scrape.")
            break

    driver.quit()

    df = pd.DataFrame(data)
    return df

if __name__ == "__main__":
    df_classes = scrape_ucsc_classes()
    print(df_classes)
    df_classes.to_csv("ucsc_class_data.csv", index=False)
