import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllProducts } from "../../firebase/services/products";

function Shop() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const data = await getAllProducts();
      setProducts(data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const filtered = products.filter((p) => {
    if (p.stock <= 0) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Search bar */}
        <div className="relative mb-6">
          <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, category, description…"
            className="w-full pl-9 pr-9 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
              <i className="bi bi-x text-lg" />
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <i className="bi bi-search text-5xl mb-3" />
            <p className="text-lg">No products found for "<span className="text-gray-300">{query}</span>"</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filtered.map((product) => (
              <div
                key={product.id}
                onClick={() => navigate(`/user/product/${product.id}`)}
                className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1 hover:border-blue-500/50 transition-all duration-300 cursor-pointer"
              >
                <div className="relative overflow-hidden aspect-square bg-gray-900">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <i className="bi bi-image text-gray-600 text-4xl" />
                    </div>
                  )}
                  {product.stock < 10 && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold bg-yellow-500">
                      Only {product.stock} left
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-100 mb-1 line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                  </h3>
                  <p className="text-lg font-bold text-blue-400">
                    ${product.price}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}

export default Shop;