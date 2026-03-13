import csv, json, re
from datetime import datetime
from itemadapter import ItemAdapter

BROKER_KEYWORDS = ['agente','broker','asesor','realtor','inmobiliaria',
                   'inmobiliario','real estate agent','agency','agencia','corredor']

COMMISSION_PITCH_TEMPLATE = (
    "Hola {name},\n\n"
    "Soy de Recrea Construction, empresa constructora especializada en proyectos "
    "residenciales y comerciales en {city} y toda la Riviera Maya.\n\n"
    "Te invitamos a ser parte de nuestro programa de referidos: por cada cliente que "
    "nos refieras y concrete un proyecto de construcción, te ofrecemos una COMISIÓN "
    "COMPETITIVA sobre el valor total de la obra.\n\n"
    "✅ Comisión atractiva por referido\n"
    "✅ Proyectos residenciales, condos, hoteles boutique y comerciales\n"
    "✅ Empresa con experiencia comprobada en Riviera Maya\n"
    "✅ Acompañamiento completo durante todo el proyecto\n\n"
    "¿Tienes clientes que buscan construir en la zona? ¡Hablemos!\n\n"
    "Recrea Construction Riviera Maya"
)

class DeduplicatePipeline:
    def __init__(self):
        self.seen = set()

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        key = f"{adapter.get('businessName','')}{adapter.get('contactName','')}{adapter.get('city','')}".lower().replace(' ','')
        if key in self.seen:
            from scrapy.exceptions import DropItem
            raise DropItem(f"Duplicate: {key}")
        self.seen.add(key)
        return item

class BrokerDetectionPipeline:
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        text = ' '.join(str(adapter.get(f,'') or '') for f in
                        ['businessName','contactName','category','tags','description']).lower()
        is_broker = any(kw in text for kw in BROKER_KEYWORDS)
        adapter['isBroker'] = is_broker
        adapter['scrapedAt'] = datetime.utcnow().isoformat()

        # Lead score
        has_email   = bool(adapter.get('email'))
        has_phone   = bool(adapter.get('phone'))
        is_dev = any(k in text for k in ['developer','constructor','constructora'])
        if (is_broker or is_dev) and has_phone:
            adapter['leadScore'] = 'High'
        elif has_phone or has_email:
            adapter['leadScore'] = 'Medium'
        else:
            adapter['leadScore'] = 'Low'

        # Commission pitch for brokers
        name = adapter.get('contactName') or adapter.get('businessName') or 'Estimado asesor'
        city = adapter.get('city') or 'Riviera Maya'
        adapter['commissionPitch'] = COMMISSION_PITCH_TEMPLATE.format(name=name, city=city)

        # Notes
        if is_broker and has_email:
            adapter['notes'] = f"Send commission offer to {adapter['email']}"
        elif is_broker and has_phone:
            adapter['notes'] = f"WhatsApp {adapter['phone']} — offer referral commission"
        elif has_phone:
            adapter['notes'] = f"Call {adapter['phone']}"
        else:
            adapter['notes'] = 'Find contact info'

        return item

CSV_HEADERS = ['leadScore','isBroker','businessName','contactName','email','phone',
               'website','city','state','country','address','category','tags',
               'rating','description','source','googleMapsUrl','listingUrl',
               'notes','commissionPitch','scrapedAt']

class CsvExportPipeline:
    def open_spider(self, spider):
        self.file = open('recrea_leads.csv', 'w', newline='', encoding='utf-8')
        self.writer = csv.DictWriter(self.file, fieldnames=CSV_HEADERS, extrasaction='ignore')
        self.writer.writeheader()

    def close_spider(self, spider):
        self.file.close()
        spider.logger.info(f"CSV saved → recrea_leads.csv")

    def process_item(self, item, spider):
        self.writer.writerow(ItemAdapter(item).asdict())
        return item

class JsonExportPipeline:
    def open_spider(self, spider):
        self.items = []

    def close_spider(self, spider):
        with open('recrea_leads.json', 'w', encoding='utf-8') as f:
            json.dump({
                'generatedAt': datetime.utcnow().isoformat(),
                'totalLeads': len(self.items),
                'business': 'Recrea Construction Riviera Maya',
                'leads': self.items
            }, f, ensure_ascii=False, indent=2)
        spider.logger.info(f"JSON saved → recrea_leads.json ({len(self.items)} leads)")

    def process_item(self, item, spider):
        self.items.append(dict(ItemAdapter(item)))
        return item
