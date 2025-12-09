import React from 'react';
import { Input } from "/src/components/ui/input";

const ProductEditDialog = ({ 
  showEditProductDialog, 
  editProductData, 
  setEditProductData, 
  newImages, 
  setNewImages, 
  setShowEditProductDialog, 
  handleUpdateProduct,
  newProductCustomFields,
  setNewProductCustomFields,
  handleProductCustomFieldChange,
  handleRemoveProductCustomField,
  handleAddProductCustomField
}) => {
  if (!showEditProductDialog || !editProductData) return null;
  
  console.log("ProductEditDialog - Displaying with data:", editProductData);
  console.log("ProductEditDialog - Custom fields:", newProductCustomFields);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-5xl overflow-y-auto max-h-[90vh] relative">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-2">Edit Product</h2>

        <div className="grid grid-cols-1 gap-4">
          {[
            { label: "Product Name", name: "name", type: "text" },
            { label: "Product Category", name: "category", type: "text" },
            { label: "Key Features", name: "keyFeatures", type: "textarea" },
            { label: "Target Customers / Users", name: "targetCustomers", type: "textarea" },
            { label: "Usage/Application Areas", name: "usageAreas", type: "textarea" },
            { label: "Available Sizes / Variants", name: "availableSizes", type: "text" },
            { label: "Packaging / Delivery", name: "packagingDelivery", type: "text" },
            { label: "Certifications / Quality Standards", name: "certifications", type: "text" },
            { label: "Support / Installation Services", name: "supportServices", type: "text" },
            { label: "Catalog Demo URL", name: "catalogDemo", type: "text" },
          ].map(({ label, name, type }) => (
            <div key={name} className="flex items-start gap-4">
              <label htmlFor={name} className="w-1/3 text-gray-600 pt-2">
                {label}
              </label>
              {type === "textarea" ? (
                <textarea
                  id={name}
                  name={name}
                  value={editProductData[name] || ""}
                  onChange={(e) =>
                    setEditProductData({ ...editProductData, [name]: e.target.value })
                  }
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                />
              ) : (
                <input
                  id={name}
                  name={name}
                  type="text"
                  value={editProductData[name] || ""}
                  onChange={(e) =>
                    setEditProductData({ ...editProductData, [name]: e.target.value })
                  }
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                />
              )}
            </div>
          ))}
        </div>

        {/* Render dynamic custom fields for products */}
        {newProductCustomFields.map((field, index) => (
          <div key={index} className="flex items-start gap-4 mt-3">
            <label className="text-gray-600 pt-2 flex-shrink-0">
              <Input
                type="text"
                placeholder="Add field"
                value={field.label}
                onChange={(e) => handleProductCustomFieldChange(index, "label", e.target.value)}
                className="w-1/3 border border-gray-300 rounded-md px-4 py-2 bg-gray-50 "
              />
            </label>
            <Input
              type="text"
              value={field.value || ""}
              onChange={(e) => handleProductCustomFieldChange(index, "value", e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
            />
            <button
              onClick={() => handleRemoveProductCustomField(index)}
              className="text-red-500 hover:text-red-700 text-lg pt-2"
            >
              −
            </button>
          </div>
        ))}
        <div className="sticky bottom-0 right-0 flex bg-white py-2 z-10 mt-top justify-end">
          <button
            onClick={handleAddProductCustomField}
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            + Add Field
          </button>
        </div>

        {/* Image Upload Section */}
        <div className="mt-8">
          <label className="block text-gray-600 mb-2">Product Images</label>
          <div className="flex flex-wrap gap-4">
            {newImages.filter(img => img !== null).map((image, index) => (
              <img
                key={index}
                src={URL.createObjectURL(image)}
                alt={`Product ${index + 1}`}
                className="w-24 h-24 object-cover rounded-md border"
              />
            ))}
            {editProductData.images && editProductData.images.map((image, index) => {
              // Only show images that haven't been replaced by newImages
              if (newImages[index] !== null) return null;
              return (
                <img
                  key={`existing-${index}`}
                  src={image.url || image}
                  alt={`Product ${index + 1}`}
                  className="w-24 h-24 object-cover rounded-md border"
                />
              );
            })}
            <label
              htmlFor="productEditImageUpload"
              className="w-24 h-24 flex items-center justify-center border-2 border-dashed text-gray-400 rounded-md cursor-pointer hover:border-emerald-500"
            >
              +
            </label>
            <input
              type="file"
              id="productEditImageUpload"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files);
                const updatedImages = [...newImages];
                files.forEach((file, idx) => {
                  updatedImages[idx] = file;
                });
                setNewImages(updatedImages);
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={() => setShowEditProductDialog(false)}
            className="border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateProduct}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-6 py-2 rounded-md transition"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductEditDialog; 