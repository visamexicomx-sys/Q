#!/usr/bin/env python3
"""
Download leads from Apify runs, merge, classify, and save to CSV+JSON.
Usage: python3 download_leads.py <portals_dataset_id> <googlemaps_dataset_id>
"""
import sys, json, csv, re
from datetime import datetime
from urllib.request import urlopen, Request

import os
TOKEN = os.environ.get('APIFY_TOKEN', '')

BROKER_KW   = ['agente','broker','asesor','realtor','inmobiliaria','inmobiliario',
               'real estate agent','real estate broker','agency','agencia','corredor']
INVESTOR_KW = ['inversionista','inversor','inversion','inversión','investor','investment',
               'fondo','fund','capital','fideicomiso','crowdfunding','venture',
               'private equity','grupo empresarial','holding']
WORK_KW     = ['en construccion','en construcción','under construction','obra nueva',
               'proyecto','por construir','en preventa','pre-construccion','pre-venta',
               'terreno con proyecto','lote con proyecto','desarrollo','fraccionamiento',
               'villa','boutique hotel','hotel boutique','condo','residencial']

LOCATIONS = ['Playa del Carmen','Tulum','Cancun','Bacalar','Puerto Morelos',
             'Akumal','Holbox','Cozumel','Mahahual']

def fetch_dataset(dataset_id):
    url = f'https://api.apify.com/v2/datasets/{dataset_id}/items?token={TOKEN}&clean=true&limit=1000'
    with urlopen(Request(url, headers={'Accept':'application/json'}), timeout=30) as r:
        return json.loads(r.read())

def classify(item):
    text = ' '.join(str(item.get(f,'') or '') for f in
                    ['businessName','contactName','category','tags','description']).lower()
    is_broker   = any(k in text for k in BROKER_KW)
    is_investor = any(k in text for k in INVESTOR_KW)
    is_work     = any(k in text for k in WORK_KW)
    if is_broker:   lead_type = 'broker'
    elif is_investor: lead_type = 'investor'
    elif is_work:   lead_type = 'work'
    else:           lead_type = 'general'

    has_phone = bool(item.get('phone'))
    has_email = bool(item.get('email'))
    is_dev = any(k in text for k in ['developer','constructor','constructora'])
    if (is_broker or is_investor or is_work or is_dev) and has_phone:
        score = 'High'
    elif has_phone or has_email:
        score = 'Medium'
    else:
        score = 'Low'

    name = item.get('contactName') or item.get('businessName') or 'Estimado'
    city = item.get('city') or extract_city(item.get('address','')) or 'Riviera Maya'

    if lead_type == 'investor':
        pitch = PITCH_INVESTOR.format(name=name, city=city)
        if has_email: notes = f"Send investment portfolio to {item['email']}"
        elif has_phone: notes = f"WhatsApp {item['phone']} — present investment opportunity"
        else: notes = 'Find contact for investment pitch'
    elif lead_type == 'work':
        pitch = PITCH_WORK.format(name=name, city=city)
        if has_email: notes = f"Email {item['email']} — offer construction quote"
        elif has_phone: notes = f"Call {item['phone']} — ask about construction needs"
        else: notes = 'Find contact for construction quote'
    elif is_broker:
        pitch = PITCH_BROKER.format(name=name, city=city)
        if has_email: notes = f"Send commission offer to {item['email']}"
        elif has_phone: notes = f"WhatsApp {item['phone']} — offer referral commission"
        else: notes = 'Find contact for commission offer'
    else:
        pitch = PITCH_BROKER.format(name=name, city=city)
        if has_phone: notes = f"Call {item['phone']}"
        else: notes = 'Find contact info'

    return {**item,
            'leadScore': score, 'leadType': lead_type,
            'isBroker': is_broker, 'isInvestor': is_investor,
            'isWorkOpportunity': is_work,
            'commissionPitch': pitch, 'notes': notes,
            'scrapedAt': datetime.utcnow().isoformat()}

def extract_city(address):
    for loc in LOCATIONS:
        if loc.lower() in address.lower():
            return loc
    return ''

def normalize_gm(place):
    return {
        'source': 'Google Maps',
        'businessName': place.get('title',''),
        'contactName': '',
        'email': place.get('email','') or extract_email(place.get('description','')),
        'phone': re.sub(r'[^\d+\s\-()]','', place.get('phone','')).strip(),
        'website': place.get('website',''),
        'address': place.get('address',''),
        'city': extract_city(place.get('address','')),
        'state': 'Quintana Roo',
        'country': 'Mexico',
        'category': place.get('categoryName',''),
        'rating': place.get('totalScore',''),
        'reviewCount': place.get('reviewsCount',0),
        'googleMapsUrl': place.get('url',''),
        'description': place.get('description',''),
        'tags': infer_tags(place),
        'listingUrl': '',
    }

