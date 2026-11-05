import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { GlobalTravelPlanningService } from './global-travel-planning.service';

describe('GlobalTravelPlanningService', () => {
  const service = new GlobalTravelPlanningService();

  it('normalizes a safe travel intake without passport identifiers', () => {
    const trip = service.normalize({
      origin: 'Luanda, Angola',
      destination: 'Lisbon, Portugal',
      nationality: 'Angolan',
      residenceCountry: 'Angola',
      purpose: 'Tourism',
      departureDate: '2027-03-10',
      returnDate: '2027-03-20',
      passportExpiryDate: '2028-05-01',
      travellers: 2,
      budgetAmount: 1800,
      budgetCurrency: 'eur',
      preferredLanguage: 'pt-PT',
    });

    assert.equal(trip.destination, 'Lisbon, Portugal');
    assert.equal(trip.travellers, 2);
    assert.equal(trip.budgetCurrency, 'EUR');
    assert.equal(trip.passportExpiryDate, '2028-05-01');
  });

  it('rejects passport numbers, scans and unknown document fields', () => {
    assert.throws(
      () => service.normalize({
        destination: 'Lisbon',
        nationality: 'Angolan',
        residenceCountry: 'Angola',
        purpose: 'Tourism',
        passportNumber: 'A1234567',
      }),
      BadRequestException,
    );
  });

  it('rejects MRZ lines and identity/payment identifiers in free text', () => {
    assert.throws(
      () => service.normalize({
        destination: 'Lisbon',
        nationality: 'Angolan',
        residenceCountry: 'Angola',
        purpose: 'Tourism',
        tripDescription: 'P<AGOEXAMPLE<<PERSON<<<<<<<<<<<<<<<<<<<<',
      }),
      BadRequestException,
    );
    assert.throws(
      () => service.normalize({
        destination: 'Lisbon',
        nationality: 'Angolan',
        residenceCountry: 'Angola',
        purpose: 'Tourism',
        tripDescription: 'My passport number: A12345678',
      }),
      BadRequestException,
    );
  });

  it('rejects invalid date ranges, invalid dates and excessive traveller counts', () => {
    const base = {
      destination: 'Lisbon',
      nationality: 'Angolan',
      residenceCountry: 'Angola',
      purpose: 'Tourism',
    };
    assert.throws(() => service.normalize({ ...base, departureDate: '2027-02-30' }), BadRequestException);
    assert.throws(() => service.normalize({ ...base, departureDate: '2027-03-20', returnDate: '2027-03-10' }), BadRequestException);
    assert.throws(() => service.normalize({ ...base, departureDate: '2027-03-20', passportExpiryDate: '2027-03-19' }), BadRequestException);
    assert.throws(() => service.normalize({ ...base, travellers: 21 }), BadRequestException);
  });

  it('builds a planning prompt with the normalized trip facts', () => {
    const trip = service.normalize({
      destination: 'Lisbon',
      nationality: 'Angolan',
      residenceCountry: 'Angola',
      purpose: 'Business meeting',
    });
    const prompt = service.toPrompt(trip);

    assert.match(prompt, /official-source checks/);
    assert.match(prompt, /Respond in the preferred language: en/);
    assert.match(prompt, /Lisbon/);
    assert.match(prompt, /Do not request passport numbers/);
  });
});
