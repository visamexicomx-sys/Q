#!/usr/bin/env python3
"""
Run all Recrea Construction lead scrapers sequentially.
Outputs: recrea_leads.csv + recrea_leads.json
"""
import subprocess, sys, os

SPIDERS = ["inmuebles24", "lamudi", "vivanuncios", "propiedades", "google_maps"]

os.chdir(os.path.dirname(os.path.abspath(__file__)))

print("=" * 55)
print("  RECREA CONSTRUCTION — SCRAPY LEAD SCRAPER")
print("  Riviera Maya Broker & Developer Leads")
print("=" * 55)

for spider in SPIDERS:
    print(f"\n[*] Running spider: {spider}")
    result = subprocess.run(
        [sys.executable, "-m", "scrapy", "crawl", spider,
         "--set", "LOG_LEVEL=WARNING"],
        capture_output=False
    )
    if result.returncode != 0:
        print(f"  [!] {spider} finished with errors (continuing)")
    else:
        print(f"  [✓] {spider} done")

print("\n" + "=" * 55)
print("  DONE — check recrea_leads.csv and recrea_leads.json")
print("=" * 55)
