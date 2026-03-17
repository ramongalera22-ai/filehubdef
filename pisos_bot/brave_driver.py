import time, random
import undetected_chromedriver as uc
from database import log

def crear_driver(headless=True):
    opts = uc.ChromeOptions()
    opts.add_argument("--lang=es-ES")
    opts.add_argument("--window-size=1366,768")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    if headless:
        opts.add_argument("--headless=new")
    driver = uc.Chrome(options=opts, use_subprocess=True)
    driver.set_page_load_timeout(30)
    log("info", "✅ Chrome undetected iniciado")
    return driver

def pausa(base=20): time.sleep(base + random.uniform(-3, 8))
def pausa_pagina(): time.sleep(8 + random.uniform(0, 5))

def ir_a(driver, url, selector=None):
    try:
        driver.get(url)
        time.sleep(random.uniform(2, 4))
        if selector:
            from selenium.webdriver.common.by import By
            from selenium.webdriver.support.ui import WebDriverWait
            from selenium.webdriver.support import expected_conditions as EC
            WebDriverWait(driver, 12).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
        for _ in range(random.randint(2, 4)):
            driver.execute_script(f"window.scrollBy(0,{random.randint(300,600)})")
            time.sleep(random.uniform(0.5, 1.5))
        return True
    except:
        return False

def aceptar_cookies(driver):
    from selenium.webdriver.common.by import By
    for sel in ["#didomi-notice-agree-button", "button[id*='accept']",
                "//button[contains(.,'Aceptar')]", "//button[contains(.,'Accept')]"]:
        try:
            el = driver.find_element(
                By.XPATH if sel.startswith("//") else By.CSS_SELECTOR, sel)
            el.click(); time.sleep(1); return
        except:
            pass
