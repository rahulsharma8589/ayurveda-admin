import { useEffect, useState } from "react";
import api, { getCategories } from "../services/api";
import Toast from "./Toast";
import { uploadImagesToCloudinary } from "../services/cloudinary";

const ProductModal = ({ isOpen, onClose, onSuccess, product }) => {
  const isEdit = Boolean(product);

  // 1. Setup State for Form Fields
  const [form, setForm] = useState({
    name: "",
    description: "",
    longDescription: "", // New Field for detailed view
    category: "",
    stock: "",
    featured: false, // New Field for "Featured Products" section
  });

  // 2. Setup State for Dynamic Lists (Sizes & Benefits)
  const [variants, setVariants] = useState([{ size: "", mrp: "", salePrice: "" }]);
  const [benefits, setBenefits] = useState([""]); 
  
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [fileCount, setFileCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({});
  
  // State for Categories Dropdown
  const [categories, setCategories] = useState([]);

  // Fetch Categories and Populate Form on Edit
  useEffect(() => {
    if (isOpen) {
      // Fetch categories when modal opens
      const fetchCategories = async () => {
        try {
          const data = await getCategories();
          setCategories(data);
          
          // Automatically select the first category if creating a new product
          // and no category is currently selected
          if (!isEdit && data.length > 0 && !form.category) {
            setForm((prev) => ({ ...prev, category: data[0].name }));
          }
        } catch (error) {
          console.error("Failed to load categories", error);
        }
      };
      
      fetchCategories();
    }

    if (product && isOpen) {
      setForm({
        name: product.name,
        description: product.description,
        longDescription: product.longDescription || "",
        category: product.category,
        stock: product.stock,
        featured: product.featured || false,
      });
      
      // Load existing variants or default to one empty row
      setVariants(product.variants && product.variants.length > 0 
        ? product.variants 
        : [{ size: "", mrp: "", salePrice: "" }]
      );
      
      // Load existing benefits or default to one empty row
      setBenefits(product.benefits && product.benefits.length > 0 
        ? product.benefits 
        : [""]
      );
      
      setExistingImages(product.images || []);
    } else if (!product && isOpen) {
      // Reset Form for New Product ONLY if we aren't editing
      // We don't reset category here so the default category selection works
      setForm((prev) => ({ 
        name: "", description: "", longDescription: "", category: prev.category, stock: "", featured: false 
      }));
      setVariants([{ size: "", mrp: "", salePrice: "" }]);
      setBenefits([""]);
      setExistingImages([]);
      setNewImages([]);
      setFileCount(0);
    }
  }, [product, isOpen, isEdit]);

  // --- Handlers for Basic Fields ---
  const handleChange = (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  // --- Handlers for Variants (Sizes) ---
  const handleVariantChange = (index, field, value) => {
    const updated = [...variants];
    updated[index][field] = value;
    setVariants(updated);
  };
  const addVariant = () => setVariants([...variants, { size: "", mrp: "", salePrice: "" }]);
  const removeVariant = (index) => setVariants(variants.filter((_, i) => i !== index));

  // --- Handlers for Benefits (Bullet Points) ---
  const handleBenefitChange = (index, value) => {
    const updated = [...benefits];
    updated[index] = value;
    setBenefits(updated);
  };
  const addBenefit = () => setBenefits([...benefits, ""]);
  const removeBenefit = (index) => setBenefits(benefits.filter((_, i) => i !== index));

  // --- Submit Logic ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let uploadedUrls = [];
      if (newImages.length > 0) {
        uploadedUrls = await uploadImagesToCloudinary(newImages);
      }

      // Filter out empty rows to keep data clean
      const validVariants = variants.filter(v => v.size && v.salePrice);
      const validBenefits = benefits.filter(b => b.trim() !== "");

      // Determine main price (use the first variant's sale price as default)
      const mainPrice = validVariants.length > 0 ? Number(validVariants[0].salePrice) : 0;

      const payload = {
        ...form,
        stock: Number(form.stock),
        price: mainPrice, 
        variants: validVariants.map(v => ({
          ...v,
          mrp: Number(v.mrp),
          salePrice: Number(v.salePrice)
        })),
        benefits: validBenefits,
        images: [...existingImages, ...uploadedUrls],
      };

      if (isEdit) {
        await api.put(`/api/admin/products/${product._id}`, payload);
      } else {
        await api.post("/api/admin/products", payload);
      }

      setToast({ message: "Product saved successfully", type: "success" });
      setNewImages([]);
      setFileCount(0);
      onSuccess(); 
      onClose();   
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to save product", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
        <h2 className="text-2xl font-bold text-green-800 mb-6 border-b pb-2">
          {isEdit ? "Edit Product" : "Add New Product"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 1. Basic Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="block font-medium text-gray-700">Basic Details</label>
              <input
                name="name"
                placeholder="Product Name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none"
              />
              
              {/* Dynamic Category Dropdown */}
              <div>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none bg-white"
                >
                  <option value="" disabled>Select a Category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    No categories found! Please create a category first.
                  </p>
                )}
              </div>

              <input
                name="stock"
                type="number"
                placeholder="Total Stock Quantity"
                value={form.stock}
                onChange={handleChange}
                required
                className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none"
              />
              
              {/* Featured Checkbox */}
              <div className="flex items-center gap-2 mt-2 bg-yellow-50 p-2 rounded border border-yellow-100">
                <input
                  type="checkbox"
                  name="featured"
                  id="featured"
                  checked={form.featured}
                  onChange={handleChange}
                  className="w-4 h-4 text-green-600 rounded"
                />
                <label htmlFor="featured" className="text-gray-700 font-medium">Mark as Featured Product</label>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block font-medium text-gray-700">Descriptions</label>
              <textarea
                name="description"
                placeholder="Short Description (for card view)"
                value={form.description}
                onChange={handleChange}
                required
                rows="2"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none"
              />
              <textarea
                name="longDescription"
                placeholder="Long Description (detailed view)"
                value={form.longDescription}
                onChange={handleChange}
                rows="3"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* 2. Variants Section (Sizes & Prices) */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block font-medium text-gray-700">Variants (Sizes & Prices)</label>
              <button type="button" onClick={addVariant} className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100">
                + Add Size
              </button>
            </div>
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              {variants.map((variant, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <input
                    placeholder="Size (e.g. 500g)"
                    value={variant.size}
                    onChange={(e) => handleVariantChange(index, "size", e.target.value)}
                    required
                    className="flex-1 border p-2 rounded"
                  />
                  <input
                    type="number"
                    placeholder="MRP"
                    value={variant.mrp}
                    onChange={(e) => handleVariantChange(index, "mrp", e.target.value)}
                    required
                    className="w-24 border p-2 rounded"
                  />
                  <input
                    type="number"
                    placeholder="Sale Price"
                    value={variant.salePrice}
                    onChange={(e) => handleVariantChange(index, "salePrice", e.target.value)}
                    required
                    className="w-24 border p-2 rounded"
                  />
                  {variants.length > 1 && (
                    <button type="button" onClick={() => removeVariant(index)} className="text-red-500 hover:text-red-700 font-bold px-2">
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* 3. Benefits Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block font-medium text-gray-700">Product Benefits (Bullet Points)</label>
              <button type="button" onClick={addBenefit} className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100">
                + Add Benefit
              </button>
            </div>
            <div className="space-y-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <span className="text-gray-400">•</span>
                  <input
                    placeholder={`Benefit #${index + 1}`}
                    value={benefit}
                    onChange={(e) => handleBenefitChange(index, e.target.value)}
                    className="flex-1 border-b p-1 focus:border-green-500 outline-none"
                  />
                  {benefits.length > 1 && (
                    <button type="button" onClick={() => removeBenefit(index)} className="text-gray-400 hover:text-red-500">
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 4. Image Upload Section */}
          <div>
            <label className="block font-medium text-gray-700 mb-2">Images</label>
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-green-300 rounded-lg cursor-pointer bg-green-50 hover:bg-green-100 transition">
              <span className="text-green-600 font-medium">+ Upload Images</span>
              <span className="text-xs text-gray-500 mt-1">{fileCount > 0 ? `${fileCount} selected` : "Click to browse"}</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => { setNewImages(e.target.files); setFileCount(e.target.files.length); }} />
            </label>
            
            <div className="flex flex-wrap gap-2 mt-4">
              {existingImages.map((img) => (
                <div key={img} className="relative group">
                  <img src={img} className="w-20 h-20 object-cover rounded border" alt="preview" />
                  <button type="button" onClick={() => setExistingImages(existingImages.filter(i => i !== img))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition">✕</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button type="button" onClick={onClose} className="px-5 py-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-50">
              {loading ? "Saving..." : "Save Product"}
            </button>
          </div>
        </form>
      </div>
      <Toast {...toast} onClose={() => setToast({})} />
    </div>
  );
};

export default ProductModal;