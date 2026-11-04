/**
 * What a workspace RFQ stores as its description: plain labelled lines, never JSON.
 */
import { describe, it, expect } from 'vitest';
import { describeRfq } from '../src/utils/rfqDescription.js';

const form = {
  workspaceName: 'BMW - Collaborative Workspace',
  rfqType: 'procurement-rfq',
  productDetails: { title: 'Quote for MacBook Charger', category: 'Electronics & Electrical', productName: 'MacBook Charger', productDescription: 'A MacBook Charger of 45 W. Supporting high speed charging', technicalSpecifications: '', brandPreference: 'Apple' },
  quantityPricing: { quantity: '30', quantityUnit: 'pieces', budgetMin: '', budgetMax: '', currency: 'INR', pricingType: 'negotiable' },
  tradeLogistics: { incoterm: 'EXW', deliveryLocation: 'Here', requiredByDate: '2026-10-14', shippingMethod: 'road', packagingRequirements: '' },
  supplierRequirements: { minimumExperienceYears: '', minimumRating: '', requiredCertifications: '', preferredRegions: '', paymentTerms: '30% Advance', warrantyRequirement: '' },
  attachmentsAndNotes: { notes: '', attachmentNames: [] },
  submittedBy: { name: 'Dhanush', email: 'dsb3072002@gmail.com', vendorId: 'DSB-260907-000' },
};

describe('a workspace RFQ description', () => {
  it('is labelled lines, with no JSON in it', () => {
    const out = describeRfq(form);
    expect(out).not.toMatch(/[{}"]/);
    expect(out.startsWith('Quote for MacBook Charger\n\nPRODUCT\nName: MacBook Charger')).toBe(true);
    expect(out).toMatch(/Required by: 14 Oct 2026/);
    expect(out).toMatch(/Quantity: 30 pieces/);
    expect(out).toMatch(/Requested by|REQUESTED BY/);
  });

  it('leaves out what was not filled in', () => {
    const out = describeRfq(form);
    expect(out).not.toMatch(/Technical specifications|Packaging|Budget|Warranty|NOTES/);
  });

  it('shows a budget range with its currency, and attachments by name', () => {
    const out = describeRfq({
      ...form,
      quantityPricing: { ...form.quantityPricing, budgetMin: '1000', budgetMax: '2500' },
      attachmentsAndNotes: { notes: 'Genuine only', attachmentNames: ['spec.pdf', 'photo.png'] },
    });
    expect(out).toMatch(/Budget: 1,000 – 2,500 INR/);
    expect(out).toMatch(/Notes: Genuine only/);
    expect(out).toMatch(/Attachments: spec\.pdf, photo\.png/);
  });

  it('copes with a form that is almost empty', () => {
    expect(describeRfq({})).toBe('');
    expect(describeRfq({ productDetails: { productName: 'Cable' } })).toBe('PRODUCT\nName: Cable');
  });
});
