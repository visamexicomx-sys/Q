import type { Business, PlacesResult } from './types.ts';

const PLACES_API = 'https://maps.googleapis.com/maps/api/place';

export async function findBusinessesWithoutWebsites(
  location: string,
  category: string,
  limit = 20
): Promise<Business[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY not set');

  const query = encodeURIComponent(`${category} in ${location}`);
  const searchUrl = `${PLACES_API}/textsearch/json?query=${query}&key=${key}`;

  const response = await fetch(searchUrl);
  const data = (await response.json()) as { results: PlacesResult[]; status: string };

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API error: ${data.status}`);
  }

  const businesses: Business[] = [];

  for (const result of data.results.slice(0, limit * 3)) {
    if (result.website) continue; // already has a website — skip

    const details = await getPlaceDetails(result.place_id, key);
    if (!details || details.website) continue; // double-check

    const business = buildBusiness(details, category);
    businesses.push(business);

    if (businesses.length >= limit) break;
  }

  return businesses;
}

async function getPlaceDetails(placeId: string, key: string): Promise<PlacesResult | null> {
  const fields = [
    'name',
    'place_id',
    'formatted_address',
    'formatted_phone_number',
    'website',
    'photos',
    'types',
    'rating',
    'user_ratings_total',
    'opening_hours',
  ].join(',');

  const url = `${PLACES_API}/details/json?place_id=${placeId}&fields=${fields}&key=${key}`;
  const response = await fetch(url);
  const data = (await response.json()) as { result?: PlacesResult; status: string };

  if (data.status !== 'OK') return null;
  return data.result ?? null;
}

export function getPhotoUrl(photoReference: string, key: string, maxWidth = 800): string {
  return `${PLACES_API}/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${key}`;
}

function buildBusiness(place: PlacesResult, category: string): Business {
  const key = process.env.GOOGLE_PLACES_API_KEY!;
  const parts = place.formatted_address.split(',');
  const city = parts.length > 1 ? parts[parts.length - 2].trim() : parts[0].trim();

  const name = place.name;
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  const photos = (place.photos ?? []).slice(0, 6).map((p) => getPhotoUrl(p.photo_reference, key));

  const services = inferServices(category, place.types ?? []);

  return {
    name,
    placeId: place.place_id,
    address: place.formatted_address,
    city,
    phone: place.formatted_phone_number,
    photos,
    services,
    rating: place.rating,
    reviewCount: place.user_ratings_total,
    hours: place.opening_hours?.weekday_text?.join(' | '),
    category,
    slug,
  };
}

function inferServices(category: string, types: string[]): string[] {
  const maps: Record<string, string[]> = {
    plumbing: [
      'Pipe Repair & Installation',
      'Drain Cleaning',
      'Boiler Servicing',
      'Emergency Callouts',
      'Bathroom Fitting',
    ],
    roofing: [
      'Roof Repairs',
      'New Roof Installation',
      'Guttering',
      'Flat Roofing',
      'Emergency Repairs',
    ],
    electrical: [
      'Rewiring',
      'Fuse Board Upgrades',
      'EV Charger Installation',
      'PAT Testing',
      'Emergency Electrician',
    ],
    cleaning: [
      'Domestic Cleaning',
      'End of Tenancy',
      'Carpet Cleaning',
      'Office Cleaning',
      'Deep Cleaning',
    ],
    landscaping: [
      'Garden Design',
      'Lawn Care',
      'Tree Surgery',
      'Patio & Decking',
      'Garden Clearance',
    ],
    plastering: ['Plastering & Rendering', 'Coving', 'Dry Lining', 'Artex Removal', 'Skimming'],
    painting: [
      'Interior Painting',
      'Exterior Painting',
      'Wallpapering',
      'Spraying',
      'Commercial Decorating',
    ],
    carpentry: [
      'Bespoke Joinery',
      'Door Fitting',
      'Kitchen Installation',
      'Loft Conversions',
      'Decking',
    ],
  };

  const cat = category.toLowerCase();
  for (const [key, services] of Object.entries(maps)) {
    if (cat.includes(key)) return services;
  }

  return [
    'Professional Services',
    'Free Quotes',
    'Local & Reliable',
    'Fully Insured',
    'Same Day Available',
  ];
}
