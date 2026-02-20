import { useState, useEffect } from 'react';
import { getCategories, createCategory, deleteCategory } from '../services/api';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    
    try {
      await createCategory({ name: newCategory });
      setNewCategory('');
      fetchCategories(); // Refresh the list
    } catch (error) {
      // THIS WILL NOW SHOW THE REAL ERROR FROM THE BACKEND
      const errorMessage = error.response?.data?.message || error.message;
      alert(`Backend Error: ${errorMessage}`);
      console.error("Full Error Details:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteCategory(id);
        fetchCategories(); // Refresh the list
      } catch (error) {
        console.error('Failed to delete category');
      }
    }
  };

  if (loading) return <div className="p-8">Loading categories...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Manage Categories</h1>

      {/* Add Category Form */}
      <form onSubmit={handleAddCategory} className="mb-8 flex gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New Category Name (e.g. Skin Care)"
          className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          required
        />
        <button 
          type="submit" 
          className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
        >
          Add Category
        </button>
      </form>

      {/* Categories List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((category) => (
              <tr key={category._id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  {category.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleDelete(category._id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan="2" className="px-6 py-4 text-center text-gray-500">No categories found. Create one above!</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Categories;