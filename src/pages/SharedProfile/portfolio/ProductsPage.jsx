import React, { useState } from 'react';
import { Package, X, ChevronRight, Tag, IndianRupee} from 'lucide-react';

/**
 * Products page — Magazine-style product gallery with image cards, modal detail, accent styling.
 * Reference: Gallery grid with product images, category badges, hover effects.
 */
export default function ProductsPage({ products, accentColor = '#F5A623' }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const productList = Array.isArray(products) ? products : [];

  return (
    <div pageTitle="Our Products" className="bg-white relative overflow-hidden" style={{ minHeight: '1123px' }}>
      {/* ===== HEADER ===== */}
      <div className="relative overflow-hidden">
        <div className="px-10 md:px-14 pt-10 pb-8 relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-[3px]" style={{ backgroundColor: accentColor }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">Our Portfolio</span>
          </div>
          <div className="flex items-end justify-between">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">
              Product <span className="italic font-light" style={{ color: accentColor }}>Showcase</span>
            </h2>
            <div className="text-right">
              <span className="text-3xl font-black" style={{ color: accentColor }}>{productList.length}</span>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Products</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== PRODUCT GRID ===== */}
      <div className="px-10 md:px-14 pb-8">
        {productList.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {productList.slice(0, 6).map((product, i) => {
              const name = typeof product === 'string' ? product : product?.name || product?.title || `Product ${i + 1}`;
              const desc = typeof product === 'object' ? (product?.description || product?.desc || '') : '';
              const price = typeof product === 'object' ? (product?.price || product?.rate || '') : '';
              const image = typeof product === 'object' ? (product?.image || product?.imageUrl || product?.photo || '') : '';
              const category = typeof product === 'object' ? (product?.category || product?.type || '') : '';

              return (
                <div key={i} className="group cursor-pointer"
                  onClick={() => setSelectedProduct(product)}>
                  {/* Image area */}
                  <div className="relative h-36 rounded-sm overflow-hidden mb-3 bg-gray-100">
                    {image ? (
                      <>
                        <img src={image} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center relative">
                        <svg className="absolute inset-0 w-full h-full opacity-5" viewBox="0 0 200 150">
                          <rect x="20" y="20" width="60" height="60" fill={accentColor} />
                          <circle cx="150" cy="80" r="40" fill={accentColor} />
                        </svg>
                        <Package size={24} className="text-gray-300" />
                      </div>
                    )}
                    {/* Number badge */}
                    <div className="absolute top-2 left-2 w-7 h-7 rounded-sm flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: accentColor }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    {/* Category */}
                    {category && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-white/90 rounded-sm">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-gray-600">{category}</span>
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <h4 className="font-bold text-xs text-gray-900 mb-0.5 group-hover:underline">{name}</h4>
                  {price && (
                    <div className="flex items-center gap-0.5">
                      <IndianRupee size={10} style={{ color: accentColor }} />
                      <span className="text-xs font-bold" style={{ color: accentColor }}>{price}</span>
                    </div>
                  )}
                  {desc && <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{desc}</p>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-sm">
            <Package size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-400 text-sm">Product showcase will appear here</p>
          </div>
        )}

        {productList.length > 6 && (
          <div className="mt-4 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              + {productList.length - 6} more products
            </span>
          </div>
        )}
      </div>

      {/* ===== PRODUCT DETAIL MODAL ===== */}
      {selectedProduct && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-8"
          onClick={() => setSelectedProduct(null)}>
          <div className="bg-white rounded-sm max-w-md w-full max-h-[90%] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="relative">
              {(selectedProduct?.image || selectedProduct?.imageUrl || selectedProduct?.photo) ? (
                <div className="h-48 overflow-hidden">
                  <img src={selectedProduct.image || selectedProduct.imageUrl || selectedProduct.photo}
                    alt={selectedProduct.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                  <Package size={40} className="text-white/40" />
                </div>
              )}
              <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
                onClick={() => setSelectedProduct(null)}>
                <X size={14} className="text-white" />
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-black text-gray-900 mb-1">
                {selectedProduct.name || selectedProduct.title || 'Product'}
              </h3>
              {selectedProduct.category && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-gray-100 mb-3">
                  <Tag size={8} className="text-gray-500" />
                  <span className="text-[9px] font-bold uppercase text-gray-500">{selectedProduct.category}</span>
                </div>
              )}
              {(selectedProduct.price || selectedProduct.rate) && (
                <p className="text-xl font-black mb-3" style={{ color: accentColor }}>
                  &#8377; {selectedProduct.price || selectedProduct.rate}
                </p>
              )}
              {(selectedProduct.description || selectedProduct.desc) && (
                <p className="text-gray-600 text-xs leading-relaxed">
                  {selectedProduct.description || selectedProduct.desc}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-2 flex">
        <div className="flex-1" style={{ backgroundColor: accentColor }} />
        <div className="flex-1 bg-gray-900" />
      </div>
    </div>
  );
}
