import csv, json, re
from datetime import datetime
from itemadapter import ItemAdapter

BROKER_KEYWORDS = ['agente','broker','asesor','realtor','inmobiliaria',
                   'inmobiliario','real estate agent','agency','agencia','corredor']

INVESTOR_KEYWORDS = ['inversionista','inversor','inversion','inversión','investor',
                     'investment','fondo','fund','capital','fideicomiso','crowdfunding',
                     'venture','private equity','grupo empresarial','holding']

WORK_KEYWORDS = ['en construccion','en construcción','under construction','obra nueva',
                 'proyecto','por construir','en preventa','pre-construccion','pre-venta',
                 'terreno con proyecto','lote con proyecto','desarrollo','fraccionamiento',
                 'villa','boutique hotel','hotel boutique','condo','residencial']

PITCH_BROKER = (
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

PITCH_INVESTOR = (
    "Hola {name},\n\n"
    "Soy de Recrea Construction, empresa constructora con amplia experiencia en proyectos "
    "residenciales, comerciales y de hospitalidad en {city} y toda la Riviera Maya.\n\n"
    "Estamos en búsqueda de socios inversionistas para co-desarrollar proyectos de alto "
    "rendimiento en la zona.\n\n"
    "💼 ¿Qué ofrecemos?\n"
    "✅ Proyectos con ROI comprobado en Riviera Maya\n"
    "✅ Villas residenciales, condos, hoteles boutique y comerciales\n"
    "✅ Gestión integral: permisos, construcción y entrega llave en mano\n"
    "✅ Transparencia total: reportes de avance y estados financieros\n"
    "✅ Equipo con más de 10 años en el mercado local\n\n"
    "¿Te interesa conocer nuestro portafolio de inversión? ¡Hablemos!\n\n"
    "Recrea Construction Riviera Maya"
)

PITCH_WORK = (
    "Hola {name},\n\n"
    "Somos Recrea Construction, constructora especializada en proyectos residenciales "
    "y comerciales en {city} y la Riviera Maya.\n\n"
    "Vimos su proyecto y nos gustaría presentarles una propuesta de construcción.\n\n"
    "🔨 ¿Por qué elegirnos?\n"
    "✅ Presupuesto detallado sin costo\n"
    "✅ Experiencia en villas, condos, hoteles boutique y comercio\n"
    "✅ Materiales de calidad y acabados de primer nivel\n"
    "✅ Cumplimiento de plazos y presupuesto garantizado\n"
    "✅ Permisos y trámites incluidos\n\n"
    "¿Podemos agendar una visita para presentar nuestra propuesta?\n\n"
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
        text = ' '.join(str(adapter.get(f, '') or '') for f in
                        ['businessName', 'contactName', 'category', 'tags', 'description']).lower()

        is_broker   = any(kw in text for kw in BROKER_KEYWORDS)
        is_investor = any(kw in text for kw in INVESTOR_KEYWORDS)
        is_work     = any(kw in text for kw in WORK_KEYWORDS)

        if is_broker:
            lead_type = 'broker'
        elif is_investor:
            lead_type = 'investor'
        elif is_work:
            lead_type = 'work'
        else:
            lead_type = 'general'

        adapter['isBroker']         = is_broker
        adapter['isInvestor']       = is_investor
        adapter['isWorkOpportunity'] = is_work
        adapter['leadType']         = lead_type
        adapter['scrapedAt']        = datetime.utcnow().isoformat()

        # Lead score
        has_email = bool(adapter.get('email'))
        has_phone = bool(adapter.get('phone'))
        is_dev    = any(k in text for k in ['developer', 'constructor', 'constructora'])
        if (is_broker or is_investor or is_work or is_dev) and has_phone:
            adapter['leadScore'] = 'High'
        elif has_phone or has_email:
            adapter['leadScore'] = 'Medium'
        else:
            adapter['leadScore'] = 'Low'

        # Personalized pitch
        name = adapter.get('contactName') or adapter.get('businessName') or 'Estimado'
        city = adapter.get('city') or 'Riviera Maya'
        if lead_type == 'investor':
            adapter['commissionPitch'] = PITCH_INVESTOR.format(name=name, city=city)
        elif lead_type == 'work':
            adapter['commissionPitch'] = PITCH_WORK.format(name=name, city=city)
        else:
            adapter['commissionPitch'] = PITCH_BROKER.format(name=name, city=city)

        # Notes / next action
        email = adapter.get('email', '')
        phone = adapter.get('phone', '')
        if lead_type == 'investor':
            if email:
                adapter['notes'] = f"Send investment portfolio to {email}"
            elif phone:
                adapter['notes'] = f"WhatsApp {phone} — present investment opportunity"
            else:
                adapter['notes'] = 'Find contact info for investment pitch'
        elif lead_type == 'work':
            if email:
                adapter['notes'] = f"Email {email} — offer construction quote"
            elif phone:
                adapter['notes'] = f"Call {phone} — ask about construction needs"
            else:
                adapter['notes'] = 'Find contact info for construction quote'
        elif is_broker:
            if email:
                adapter['notes'] = f"Send commission offer to {email}"
            elif phone:
                adapter['notes'] = f"WhatsApp {phone} — offer referral commission"
            else:
                adapter['notes'] = 'Find contact info for commission offer'
        else:
            if phone:
                adapter['notes'] = f"Call {phone}"
            else:
                adapter['notes'] = 'Find contact info'

        return item


CSV_HEADERS = ['leadScore', 'leadType', 'isBroker', 'isInvestor', 'isWorkOpportunity',
               'businessName', 'contactName', 'email', 'phone', 'website',
               'city', 'state', 'country', 'address', 'category', 'tags',
               'rating', 'description', 'source', 'googleMapsUrl', 'listingUrl',
               'notes', 'commissionPitch', 'scrapedAt']


class CsvExportPipeline:
    def open_spider(self, spider):
        self.file = open('recrea_leads.csv', 'w', newline='', encoding='utf-8')
        self.writer = csv.DictWriter(self.file, fieldnames=CSV_HEADERS, extrasaction='ignore')
        self.writer.writeheader()

    def close_spider(self, spider):
        self.file.close()
        spider.logger.info("CSV saved → recrea_leads.csv")

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
