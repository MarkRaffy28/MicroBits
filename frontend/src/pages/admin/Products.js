import axios from "axios";
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import AnimatedTableRows from "../../react_bits/AnimatedTableRows";
import Toast from "../../components/Toast";
import "../../styles/StyleSheet.css";

const API_URL = "http://localhost:5000/api/products";

function Products() {
  const { setPageTitle } = useOutletContext();
  const { setHeaderAction } = useOutletContext();

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
    return () => {
      setPageTitle("Admin");
      setHeaderAction(null);
    }
  }, []);

  /* ─── Toast ─── */
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3500);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // MODAL
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleAddClose = () => {
    setShowAddModal(false);
    setImagePreview(null);
    setImageFile(null);
  };
  const handleAddShow = () => setShowAddModal(true);
  const handleEditClose = () => {
    setShowEditModal(false);
    setImagePreview(null);
    setImageFile(null);
  };
  const handleEditShow = (product) => {
    setSelectedProduct(product);
    setEditingProduct({...product});
    setImagePreview(product.image ? `http://localhost:5000${product.image}` : null);
    setShowEditModal(true);
  };
  const handleDeleteClose = () => setShowDeleteModal(false);
  const handleDeleteShow = (product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  // PRODUCT STATES
  const [products, setProducts] = useState([]);

  // IMAGE STATES
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const response = await axios.get(API_URL);
    setProducts(response.data);
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

  // ADD
  const [newProduct, setNewProduct] = useState({
    name: "", category: "", description: "", price: "", stock: "",
  });

  const addProduct = async (e) => {
    e.preventDefault();
    try {
      const nextId = products.length > 0
        ? Math.max(...products.map((p) => parseInt(p.id))) + 1
        : 1;

      const formData = new FormData();
      formData.append("id", nextId.toString());
      formData.append("name", newProduct.name);
      formData.append("category", newProduct.category);
      formData.append("description", newProduct.description);
      formData.append("price", newProduct.price);
      formData.append("stock", newProduct.stock);
      if (imageFile) formData.append("image", imageFile);

      const response = await axios.post(API_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProducts([...products, response.data]);
      setNewProduct({ name: "", category: "", description: "", price: "", stock: "" });
      setImageFile(null);
      setImagePreview(null);
      handleAddClose();
      addToast(`"${response.data.name}" added successfully.`, "success");
    } catch {
      addToast("Failed to add product. Please try again.", "error");
    }
  };

  // EDIT
  const [editingProduct, setEditingProduct] = useState({
    name: "", category: "", description: "", price: "", stock: "",
  });

  const editProduct = async (e, id) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("name", editingProduct.name);
      formData.append("category", editingProduct.category);
      formData.append("description", editingProduct.description);
      formData.append("price", editingProduct.price);
      formData.append("stock", editingProduct.stock);
      if (imageFile) formData.append("image", imageFile);

      const response = await axios.put(`${API_URL}/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProducts(products.map((p) => (p.id === id ? response.data : p)));
      setEditingProduct({ name: "", category: "", description: "", price: "", stock: "" });
      setImageFile(null);
      setImagePreview(null);
      handleEditClose();
      addToast(`"${response.data.name}" updated successfully.`, "success");
    } catch {
      addToast("Failed to update product. Please try again.", "error");
    }
  };

  // DELETE
  const deleteProduct = async () => {
    try {
      await axios.delete(`${API_URL}/${selectedProduct.id}`);
      setProducts(products.filter((p) => p.id !== selectedProduct.id));
      handleDeleteClose();
      addToast(`"${selectedProduct.name}" deleted.`, "success");
    } catch {
      addToast("Failed to delete product.", "error");
    }
  };

  /* ─── Shared styles ─── */
  const modalOverlay = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn";
  const modalBox     = "bg-gray-900 rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto animate-slideUp";
  const inputCls     = "w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white";

  const productRows = products.map((product) => (
    <>
      <td className="text-center px-4 py-3">{product.id}</td>
      <td className="text-center px-4 py-3">
        {product.image ? (
          <img
            src={`http://localhost:5000${product.image}`}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-16 h-16 object-cover rounded mx-auto"
          />
        ) : (
          <div className="w-16 h-16 bg-gray-700 rounded flex items-center justify-center mx-auto">
            <span className="text-gray-500 text-xs">No Image</span>
          </div>
        )}
      </td>
      <td className="text-center px-4 py-3">{product.name}</td>
      <td className="text-center px-4 py-3">{product.category}</td>
      <td className="text-center px-4 py-3">{product.description}</td>
      <td className="text-center px-4 py-3">${product.price}</td>
      <td className="text-center px-4 py-3">{product.stock}</td>
      <td className="text-center px-4 py-3 whitespace-nowrap">
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

  /* ─── Reusable image upload block ─── */
  const ImageUpload = () => (
    <div className="mb-4">
      <label className="block text-sm text-gray-400 mb-2">Product Image</label>
      <div className="flex flex-col items-center">
        {imagePreview && (
          <img
            src={imagePreview}
            alt="Preview"
            loading="lazy"
            decoding="async"
            className="w-32 h-32 object-cover rounded mb-3"
          />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700"
        />
      </div>
    </div>
  );

  return (
    <>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="container mx-auto p-4">
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
      </div>

      {/* ─────────── ADD MODAL ─────────── */}
      {showAddModal && (
        <div className={modalOverlay} onClick={handleAddClose}>
          <div className={modalBox} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4">
              <h2 className="text-xl font-bold w-full text-center">ADD PRODUCT</h2>
              <button onClick={handleAddClose} className="hover:opacity-70 text-2xl leading-none transition-opacity duration-200">&times;</button>
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
                  <input type="text" id="add_description" placeholder=" " value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    required className={inputCls} />
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
                  <button type="button" onClick={handleAddClose}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105">
                    Cancel
                  </button>
                  <button type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105">
                    Add
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
            <div className="flex justify-between items-center p-4">
              <h2 className="text-xl font-bold w-full text-center">EDIT PRODUCT</h2>
              <button onClick={handleEditClose} className="hover:opacity-70 text-2xl leading-none transition-opacity duration-200">&times;</button>
            </div>
            <div className="p-4">
              <form onSubmit={(e) => editProduct(e, selectedProduct.id)}>
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
                  <input type="text" id="edit_description" placeholder=" " value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    required className={inputCls} />
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
                  <button type="button" onClick={handleEditClose}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105">
                    Cancel
                  </button>
                  <button type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105">
                    Update
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
          <div className="bg-gray-900 rounded-lg max-w-md w-full mx-4 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4">
              <h2 className="text-xl font-bold w-full text-center">DELETE?</h2>
              <button onClick={handleDeleteClose} className="hover:opacity-70 text-2xl leading-none transition-opacity duration-200">&times;</button>
            </div>
            <div className="p-4 text-center">
              <i className="bi bi-exclamation-triangle text-6xl text-red-500 mb-3 animate-bounce" />
              <p className="mb-0 px-2">
                Are you sure you want to delete <span className="font-bold">"{selectedProduct?.name}"</span>? This action cannot be undone.
              </p>
            </div>
            <div className="p-4 flex justify-center gap-3">
              <button onClick={handleDeleteClose}
                className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-2 rounded transition-all duration-200 transform hover:scale-105">
                Close
              </button>
              <button onClick={deleteProduct}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded transition-all duration-200 transform hover:scale-105">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Products;