def extract_email(text):
    m = re.search(r'[\w.+-]+@[\w-]+\.[\w.]+', text or '')
    return m.group(0) if m else ''

def infer_tags(p):
    tags = []
    text = f"{p.get('title','')} {p.get('categoryName','')} {p.get('description','')}".lower()
    if 'construc' in text: tags.append('construction')
    if 'inmobili' in text or 'real estate' in text: tags.append('real-estate')
    if 'arquitect' in text: tags.append('architecture')
    if 'hotel' in text or 'resort' in text: tags.append('hospitality')
    if 'condo' in text or 'departamento' in text: tags.append('residential')
    if 'inversi' in text or 'invest' in text: tags.append('investor')
    return ', '.join(tags)

PITCH_BROKER = (
    "Hola {name},\n\nSoy de Recrea Construction, empresa constructora en {city} y la Riviera Maya.\n\n"
    "Te invitamos a nuestro programa de referidos: por cada cliente que construya con nosotros te damos una COMISIÓN COMPETITIVA.\n\n"
    "✅ Comisión atractiva ✅ Residencial/comercial/hoteles boutique ✅ Experiencia comprobada\n\n"
    "¿Tienes clientes que buscan construir? ¡Hablemos!\n\nRecrea Construction Riviera Maya"
)
PITCH_INVESTOR = (
    "Hola {name},\n\nSoy de Recrea Construction en {city}. Buscamos socios inversionistas para co-desarrollar proyectos de alto rendimiento.\n\n"
    "💼 ROI comprobado ✅ Llave en mano ✅ Transparencia total ✅ +10 años en Riviera Maya\n\n"
    "¿Te interesa nuestro portafolio?\n\nRecrea Construction Riviera Maya"
)
PITCH_WORK = (
    "Hola {name},\n\nSomos Recrea Construction en {city}. Vimos su proyecto y queremos presentar una propuesta de construcción.\n\n"
    "🔨 Presupuesto sin costo ✅ Acabados premium ✅ Plazos garantizados ✅ Permisos incluidos\n\n"
    "¿Agendamos una visita?\n\nRecrea Construction Riviera Maya"
)

CSV_COLS = ['leadScore','leadType','isBroker','isInvestor','isWorkOpportunity',
            'businessName','contactName','email','phone','website',
            'city','state','country','address','category','tags',
            'rating','reviewCount','description','source','googleMapsUrl','listingUrl',
            'notes','commissionPitch','scrapedAt']

if __name__ == '__main__':
    portals_id  = sys.argv[1] if len(sys.argv) > 1 else None
    gm_id       = sys.argv[2] if len(sys.argv) > 2 else None

    all_leads = []

    if portals_id:
        print(f'Fetching portals dataset {portals_id}...')
        items = fetch_dataset(portals_id)
        print(f'  {len(items)} raw portal leads')
        all_leads.extend(items)

    if gm_id:
        print(f'Fetching Google Maps dataset {gm_id}...')
        places = fetch_dataset(gm_id)
        print(f'  {len(places)} raw Google Maps places')
        all_leads.extend(normalize_gm(p) for p in places if p.get('title'))

    # Deduplicate
    seen = set()
    unique = []
    for lead in all_leads:
        key = f"{(lead.get('businessName','') or lead.get('contactName','')).lower().replace(' ','')}|{lead.get('city','').lower()}"
        if key not in seen:
            seen.add(key)
            unique.append(lead)
    print(f'  {len(unique)} unique leads after dedup (from {len(all_leads)})')

    # Classify & enrich
    enriched = [classify(l) for l in unique]

    # Stats
    by_type = {}
    for l in enriched:
        t = l.get('leadType','general')
        by_type[t] = by_type.get(t,0) + 1
    by_score = {}
    for l in enriched:
        s = l.get('leadScore','Low')
        by_score[s] = by_score.get(s,0) + 1
    print(f'\nLead breakdown by type:  {by_type}')
    print(f'Lead breakdown by score: {by_score}')

    # Save CSV
    with open('recrea_leads_final.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=CSV_COLS, extrasaction='ignore')
        w.writeheader()
        w.writerows(enriched)
    print(f'\n✅ Saved recrea_leads_final.csv ({len(enriched)} leads)')

    # Save JSON
    with open('recrea_leads_final.json', 'w', encoding='utf-8') as f:
        json.dump({
            'generatedAt': datetime.utcnow().isoformat(),
            'totalLeads': len(enriched),
            'business': 'Recrea Construction Riviera Maya',
            'byType': by_type,
            'byScore': by_score,
            'leads': enriched,
        }, f, ensure_ascii=False, indent=2)
    print(f'✅ Saved recrea_leads_final.json ({len(enriched)} leads)')
