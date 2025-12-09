

import React, { useState, useEffect, useContext } from "react";
import { VendorContext } from "../context/VendorContext";
import { UserContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import StepIndicator from "./StepIndicator";
import SidebarContent from "./SidebarContent";

export default function Form3() {
  const navigate = useNavigate();
  const { vendorData, setVendorData } = useContext(VendorContext);
  const { currentUser } = useContext(UserContext) || {};
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    productDescription: vendorData.serviceProductDetails.productDescription || "",
    paymentTerms: vendorData.serviceProductDetails.paymentTerms || "",
    paymentMode: vendorData.serviceProductDetails.paymentMode || "",
    machineryDetails: vendorData.serviceProductDetails.machineryDetails || [
      {
        machineName: "",
        serialNumber: "",
        modelNumber: "",
        manufacturerName: "",
        contact: "",
        purchaseDate: "",
        warrantyStart: "",
        warrantyEnd: "",
        maintenanceDetails: "",
      },
    ],
  });

  useEffect(() => {
    if (currentUser) {
      const savedData = localStorage.getItem(`form3Data_${currentUser.id}`);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (!parsedData.machineryDetails || !Array.isArray(parsedData.machineryDetails)) {
          parsedData.machineryDetails = [{ machineName: "", serialNumber: "", modelNumber: "", manufacturerName: "", contact: "", purchaseDate: "", warrantyStart: "", warrantyEnd: "", maintenanceDetails: "" }];
        }
        setFormData(parsedData);
        setVendorData(prev => ({
          ...prev,
          serviceProductDetails: parsedData
        }));
      }
    }
  }, [currentUser, setVendorData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };
  const handleMachineChange = (index, e) => {
    const { name, value } = e.target;
    const list = [...formData.machineryDetails];
    list[index][name] = value;
    setFormData(prev => ({...prev, machineryDetails: list}));
  };

  const addMachine = () => {
    setFormData(prev => ({
        ...prev,
        machineryDetails: [...prev.machineryDetails, { machineName: "", serialNumber: "", modelNumber: "", manufacturerName: "", contact: "", purchaseDate: "", warrantyStart: "", warrantyEnd: "", maintenanceDetails: "" }]
    }));
  };

  const removeMachine = (index) => {
    const list = [...formData.machineryDetails];
    list.splice(index, 1);
    setFormData(prev => ({...prev, machineryDetails: list}));
  };


  const handlePrevious = () => {
    navigate("/Form2");
  };

  const handleNext = () => {
    if (currentUser) {
      localStorage.setItem(`form3Data_${currentUser.id}`, JSON.stringify(formData));
    }
    setVendorData(prev => ({
      ...prev,
      serviceProductDetails: { ...formData }
    }));
    navigate("/Form4");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const requiredFields = ["productDescription", "paymentTerms", "paymentMode"];
    for (const field of requiredFields) {
      if (!formData[field] || formData[field].trim() === "") {
        alert("Please fill the field: " + field);
        setIsSubmitting(false);
        return;
      }
    }
    setIsSubmitting(true);
    handleNext();
  };


  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Sidebar */}
      <SidebarContent />

      {/* Right Content */}
      <div className="flex-1 flex flex-col">
        {/* Step Indicator */}
        <StepIndicator currentStep={3} />

        {/* Form Content */}
        <div className="w-full max-w-4xl mx-auto px-4 pb-10 bg-white md:px-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            Product & Service
          </h1>

          <form onSubmit={handleSubmit} className="max-w-none space-y-8">
            {/* Product Service Information Section */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <h3 className="text-sm font-semibold text-gray-900 block mb-1">Product service information</h3>
                  <p className="text-xs text-gray-500">provide your Product & service info</p>
                </div>
                <div className="w-full md:w-2/3">
                  <textarea
                    required
                    name="productDescription"
                    value={formData.productDescription}
                    onChange={handleInputChange}
                    placeholder="Product & service description"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3"></div>
                <div className="w-full md:w-2/3">
                  <select
                    required
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">Payment terms</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Due on Receipt">Due on Receipt</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3"></div>
                <div className="w-full md:w-2/3">
                  <select
                    required
                    name="paymentMode"
                    value={formData.paymentMode}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">mode of payment</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>
            </div>
             {/* Machinery Details Section */}
             <div className="space-y-6 pt-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <h3 className="text-sm font-semibold text-gray-900 block mb-1">Machinery Details</h3>
                  <p className="text-xs text-gray-500">Provide details of machinery used for production.</p>
                </div>
                <div className="w-full md:w-2/3 space-y-4">
                  {formData.machineryDetails.map((machine, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-4 relative">
                      <h4 className="font-semibold text-gray-800">Machine {index + 1}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          name="machineName"
                          value={machine.machineName}
                          onChange={(e) => handleMachineChange(index, e)}
                          placeholder="Machine Name"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          name="serialNumber"
                          value={machine.serialNumber}
                          onChange={(e) => handleMachineChange(index, e)}
                          placeholder="Serial Number"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          name="modelNumber"
                          value={machine.modelNumber}
                          onChange={(e) => handleMachineChange(index, e)}
                          placeholder="Model Number"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          name="manufacturerName"
                          value={machine.manufacturerName}
                          onChange={(e) => handleMachineChange(index, e)}
                          placeholder="Manufacturer Name"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          name="contact"
                          value={machine.contact}
                          onChange={(e) => handleMachineChange(index, e)}
                          placeholder="Contact"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <div>
                          <label htmlFor={`purchaseDate-${index}`} className="text-xs text-gray-500">Date of Purchase</label>
                          <input
                            id={`purchaseDate-${index}`}
                            type="date"
                            name="purchaseDate"
                            value={machine.purchaseDate}
                            onChange={(e) => handleMachineChange(index, e)}
                            placeholder="Date of Purchase"
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label htmlFor={`warrantyStart-${index}`} className="text-xs text-gray-500">Warranty Start Date</label>
                          <input
                            id={`warrantyStart-${index}`}
                            type="date"
                            name="warrantyStart"
                            value={machine.warrantyStart}
                            onChange={(e) => handleMachineChange(index, e)}
                            placeholder="Warranty Start Date"
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label htmlFor={`warrantyEnd-${index}`} className="text-xs text-gray-500">Warranty End Date</label>
                          <input
                            id={`warrantyEnd-${index}`}
                            type="date"
                            name="warrantyEnd"
                            value={machine.warrantyEnd}
                            onChange={(e) => handleMachineChange(index, e)}
                            placeholder="Warranty End Date"
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                      <textarea
                        name="maintenanceDetails"
                        value={machine.maintenanceDetails}
                        onChange={(e) => handleMachineChange(index, e)}
                        placeholder="Maintenance Details"
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        rows="3"
                      />
                      {formData.machineryDetails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMachine(index)}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addMachine}
                    className="w-full text-sm text-emerald-600 hover:text-emerald-800 transition-colors py-2 border border-dashed border-emerald-500 rounded-lg"
                  >
                    + Add Another Machine
                  </button>
                </div>
              </div>
            </div>


            {/* Navigation Buttons */}
            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={handlePrevious}
                className="px-8 py-3 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="text-white px-8 py-3 rounded-lg font-medium shadow-md bg-gradient-to-r from-[#0F5848] to-[#21BE9C] hover:from-[#0F5848]/90 hover:to-[#21BE9C]/90 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Please wait..." : "Next"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
