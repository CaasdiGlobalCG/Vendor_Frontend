import { describe, it, expect } from 'vitest';
import { getStates, getCitiesByState } from '../src/utils/statesAndCities';

describe('states and cities', () => {
  it('lists every state and union territory', () => {
    const states = getStates();
    expect(states.length).toBeGreaterThanOrEqual(36);
    ['Maharashtra', 'Tamil Nadu', 'Delhi', 'Ladakh', 'Lakshadweep', 'Tripura', 'Dadra and Nagar Haveli and Daman and Diu'].forEach((s) => expect(states).toContain(s));
  });

  it('has a full city list for the big states', () => {
    expect(getCitiesByState('Maharashtra').length).toBeGreaterThan(300);
    expect(getCitiesByState('Uttar Pradesh').length).toBeGreaterThan(400);
    expect(getCitiesByState('Tamil Nadu').length).toBeGreaterThan(250);
  });

  it('keeps the common spellings vendors already saved', () => {
    const karnataka = getCitiesByState('Karnataka');
    ['Bangalore', 'Bengaluru', 'Mysore', 'Mysuru'].forEach((c) => expect(karnataka).toContain(c));
    expect(getCitiesByState('Odisha')).toContain('Bhubaneswar');
    expect(getCitiesByState('Haryana')).toEqual(expect.arrayContaining(['Gurgaon', 'Gurugram']));
  });

  it('does not put a city under the wrong state', () => {
    expect(getCitiesByState('Karnataka')).not.toContain('Kochi');
    expect(getCitiesByState('Kerala')).toContain('Kochi');
  });

  it('has no duplicates and is sorted', () => {
    getStates().forEach((s) => {
      const list = getCitiesByState(s);
      expect(new Set(list.map((c) => c.toLowerCase())).size).toBe(list.length);
    });
  });

  it('returns an empty list for an unknown state', () => {
    expect(getCitiesByState('Nowhere')).toEqual([]);
  });
});
