/**
 * The marketplace drawer: browse, order, or ask for a quote without leaving the
 * project, and that what is ordered is tied to the project exactly once.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';

vi.mock('../src/components/Marketplace/marketplaceApi.js', async (importOriginal) => ({
  ...(await importOriginal()),
  isMarketplaceConfigured: vi.fn(),
  fetchProducts: vi.fn(),
  fetchCart: vi.fn(),
  addToCart: vi.fn(),
  setCartQuantity: vi.fn(),
  removeFromCart: vi.fn(),
  checkout: vi.fn(),
  getBuyerProfile: vi.fn(),
  ensureBuyerProfile: vi.fn(),
  registerOrder: vi.fn(),
}));

import * as api from '../src/components/Marketplace/marketplaceApi.js';
import MarketplaceDrawer from '../src/components/Marketplace/MarketplaceDrawer.jsx';
import { toProduct } from '../src/components/Marketplace/marketplaceApi.js';

afterEach(() => cleanup());

const product = (over = {}) => ({
  id: 'P-1', name: 'OPC 53 cement', brand: 'Ultra', category: 'Cement', description: 'Bagged', image: null,
  minPrice: 290, maxPrice: 320, unit: 'bags', moq: 10, ...over,
});

const mount = async (props = {}, setup = {}) => {
  api.isMarketplaceConfigured.mockReturnValue(setup.configured ?? true);
  api.fetchProducts.mockResolvedValue(setup.products ?? [product(), product({ id: 'P-2', name: 'River sand', category: 'Aggregates', minPrice: 1800, maxPrice: 1800, unit: 'm3', moq: 1 }), product({ id: 'P-3', name: 'Custom hardware', category: 'Hardware', minPrice: null, maxPrice: null })]);
  api.fetchCart.mockResolvedValue(setup.cart ?? { items: [], subtotal: 0 });
  api.getBuyerProfile.mockResolvedValue(setup.profile ?? { linked: true, clientId: 'C-1', profileType: 'vendor_buyer' });
  const onRequestQuote = vi.fn();
  const onOpenOrders = vi.fn();
  const onClose = vi.fn();
  const onOpenFullMarketplace = vi.fn();
  render(
    <MarketplaceDrawer
      isOpen
      onClose={onClose}
      workspaceId="ws-1"
      workspaceTitle="Tower A fit-out"
      onRequestQuote={onRequestQuote}
      onOpenOrders={onOpenOrders}
      onOpenFullMarketplace={onOpenFullMarketplace}
      {...props}
    />
  );
  return { onRequestQuote, onOpenOrders, onClose, onOpenFullMarketplace };
};

beforeEach(() => {
  vi.clearAllMocks();
  api.addToCart.mockResolvedValue({});
  api.registerOrder.mockResolvedValue({ order: {} });
});

describe('browsing', () => {
  it('says which project it is ordering for', async () => {
    await mount();
    expect(await screen.findByText('Ordering for Tower A fit-out')).toBeTruthy();
    expect(await screen.findByText('OPC 53 cement')).toBeTruthy();
  });

  it('narrows by category, and by search', async () => {
    await mount();
    await screen.findByText('OPC 53 cement');
    fireEvent.click(screen.getByRole('button', { name: /^Aggregates/ }));
    expect(screen.queryByText('OPC 53 cement')).toBeNull();
    expect(screen.getByText('River sand')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(/Search materials/), { target: { value: 'sand' } });
    await waitFor(() => expect(api.fetchProducts).toHaveBeenCalledWith('sand'));
  });

  it('a product with no listed price can only be quoted, never ordered', async () => {
    await mount();
    const card = (await screen.findByText('Custom hardware')).closest('li');
    expect(within(card).queryByRole('button', { name: 'Add to order' })).toBeNull();
    expect(within(card).getByRole('button', { name: 'Request quote' })).toBeTruthy();
    expect(within(card).getByText('Price on request')).toBeTruthy();
  });

  it('starts quantity at the minimum order and will not go below it', async () => {
    await mount();
    const card = (await screen.findByText('OPC 53 cement')).closest('li');
    const qty = within(card).getByLabelText('Quantity of OPC 53 cement');
    expect(qty.value).toBe('10');
    fireEvent.click(within(card).getByLabelText('Fewer OPC 53 cement'));
    expect(qty.value).toBe('10');
    fireEvent.click(within(card).getByLabelText('More OPC 53 cement'));
    expect(qty.value).toBe('11');
  });

  it('asking for a quote hands the product to the RFQ form', async () => {
    const { onRequestQuote } = await mount();
    const card = (await screen.findByText('OPC 53 cement')).closest('li');
    fireEvent.click(within(card).getByRole('button', { name: 'Request quote' }));
    expect(onRequestQuote).toHaveBeenCalledWith(expect.objectContaining({ productName: 'OPC 53 cement', category: 'Cement', quantity: 10, unit: 'bags' }));
  });

  it('an empty search offers a quote for what was typed', async () => {
    const { onRequestQuote } = await mount({}, { products: [] });
    fireEvent.change(screen.getByPlaceholderText(/Search materials/), { target: { value: 'teak veneer' } });
    api.fetchProducts.mockResolvedValue([]);
    const button = await screen.findByRole('button', { name: /Request a quote for “teak veneer”/ });
    fireEvent.click(button);
    expect(onRequestQuote).toHaveBeenCalledWith({ productName: 'teak veneer' });
  });

  it('shows a load failure with a retry, not an empty shelf', async () => {
    api.isMarketplaceConfigured.mockReturnValue(true);
    api.fetchProducts.mockRejectedValueOnce(new Error('Could not reach the marketplace'));
    api.fetchCart.mockResolvedValue({ items: [], subtotal: 0 });
    api.getBuyerProfile.mockResolvedValue({ linked: true });
    render(<MarketplaceDrawer isOpen onClose={() => {}} workspaceId="ws-1" />);
    expect(await screen.findByText('Could not reach the marketplace')).toBeTruthy();
    api.fetchProducts.mockResolvedValue([product()]);
    fireEvent.click(screen.getByText('Try again'));
    expect(await screen.findByText('OPC 53 cement')).toBeTruthy();
  });

  it('when the marketplace is not connected it says so and still offers a quote', async () => {
    const { onRequestQuote } = await mount({}, { configured: false });
    expect(screen.getByText(/not connected to the workspace yet/)).toBeTruthy();
    expect(api.fetchProducts).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Request a quote' }));
    expect(onRequestQuote).toHaveBeenCalled();
  });
});

describe('the buyer profile', () => {
  it('is made the first time a vendor adds something, before it goes in the cart', async () => {
    api.ensureBuyerProfile.mockResolvedValue({ linked: true, clientId: 'vb-1', profileType: 'vendor_buyer' });
    const order = [];
    api.ensureBuyerProfile.mockImplementation(async () => { order.push('profile'); return { linked: true, profileType: 'vendor_buyer' }; });
    api.addToCart.mockImplementation(async () => { order.push('cart'); return {}; });
    await mount({}, { profile: { linked: false } });
    const card = (await screen.findByText('OPC 53 cement')).closest('li');
    fireEvent.click(within(card).getByRole('button', { name: 'Add to order' }));
    await waitFor(() => expect(api.addToCart).toHaveBeenCalledWith('P-1', 10));
    expect(order).toEqual(['profile', 'cart']);
  });

  it('is not made again when the vendor already has one', async () => {
    await mount({}, { profile: { linked: true, clientId: 'C-9', profileType: 'client' } });
    const card = (await screen.findByText('OPC 53 cement')).closest('li');
    fireEvent.click(within(card).getByRole('button', { name: 'Add to order' }));
    await waitFor(() => expect(api.addToCart).toHaveBeenCalled());
    expect(api.ensureBuyerProfile).not.toHaveBeenCalled();
  });

  it('the full marketplace link is only for vendors who already have a real client profile', async () => {
    await mount({}, { profile: { linked: true, clientId: 'vb-1', profileType: 'vendor_buyer' } });
    await screen.findByText('OPC 53 cement');
    expect(screen.queryByText(/Open the full marketplace site/)).toBeNull();
    cleanup();
    await mount({}, { profile: { linked: true, clientId: 'C-9', profileType: 'client' } });
    await screen.findByText('OPC 53 cement');
    expect(screen.getByText(/Open the full marketplace site/)).toBeTruthy();
  });
});

describe('placing an order', () => {
  const withItems = { cart: { items: [{ productId: 'P-1', name: 'OPC 53 cement', quantity: 10, unitPrice: 290, lineTotal: 2900 }], subtotal: 2900 } };
  const toCart = async () => {
    await screen.findByText('OPC 53 cement');
    fireEvent.click(screen.getByRole('tab', { name: /Your order/ }));
    await screen.findByText('Where should it be delivered?');
  };
  const fillAddress = () => fireEvent.change(screen.getByPlaceholderText(/Site name, street/), { target: { value: 'Tower A, MG Road, Pune 411001' } });

  it('needs a real address before it can be placed', async () => {
    await mount({}, withItems);
    await toCart();
    const place = screen.getByRole('button', { name: 'Place order' });
    expect(place.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText(/Site name, street/), { target: { value: 'Pune' } });
    expect(place.disabled).toBe(true);
    fillAddress();
    expect(place.disabled).toBe(false);
  });

  it('asks to confirm, then places the order and ties it to this project', async () => {
    api.checkout.mockResolvedValue({ marketplaceOrderId: 'MK-55' });
    const { onOpenOrders } = await mount({ taskId: 't1', subtaskId: 's1' }, withItems);
    await toCart();
    fillAddress();
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
    expect(api.checkout).not.toHaveBeenCalled();
    expect(screen.getByText(/Place this order for ₹2,900\?/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, place order' }));
    await waitFor(() => expect(api.registerOrder).toHaveBeenCalledWith({ marketplaceOrderId: 'MK-55', workspaceId: 'ws-1', taskId: 't1', subtaskId: 's1' }));
    expect(await screen.findByText('Order placed')).toBeTruthy();
    expect(api.checkout).toHaveBeenCalledWith({ address: 'Tower A, MG Road, Pune 411001' });
    fireEvent.click(screen.getByRole('button', { name: 'See in Orders' }));
    expect(onOpenOrders).toHaveBeenCalled();
  });

  it('a refused checkout shows why and ties nothing to the project', async () => {
    api.checkout.mockRejectedValue(new Error('One item is out of stock'));
    await mount({}, withItems);
    await toCart();
    fillAddress();
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, place order' }));
    expect(await screen.findByText('One item is out of stock')).toBeTruthy();
    expect(api.registerOrder).not.toHaveBeenCalled();
  });

  it('if the order is placed but cannot be tied to the project, retrying never orders twice', async () => {
    api.checkout.mockResolvedValue({ marketplaceOrderId: 'MK-77' });
    api.registerOrder.mockRejectedValueOnce(new Error('Server busy'));
    await mount({}, withItems);
    await toCart();
    fillAddress();
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, place order' }));
    expect(await screen.findByText(/Your order was placed/)).toBeTruthy();
    expect(screen.getByText(/Server busy/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add to this project' }));
    expect(await screen.findByText('Order placed')).toBeTruthy();
    expect(api.checkout).toHaveBeenCalledTimes(1);
    expect(api.registerOrder).toHaveBeenCalledTimes(2);
    expect(api.registerOrder).toHaveBeenLastCalledWith(expect.objectContaining({ marketplaceOrderId: 'MK-77' }));
  });

  it('an empty order points back to browsing', async () => {
    await mount();
    await screen.findByText('OPC 53 cement');
    fireEvent.click(screen.getByRole('tab', { name: /Your order/ }));
    expect(await screen.findByText('Nothing in your order yet')).toBeTruthy();
  });

  it('a vendor with no profile yet simply has an empty order, not an error', async () => {
    api.isMarketplaceConfigured.mockReturnValue(true);
    api.fetchProducts.mockResolvedValue([product()]);
    api.getBuyerProfile.mockResolvedValue({ linked: false });
    api.fetchCart.mockRejectedValue(Object.assign(new Error('Client profile missing.'), { status: 403 }));
    render(<MarketplaceDrawer isOpen onClose={() => {}} workspaceId="ws-1" />);
    await screen.findByText('OPC 53 cement');
    fireEvent.click(screen.getByRole('tab', { name: /Your order/ }));
    expect(await screen.findByText('Nothing in your order yet')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('the drawer itself', () => {
  it('closes on Escape', async () => {
    const { onClose } = await mount();
    await screen.findByText('OPC 53 cement');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing when closed', () => {
    api.isMarketplaceConfigured.mockReturnValue(true);
    const { container } = render(<MarketplaceDrawer isOpen={false} onClose={() => {}} workspaceId="ws-1" />);
    expect(container.firstChild).toBeNull();
  });
});

describe('reading a marketplace product', () => {
  it('uses only the prices the marketplace chose to expose', () => {
    const p = toProduct({ productId: 'P-9', productName: 'Rebar', minPricePerUnit: 62000, maxPricePerUnit: 64000, supplyUnit: 'tonne', minOrderQuantity: 5, images: ['x.png'], brand: 'Tata', productCategory: 'Steel' });
    expect(p).toMatchObject({ id: 'P-9', name: 'Rebar', minPrice: 62000, maxPrice: 64000, unit: 'tonne', moq: 5, image: 'x.png', category: 'Steel' });
  });

  it('a product with no exposed price has none, and is not given a default', () => {
    const p = toProduct({ productId: 'P-10', productName: 'Hardware' });
    expect(p.minPrice).toBeNull();
    expect(p.maxPrice).toBeNull();
    expect(p.moq).toBe(1);
  });

  it('ignores a row with no id', () => {
    expect(toProduct({ productName: 'x' })).toBeNull();
  });
});
