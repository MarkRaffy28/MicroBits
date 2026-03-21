import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import AnimatedTableRows from "../../react_bits/AnimatedTableRows";
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct as firebaseDeleteProduct,
} from "../../firebase/services/products";
import "../../styles/StyleSheet.css";

const truncate = (text, maxWords = 10) => {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  return words.length <= maxWords ? text : words.slice(0, maxWords).join(" ") + "...";
};

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

function Products() {
  const { addToast } = useToast();
  const { setPageTitle, setHeaderAction } = useOutletContext();

  useEffect(() => {
    setPageTitle("Products");
    setHeaderAction(
      <button
        className="bg-green-600 hover:bg-green-700 text-neutral-200 text-sm px-3 py-1 rounded transition-all duration-200 transform hover:scale-105"
        onClick={handleAddShow}
      >
        Add
      </button>
    );
    return () => { setPageTitle("Admin"); setHeaderAction(null); };
  }, []);

  /* ─── Modal state ─── */
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal,   setShowViewModal]   = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleAddClose    = () => { setShowAddModal(false);  setImagePreview(null); setImageFile(null); };
  const handleAddShow     = () =>   setShowAddModal(true);
  const handleEditClose   = () => { setShowEditModal(false); setImagePreview(null); setImageFile(null); };
  const handleEditShow    = (product) => {
    setSelectedProduct(product);
    setEditingProduct({ ...product });
    setImagePreview(product.image || null);
    setShowEditModal(true);
  };
  const handleDeleteClose = () => setShowDeleteModal(false);
  const handleDeleteShow  = (product) => { setSelectedProduct(product); setShowDeleteModal(true); };
  const handleViewClose   = () => setShowViewModal(false);
  const handleViewShow    = (product) => { setSelectedProduct(product); setShowViewModal(true); };

  /* ─── Product state ─── */
  const [products,       setProducts]       = useState([]);
  const [fetchingProducts, setFetchingProducts] = useState(true);

  /* ─── Per-operation loading state ─── */
  const [isAdding,   setIsAdding]   = useState(false);
  const [isEditing,  setIsEditing]  = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ─── Image state ─── */
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setFetchingProducts(true);
    try {
      const data = await getAllProducts();
      setProducts(data);
    } catch {
      addToast("Failed to fetch products.", "error");
    } finally {
      setFetchingProducts(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  /* ─── Add ─── */
  const blankProduct = { name: "", category: "", description: "", price: "", stock: "" };
  const [newProduct, setNewProduct] = useState(blankProduct);

  const addProduct = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const created = await createProduct(newProduct, imageFile);
      setProducts((prev) => [...prev, created]);
      setNewProduct(blankProduct);
      setImageFile(null);
      setImagePreview(null);
      handleAddClose();
      addToast(`"${created.name}" added successfully.`, "success");
    } catch (err) {
      addToast(err.message || "Failed to add product.", "error");
    } finally {
      setIsAdding(false);
    }
  };

  /* ─── Edit ─── */
  const [editingProduct, setEditingProduct] = useState(blankProduct);

  const editProduct = async (e) => {
    e.preventDefault();
    setIsEditing(true);
    try {
      const { id, image, ...fields } = editingProduct;
      const updated = await updateProduct(selectedProduct.id, fields, imageFile);
      setProducts((prev) => prev.map((p) => (p.id === selectedProduct.id ? updated : p)));
      setImageFile(null);
      setImagePreview(null);
      handleEditClose();
      addToast(`"${updated.name}" updated successfully.`, "success");
    } catch (err) {
      addToast(err.message || "Failed to update product.", "error");
    } finally {
      setIsEditing(false);
    }
  };

  /* ─── Delete ─── */
  const deleteProduct = async () => {
    setIsDeleting(true);
    try {
      await firebaseDeleteProduct(selectedProduct.id);
      setProducts((prev) => prev.filter((p) => p.id !== selectedProduct.id));
      handleDeleteClose();
      addToast(`"${selectedProduct.name}" deleted.`, "success");
    } catch {
      addToast("Failed to delete product.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  /* ─── Shared styles ─── */
  const modalOverlay = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn";
  const modalBox     = "bg-gray-900 rounded-lg w-full mx-4 lg:w-1/2 lg:mx-auto max-h-[90vh] overflow-y-auto animate-slideUp";
  const inputCls     = "w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white";
  const textareaCls  = "w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white resize-none";

  /* ─── Reusable image upload ─── */
  const ImageUpload = () => (
    <div className="mb-4">
      <label className="block text-sm text-gray-400 mb-2">Product Image</label>
      <div className="flex flex-col items-center">
        {imagePreview && (
          <img src={imagePreview} alt="Preview" loading="lazy" decoding="async"
            className="w-32 h-32 object-cover rounded mb-3" />
        )}
        <input type="file" accept="image/*" onChange={handleImageChange}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700"
        />
      </div>
    </div>
  );

  /* ─── Table rows ─── */
  const productRows = products.map((product) => (
    <>
      <td className="text-center px-4 py-3">{product.id}</td>
      <td className="text-center px-4 py-3">
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" decoding="async"
            className="w-16 h-16 object-cover rounded mx-auto" />
        ) : (
          <div className="w-16 h-16 bg-gray-700 rounded flex items-center justify-center mx-auto">
            <span className="text-gray-500 text-xs">No Image</span>
          </div>
        )}
      </td>
      <td className="text-center px-4 py-3">{product.name}</td>
      <td className="text-center px-4 py-3">{product.category}</td>
      <td className="text-center px-4 py-3 text-sm text-gray-300" title={product.description}>
        {truncate(product.description)}
      </td>
      <td className="text-center px-4 py-3">${product.price}</td>
      <td className="text-center px-4 py-3">{product.stock}</td>
      <td className="text-center px-4 py-3 whitespace-nowrap">
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded mr-2 transition-all duration-200 transform hover:scale-105"
          onClick={(e) => { e.stopPropagation(); handleViewShow(product); }}
        >
          <i className="bi bi-eye mr-1" />View
        </button>
        <button
          className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-sm px-3 py-1.5 rounded mr-2 transition-all duration-200 transform hover:scale-105"
          onClick={(e) => { e.stopPropagation(); handleEditShow(product); }}
        >
          <i className="bi bi-pencil mr-1" />Edit
        </button>
        <button
          className="bg-red-500 hover:bg-red-600 text-neutral-100 text-sm px-3 py-1.5 rounded transition-all duration-200 transform hover:scale-105"
          onClick={(e) => { e.stopPropagation(); handleDeleteShow(product); }}
        >
          <i className="bi bi-trash mr-[3px]" />Delete
        </button>
      </td>
    </>
  ));

  return (
    <>
      <div className="container mx-auto p-4">
        {fetchingProducts ? (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <Spinner />
            <span>Loading products...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="border-b-4 border-blue-600">
                <tr className="align-middle">
                  <th className="text-center px-4 py-3">ID</th>
                  <th className="text-center px-4 py-3">Image</th>
                  <th className="text-center px-4 py-3">Name</th>
                  <th className="text-center px-4 py-3">Category</th>
                  <th className="text-center px-4 py-3">Description</th>
                  <th className="text-center px-4 py-3">Price</th>
                  <th className="text-center px-4 py-3">Stock</th>
                  <th className="text-center px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatedTableRows items={productRows} />
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─────────── VIEW MODAL ─────────── */}
      {showViewModal && selectedProduct && (
        <div className={modalOverlay} onClick={handleViewClose}>
          <div className={modalBox} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold w-full text-center">PRODUCT DETAILS</h2>
              <button onClick={handleViewClose} className="hover:opacity-70 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6">
              <div className="flex justify-center mb-6">
                {selectedProduct.image ? (
                  <img src={selectedProduct.image} alt={selectedProduct.name} loading="lazy" decoding="async"
                    className="w-40 h-40 object-cover rounded-lg" />
                ) : (
                  <div className="w-40 h-40 bg-gray-700 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500 text-sm">No Image</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {[
                  { label: "ID",       value: selectedProduct.id },
                  { label: "Name",     value: selectedProduct.name },
                  { label: "Category", value: selectedProduct.category },
                  { label: "Price",    value: `$${selectedProduct.price}` },
                  { label: "Stock",    value: selectedProduct.stock },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-start gap-4 py-2 border-b border-gray-800">
                    <span className="text-gray-400 text-sm whitespace-nowrap">{label}</span>
                    <span className="text-white text-sm text-right">{value}</span>
                  </div>
                ))}
                <div className="py-2 border-b border-gray-800">
                  <span className="text-gray-400 text-sm block mb-2">Description</span>
                  <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedProduct.description || <span className="text-gray-500 italic">N/A</span>}
                  </p>
                </div>
              </div>
              <div className="flex justify-center mt-6 gap-3">
                <button onClick={handleViewClose}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded transition-all duration-200 transform hover:scale-105">
                  Close
                </button>
                <button onClick={() => { handleViewClose(); handleEditShow(selectedProduct); }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-6 py-2 rounded transition-all duration-200 transform hover:scale-105">
                  <i className="bi bi-pencil mr-1" />Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── ADD MODAL ─────────── */}
      {showAddModal && (
        <div className={modalOverlay} onClick={handleAddClose}>
          <div className={modalBox} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold w-full text-center">ADD PRODUCT</h2>
              <button onClick={handleAddClose} disabled={isAdding}
                className="hover:opacity-70 text-2xl leading-none transition-opacity duration-200 disabled:opacity-30">&times;</button>
            </div>
            <div className="p-4">
              <form onSubmit={addProduct}>
                <ImageUpload />
                <div className="mb-3 relative">
                  <input type="text" id="add_name" placeholder=" " value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    required className={inputCls} />
                  <label htmlFor="add_name" className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">Name</label>
                </div>
                <div className="mb-3 relative">
                  <input type="text" id="add_category" placeholder=" " value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    required className={inputCls} />
                  <label htmlFor="add_category" className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">Category</label>
                </div>
                <div className="mb-3 relative">
                  <textarea id="add_description" placeholder=" " rows={10} value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    required className={textareaCls} />
                  <label htmlFor="add_description" className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">Description</label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="mb-3 relative">
                    <input type="number" id="add_price" placeholder=" " value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      required className={inputCls} />
                    <label htmlFor="add_price" className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">Price</label>
                  </div>
                  <div className="mb-3 relative">
                    <input type="number" id="add_stock" placeholder=" " value={newProduct.stock}
                      onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                      required className={inputCls} />
                    <label htmlFor="add_stock" className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">Stock</label>
                  </div>
                </div>
                <div className="pt-2 flex justify-center gap-3">
                  <button type="button" onClick={handleAddClose} disabled={isAdding}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                    Cancel
                  </button>
                  <button type="submit" disabled={isAdding}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2">
                    {isAdding ? <><Spinner /> Adding...</> : "Add"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── EDIT MODAL ─────────── */}
      {showEditModal && (
        <div className={modalOverlay} onClick={handleEditClose}>
          <div className={modalBox} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold w-full text-center">EDIT PRODUCT</h2>
              <button onClick={handleEditClose} disabled={isEditing}
                className="hover:opacity-70 text-2xl leading-none transition-opacity duration-200 disabled:opacity-30">&times;</button>
            </div>
            <div className="p-4">
              <form onSubmit={editProduct}>
                <ImageUpload />
                <div className="mb-3 relative">
                  <input type="text" id="edit_name" placeholder=" " value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    required className={inputCls} />
                  <label htmlFor="edit_name" className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">Name</label>
                </div>
                <div className="mb-3 relative">
                  <input type="text" id="edit_category" placeholder=" " value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    required className={inputCls} />
                  <label htmlFor="edit_category" className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">Category</label>
                </div>
                <div className="mb-3 relative">
                  <textarea id="edit_description" placeholder=" " rows={10} value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    required className={textareaCls} />
                  <label htmlFor="edit_description" className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">Description</label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="mb-3 relative">
                    <input type="number" id="edit_price" placeholder=" " value={editingProduct.price}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                      required className={inputCls} />
                    <label htmlFor="edit_price" className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">Price</label>
                  </div>
                  <div className="mb-3 relative">
                    <input type="number" id="edit_stock" placeholder=" " value={editingProduct.stock}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                      required className={inputCls} />
                    <label htmlFor="edit_stock" className="absolute left-3 top-1 text-xs pointer-events-none text-gray-400">Stock</label>
                  </div>
                </div>
                <div className="pt-2 flex justify-center gap-3">
                  <button type="button" onClick={handleEditClose} disabled={isEditing}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                    Cancel
                  </button>
                  <button type="submit" disabled={isEditing}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2">
                    {isEditing ? <><Spinner /> Updating...</> : "Update"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── DELETE MODAL ─────────── */}
      {showDeleteModal && (
        <div className={modalOverlay} onClick={handleDeleteClose}>
          <div className="bg-gray-900 rounded-lg w-full mx-4 lg:w-1/2 lg:mx-auto animate-slideUp"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold w-full text-center">DELETE?</h2>
              <button onClick={handleDeleteClose} disabled={isDeleting}
                className="hover:opacity-70 text-2xl leading-none transition-opacity duration-200 disabled:opacity-30">&times;</button>
            </div>
            <div className="p-4 text-center">
              <i className="bi bi-exclamation-triangle text-6xl text-red-500 mb-3 animate-bounce" />
              <p className="mb-0 px-2">
                Are you sure you want to delete <span className="font-bold">"{selectedProduct?.name}"</span>? This action cannot be undone.
              </p>
            </div>
            <div className="p-4 flex justify-center gap-3">
              <button onClick={handleDeleteClose} disabled={isDeleting}
                className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-2 rounded transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                Close
              </button>
              <button onClick={deleteProduct} disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2">
                {isDeleting ? <><Spinner /> Deleting...</> : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Products;