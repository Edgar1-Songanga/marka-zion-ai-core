import { BadRequestException, Injectable } from '@nestjs/common';

export interface GlobalTravelIntake {
  readonly origin?: string;
  readonly destination: string;
  readonly nationality: string;
  readonly residenceCountry: string;
  readonly purpose: string;
  readonly departureDate?: string;
  readonly returnDate?: string;
  readonly passportExpiryDate?: string;
  readonly travellers: number;
  readonly budgetAmount?: number;
  readonly budgetCurrency?: string;
  readonly preferredLanguage: string;
  readonly tripDescription?: string;
}

const ALLOWED_FIELDS = new Set([
  'origin',
  'destination',
  'nationality',
  'residenceCountry',
  'purpose',
  'departureDate',
  'returnDate',
  'passportExpiryDate',
  'travellers',
  'budgetAmount',
  'budgetCurrency',
  'preferredLanguage',
  'tripDescription',
]);

const SENSITIVE_FIELD_PATTERN =
  /passport(number|_number|scan|_scan|image|_image|mrz|_mrz)|document(number|_number|scan|_scan)|visa(number|_number)|card(number|_number)|birth(date|_date)|national.?id/i;

function requiredText(value: unknown, field: string, max = 120): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new BadRequestException(`${field} is required and must be at most ${max} characters`);
  }
  return value.trim();
}

function optionalDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) {
    throw new BadRequestException(`${field} must use YYYY-MM-DD`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException(`${field} is not a valid calendar date`);
  }
  return value;
}

@Injectable()
export class GlobalTravelPlanningService {
  normalize(input: unknown): GlobalTravelIntake {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('Travel details must be a JSON object');
    }

    const data = input as Record<string, unknown>;
    for (const key of Object.keys(data)) {
      if (SENSITIVE_FIELD_PATTERN.test(key)) {
        throw new BadRequestException('Passport numbers, document scans and identity numbers must never be sent to the travel planning endpoint.');
      }
      if (!ALLOWED_FIELDS.has(key)) {
        throw new BadRequestException(`Unsupported travel field: ${key}`);
      }
    }

    const departureDate = optionalDate(data.departureDate, 'departureDate');
    const returnDate = optionalDate(data.returnDate, 'returnDate');
    const passportExpiryDate = optionalDate(data.passportExpiryDate, 'passportExpiryDate');
    if (departureDate && returnDate && returnDate < departureDate) {
      throw new BadRequestException('returnDate must be on or after departureDate');
    }

    const travellers = data.travellers === undefined ? 1 : Number(data.travellers);
    if (!Number.isInteger(travellers) || travellers < 1 || travellers > 20) {
      throw new BadRequestException('travellers must be an integer between 1 and 20');
    }

    const budgetAmount = data.budgetAmount === undefined || data.budgetAmount === null
      ? undefined
      : Number(data.budgetAmount);
    if (budgetAmount !== undefined && (!Number.isFinite(budgetAmount) || budgetAmount < 0 || budgetAmount > 1000000000)) {
      throw new BadRequestException('budgetAmount must be a non-negative finite amount');
    }

    const budgetCurrency = data.budgetCurrency === undefined
      ? undefined
      : requiredText(data.budgetCurrency, 'budgetCurrency', 3).toUpperCase();
    if (budgetCurrency && !/^[A-Z]{3}$/.test(budgetCurrency)) {
      throw new BadRequestException('budgetCurrency must be a 3-letter currency code');
    }

    const tripDescription = data.tripDescription === undefined
      ? undefined
      : requiredText(data.tripDescription, 'tripDescription', 2000);
    const containsMrz = tripDescription?.split(/\\r?\\n/).some((line) => /^[A-Z0-9<]{25,}$/.test(line.trim())) ?? false;
    const containsSensitiveIdentifier = tripDescription !== undefined && (
      /\\bpassport\\s*(?:number|no\\.?|#)\\s*[:#-]?\\s*[A-Z0-9-]{5,}/i.test(tripDescription)
      || /\\b(?:national\\s+)?id\\s*(?:number|no\\.?|#)\\s*[:#-]?\\s*[A-Z0-9-]{5,}/i.test(tripDescription)
      || /(?:\\d[ -]?){13,19}/.test(tripDescription)
    );
    if (containsMrz || containsSensitiveIdentifier) {
      throw new BadRequestException('Do not include passport, MRZ, identity or payment-card data in tripDescription.');
    }

    return {
      origin: data.origin === undefined ? undefined : requiredText(data.origin, 'origin'),
      destination: requiredText(data.destination, 'destination'),
      nationality: requiredText(data.nationality, 'nationality'),
      residenceCountry: requiredText(data.residenceCountry, 'residenceCountry'),
      purpose: requiredText(data.purpose, 'purpose'),
      departureDate,
      returnDate,
      passportExpiryDate,
      travellers,
      budgetAmount,
      budgetCurrency,
      preferredLanguage: data.preferredLanguage === undefined
        ? 'en'
        : requiredText(data.preferredLanguage, 'preferredLanguage', 12),
      tripDescription,
    };
  }

  toPrompt(trip: GlobalTravelIntake): string {
    return [
      'Prepare a practical international travel plan using only the information below.',
      'Return clear sections for entry/visa assessment, official-source checks, missing facts, documents checklist, transport/accommodation research requirements, itinerary outline, budget assumptions and next actions.',
      'Do not claim that live availability or official requirements were checked unless tools and evidence actually supplied them.',
      'Do not request passport numbers, scans, MRZ strings or payment details.',
      'Trip intake:',
      JSON.stringify(trip, null, 2),
    ].join('\\n\\n');
  }
}
