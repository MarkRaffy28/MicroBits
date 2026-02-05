import axios from "axios";
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBurger } from '@fortawesome/free-solid-svg-icons';
import { Container, Table, Button, Modal, Form } from "react-bootstrap";
import AdminSidebar from "../../components/AdminSidebar";
import "../../styles/StyleSheet.css";

const API_URL = "http://localhost:5000/api/products";

function Products() {
  // MODAL
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleAddClose = () => setShowAddModal(false);
  const handleAddShow = () => setShowAddModal(true);
  const handleEditClose = () => setShowEditModal(false);
  const handleEditShow = (product) => {
    setSelectedProduct(product);
    setEditingProduct({...product})
    setShowEditModal(true);
  };
  const handleDeleteClose = () => setShowDeleteModal(false);
  const handleDeleteShow = (product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  // PRODUCT STATES
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const response = await axios.get(API_URL);
    setProducts(response.data);
  };

  // ADD
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    description: "",
    price: "",
    stock: "",
  });

  const addProduct = async () => {
    if (
      !newProduct.name ||
      !newProduct.category ||
      !newProduct.description ||
      !newProduct.price ||
      !newProduct.stock
    )
      return;

    const nextId = products.length > 0 
      ? Math.max(...products.map(p => parseInt(p.id))) + 1 
      : 1;

    const productWithId = {
      id: nextId.toString(),
      ...newProduct
    };

    const response = await axios.post(API_URL, productWithId);
    setProducts([...products, response.data]);
    setNewProduct({
      name: "",
      category: "",
      description: "",
      price: "",
      stock: "",
    });
    handleAddClose();
  };

  // EDIT
  const [editingProduct, setEditingProduct] = useState({
    name: "",
    category: "",
    description: "",
    price: "",
    stock: "",
  });

  const editProduct = async (id) => {
    await axios.put(`${API_URL}/${id}`, editingProduct);
    setProducts(
      products.map((product) =>
        product.id === id ? editingProduct : product
      )
    );
    setEditingProduct(null);
    setEditingProduct({
      name: "",
      category: "",
      description: "",
      price: "",
      stock: "",
    });
    handleEditClose();
  };

  // DELETE
  const deleteProduct = async () => {
    await axios.delete(`${API_URL}/${selectedProduct.id}`);
    setProducts(products.filter((p) => p.id !== selectedProduct.id));
    handleDeleteClose();
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);
  const activePath = segments[segments.length - 1] || "/";

  return (
    <div className="flex h-screen">
      <AdminSidebar isOpen={isSidebarOpen} onClose={closeSidebar} activePath={activePath} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-blue-700 shadow-sm z-10">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 rounded-md hover:bg-blue-600 transition-colors"
              >
                <FontAwesomeIcon icon={faBurger} size={24} />
              </button>
              <h2 className="text-xl font-semibold">Products</h2>
            </div>
            <div>
              <button
                className="bg-green-600 hover:bg-green-700 text-neutral-200 text-sm px-3 py-1 rounded mr-2 transition-all duration-200 transform hover:scale-105"
                onClick={handleAddShow}
              >
                Add
              </button>          
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="container mx-auto p-4">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="border-b-4 border-blue-600">
                  <tr className="align-middle">
                    <th className="text-center px-4 py-3">ID</th>
                    <th className="text-center px-4 py-3">Name</th>
                    <th className="text-center px-4 py-3">Category</th>
                    <th className="text-center px-4 py-3">Description</th>
                    <th className="text-center px-4 py-3">Price</th>
                    <th className="text-center px-4 py-3">Stock</th>
                    <th className="text-center px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr 
                      key={product.id} 
                      className="whitespace-nowrap hover:bg-gray-800 transition-colors duration-200"
                    >
                      <td className="text-center px-4 py-3">{product.id}</td>
                      <td className="text-center px-4 py-3">{product.name}</td>
                      <td className="text-center px-4 py-3">{product.category}</td>
                      <td className="text-center px-4 py-3">{product.description}</td>
                      <td className="text-center px-4 py-3">${product.price}</td>
                      <td className="text-center px-4 py-3">{product.stock}</td>
                      <td className="text-center px-4 py-3">
                        <button
                          className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-sm px-3 py-1.5 rounded mr-2 transition-all duration-200 transform hover:scale-105"
                          onClick={() => handleEditShow(product)}
                        >
                          Edit
                        </button>
                        <button
                          className="bg-red-500 hover:bg-red-600 text-neutral-100 text-sm px-3 py-1.5 rounded transition-all duration-200 transform hover:scale-105"
                          onClick={() => handleDeleteShow(product)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Product Modal */}
          {showAddModal && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn"
              onClick={handleAddClose}
            >
              <div 
                className="bg-gray-900 rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto animate-slideUp"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center p-4">
                  <h2 className="text-xl font-bold w-full text-center">ADD PRODUCT</h2>
                  <button
                    onClick={handleAddClose}
                    className="hover:opacity-70 text-2xl leading-none transition-opacity duration-200"
                  >
                    &times;
                  </button>
                </div>
                <div className="p-4">
                  <form>
                    <div className="mb-3">
                      <div className="relative">
                        <input
                          type="text"
                          id="add_name"
                          placeholder=" "
                          value={newProduct.name}
                          onChange={(e) =>
                            setNewProduct({ ...newProduct, name: e.target.value })
                          }
                          required
                          className="w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white"
                        />
                        <label
                          htmlFor="add_name"
                          className="absolute left-3 top-1 text-xs transition-all duration-200 pointer-events-none text-gray-400"
                        >
                          Name
                        </label>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="relative">
                        <input
                          type="text"
                          id="add_category"
                          placeholder=" "
                          value={newProduct.category}
                          onChange={(e) =>
                            setNewProduct({ ...newProduct, category: e.target.value })
                          }
                          required
                          className="w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white"
                        />
                        <label
                          htmlFor="add_category"
                          className="absolute left-3 top-1 text-xs transition-all duration-200 pointer-events-none text-gray-400"
                        >
                          Category
                        </label>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="relative">
                        <input
                          type="text"
                          id="add_description"
                          placeholder=" "
                          value={newProduct.description}
                          onChange={(e) =>
                            setNewProduct({
                              ...newProduct,
                              description: e.target.value,
                            })
                          }
                          className="w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white"
                        />
                        <label
                          htmlFor="add_description"
                          className="absolute left-3 top-1 text-xs transition-all duration-200 pointer-events-none text-gray-400"
                        >
                          Description
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="mb-3">
                        <div className="relative">
                          <input
                            type="number"
                            id="add_price"
                            placeholder=" "
                            value={newProduct.price}
                            onChange={(e) =>
                              setNewProduct({ ...newProduct, price: e.target.value })
                            }
                            required
                            className="w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white"
                          />
                          <label
                            htmlFor="add_price"
                            className="absolute left-3 top-1 text-xs transition-all duration-200 pointer-events-none text-gray-400"
                          >
                            Price
                          </label>
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="relative">
                          <input
                            type="number"
                            id="add_stock"
                            placeholder=" "
                            value={newProduct.stock}
                            onChange={(e) =>
                              setNewProduct({ ...newProduct, stock: e.target.value })
                            }
                            required
                            className="w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white"
                          />
                          <label
                            htmlFor="add_stock"
                            className="absolute left-3 top-1 text-xs transition-all duration-200 pointer-events-none text-gray-400"
                          >
                            Stock
                          </label>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
                <div className="p-4 flex justify-center gap-3">
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105"
                    onClick={handleAddClose}
                  >
                    Cancel
                  </button>
                  <button
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105"
                    onClick={addProduct}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Product Modal */}
          {showEditModal && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn"
              onClick={handleEditClose}
            >
              <div 
                className="bg-gray-900 rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto animate-slideUp"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center p-4">
                  <h2 className="text-xl font-bold w-full text-center">EDIT PRODUCT</h2>
                  <button
                    onClick={handleEditClose}
                    className="hover:opacity-70 text-2xl leading-none transition-opacity duration-200"
                  >
                    &times;
                  </button>
                </div>
                <div className="p-4">
                  <form>
                    <div className="mb-3">
                      <div className="relative">
                        <input
                          type="text"
                          id="edit_name"
                          placeholder=" "
                          value={editingProduct.name}
                          onChange={(e) =>
                            setEditingProduct({ ...editingProduct, name: e.target.value })
                          }
                          required
                          className="w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white"
                        />
                        <label
                          htmlFor="edit_name"
                          className="absolute left-3 top-1 text-xs transition-all duration-200 pointer-events-none text-gray-400"
                        >
                          Name
                        </label>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="relative">
                        <input
                          type="text"
                          id="edit_category"
                          placeholder=" "
                          value={editingProduct.category}
                          onChange={(e) =>
                            setEditingProduct({ ...editingProduct, category: e.target.value })
                          }
                          required
                          className="w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white"
                        />
                        <label
                          htmlFor="edit_category"
                          className="absolute left-3 top-1 text-xs transition-all duration-200 pointer-events-none text-gray-400"
                        >
                          Category
                        </label>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="relative">
                        <input
                          type="text"
                          id="edit_description"
                          placeholder=" "
                          value={editingProduct.description}
                          onChange={(e) =>
                            setEditingProduct({ ...editingProduct, description: e.target.value })
                          }
                          className="w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white"
                        />
                        <label
                          htmlFor="edit_description"
                          className="absolute left-3 top-1 text-xs transition-all duration-200 pointer-events-none text-gray-400"
                        >
                          Description
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="mb-3">
                        <div className="relative">
                          <input
                            type="number"
                            id="edit_price"
                            placeholder=" "
                            value={editingProduct.price}
                            onChange={(e) =>
                              setEditingProduct({ ...editingProduct, price: e.target.value })
                            }
                            required
                            className="w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white"
                          />
                          <label
                            htmlFor="edit_price"
                            className="absolute left-3 top-1 text-xs transition-all duration-200 pointer-events-none text-gray-400"
                          >
                            Price
                          </label>
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="relative">
                          <input
                            type="number"
                            id="edit_stock"
                            placeholder=" "
                            value={editingProduct.stock}
                            onChange={(e) =>
                              setEditingProduct({ ...editingProduct, stock: e.target.value })
                            }
                            required
                            className="w-full px-3 pt-5 pb-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white"
                          />
                          <label
                            htmlFor="edit_stock"
                            className="absolute left-3 top-1 text-xs transition-all duration-200 pointer-events-none text-gray-400"
                          >
                            Stock
                          </label>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
                <div className="p-4 flex justify-center gap-3">
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105"
                    onClick={handleEditClose}
                  >
                    Cancel
                  </button>
                  <button
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-all duration-200 transform hover:scale-105"
                    onClick={() => editProduct(selectedProduct.id)}
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Product Modal */}
          {showDeleteModal && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn"
              onClick={handleDeleteClose}
            >
              <div 
                className="bg-gray-900 rounded-lg max-w-md w-full mx-4 animate-slideUp"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center p-4">
                  <h2 className="text-xl font-bold w-full text-center">DELETE?</h2>
                  <button
                    onClick={handleDeleteClose}
                    className="hover:opacity-70 text-2xl leading-none transition-opacity duration-200"
                  >
                    &times;
                  </button>
                </div>
                <div className="p-4 text-center">
                  <i className="fa-solid fa-triangle-exclamation text-6xl text-red-500 mb-3 animate-bounce"></i>
                  <p className="mb-0 px-2">
                    Are you sure you want to delete this product? This action cannot be
                    undone.
                  </p>
                </div>
                <div className="p-4 flex justify-center gap-3">
                  <button
                    className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-2 rounded transition-all duration-200 transform hover:scale-105"
                    onClick={handleDeleteClose}
                  >
                    Close
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded transition-all duration-200 transform hover:scale-105"
                    onClick={deleteProduct}
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


export default Products;
