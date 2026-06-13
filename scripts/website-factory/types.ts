export interface Business {
  name: string;
  placeId?: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  website?: string;
  photos: string[];
  services: string[];
  rating?: number;
  reviewCount?: number;
  hours?: string;
  category: string;
  slug: string;
  ownerName?: string;
}

export interface GeneratedSite {
  business: Business;
  html: string;
  slug: string;
}

export interface DeployedSite {
  business: Business;
  url: string;
  deployedAt: Date;
  smsSent: boolean;
}

export interface PipelineState {
  working: number;
  completed: DeployedSite[];
  failed: { name: string; error: string }[];
  startedAt: Date;
}

export interface PlacesResult {
  name: string;
  place_id: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  photos?: { photo_reference: string }[];
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: { weekday_text?: string[] };
}
