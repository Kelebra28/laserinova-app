"use client";

import { ShoppingCart } from "lucide-react";

interface ProductStat {
  name: string;
  category: string;
  price: number;
  discountedPrice?: number;
  rating: number;
  isSale?: boolean;
  imageColor: string;
}

export default function BestSellingMaterials({ products }: { products: ProductStat[] }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold text-gray-800">Servicios Más Cotizados</h3>
        <div className="flex gap-2">
           <button className="w-6 h-6 rounded flex items-center justify-center bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
             &larr;
           </button>
           <button className="w-6 h-6 rounded flex items-center justify-center bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
             &rarr;
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((product, i) => (
          <div key={i} className="border border-gray-100 rounded-2xl p-4 relative overflow-hidden group hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/10 transition-all text-center">
            {product.isSale && (
              <div className="absolute -right-6 top-4 bg-emerald-400 text-white text-[10px] font-black uppercase tracking-widest py-1 px-8 rotate-45 z-10">
                Top
              </div>
            )}
            
            <div className="h-28 w-full flex items-center justify-center mb-4 relative">
              {/* Decorative background shape */}
              <div className={`absolute inset-0 opacity-10 rounded-full blur-2xl ${product.imageColor}`} />
              <div className={`w-20 h-20 rounded-2xl rotate-12 shadow-md flex items-center justify-center text-white font-black text-2xl ${product.imageColor}`}>
                {product.name.charAt(0)}
              </div>
            </div>

            <h4 className="text-sm font-bold text-gray-900 mb-1 px-2 leading-tight h-10 line-clamp-2">{product.name}</h4>
            <p className="text-[10px] font-semibold text-gray-400 mb-3">{product.category}</p>
            
            <div className="flex items-center justify-center gap-2 mb-2">
               {product.discountedPrice ? (
                 <>
                   <span className="text-xs font-bold text-gray-400 line-through">${product.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                   <span className="text-sm font-black text-indigo-600">${product.discountedPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                 </>
               ) : (
                 <span className="text-sm font-black text-indigo-600">${product.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
               )}
            </div>

            <div className="flex justify-center gap-0.5 mb-4 text-yellow-400">
               {[...Array(5)].map((_, idx) => (
                 <svg key={idx} className={`w-3 h-3 ${idx < product.rating ? 'fill-current' : 'fill-gray-200'}`} viewBox="0 0 20 20">
                   <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                 </svg>
               ))}
            </div>

            <button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95">
               <ShoppingCart className="w-3.5 h-3.5" />
               Cotizar Ahora
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
