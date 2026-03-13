"""
Google Maps Spider — Riviera Maya Brokers & Developers
Uses scrapy-playwright to render JavaScript and extract business listings.
"""
import json
import re
import scrapy
from scrapy_playwright.page import PageMethod
from recrea_scrapy.items import LeadItem

LOCATIONS = [
    "Playa del Carmen", "Tulum", "Cancun", "Bacalar",
    "Puerto Morelos", "Akumal", "Holbox", "Cozumel", "Mahahual"
]

QUERIES = [
    # Brokers & agents
    "agente inmobiliario",
    "broker inmobiliario",
    "inmobiliaria",
    "real estate agent",
    # Developers & constructors
    "constructora",
    "desarrollador inmobiliario",
    "arquitecto",
    # Investors
    "inversionista inmobiliario",
    "fondo de inversion inmobiliaria",
    "real estate investor",
    "club de inversiones",
    # Work opportunities
    "proyecto en construccion",
    "villa en construccion",
    "desarrollo residencial",
    "hotel boutique construccion",
]

class GoogleMapsSpider(scrapy.Spider):
    name = "google_maps"
    custom_settings = {"DOWNLOAD_DELAY": 4, "CONCURRENT_REQUESTS": 1}

    def start_requests(self):
        for query in QUERIES:
            for loc in LOCATIONS:
                search_term = f"{query} {loc} Quintana Roo Mexico"
                url = (
                    f"https://www.google.com/maps/search/"
                    f"{search_term.replace(' ', '+')}/"
                    f"@20.6296,-87.0739,10z?hl=es"
                )
                yield scrapy.Request(
                    url,
                    callback=self.parse,
                    meta={
                        "playwright": True,
                        "playwright_context": "default",
                        "playwright_page_methods": [
                            PageMethod("wait_for_load_state", "networkidle"),
                            PageMethod(
                                "wait_for_selector",
                                'div[aria-label*="Resultados"], div[role="feed"], div.Nv2PK',
                                timeout=20000,
                            ),
                            # Scroll down to load more results
                            PageMethod("evaluate", "() => { const el = document.querySelector('div[role=\"feed\"]'); if(el) el.scrollTop = el.scrollHeight; }"),
                            PageMethod("wait_for_timeout", 2000),
                        ],
                        "query": query,
                        "location": loc,
                    },
                    errback=self.errback,
                )

    def parse(self, response):
        loc = response.meta["location"]

        # Try extracting from rendered page - Google Maps listing cards
        for block in response.css('div.Nv2PK, div[data-result-index], a[href*="/maps/place/"]'):
            name    = block.css('div.qBF1Pd::text, span.fontHeadlineSmall::text, h3::text').get('').strip()
            phone   = block.css('span[aria-label*="Teléfono"]::text, span[aria-label*="Phone"]::text').get('').strip()
            address = (
                block.css('span[aria-label*="Dirección"]::text, span[aria-label*="Address"]::text').get('') or
                block.css('div.W4Efsd span:last-child::text').get('')
            ).strip()
            rating  = block.css('span.MW4etd::text').get('').strip()
            cat     = block.css('span.W4Efsd:nth-child(2)::text, div.W4Efsd > span::text').get('').strip()
            maps_url = block.css('a::attr(href)').get('')

            if not name:
                continue

            item = LeadItem()
            item['source']       = 'Google Maps'
            item['businessName'] = name
            item['contactName']  = ''
            item['email']        = ''
            item['phone']        = phone
            item['website']      = ''
            item['address']      = address
            item['city']         = loc
            item['state']        = 'Quintana Roo'
            item['country']      = 'Mexico'
            item['category']     = cat
            item['rating']       = rating
            item['description']  = f"{cat} — {address}".strip(' — ')
            item['listingUrl']   = ''
            item['googleMapsUrl'] = maps_url if maps_url.startswith('http') else f"https://maps.google.com{maps_url}"
            item['tags']         = 'google-maps, riviera-maya'
            yield item

    def errback(self, failure):
        self.logger.error(f"[GoogleMaps] Request failed: {failure.request.url} — {failure.value}")
