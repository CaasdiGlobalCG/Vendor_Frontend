import React from 'react';
import { useNavigate } from 'react-router-dom';
import NewCustomerForm from './NewCustomerForm';

const NewCustomerPage = () => {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/customers'); // Navigate back to the customers list
  };

  const handleCustomerCreated = (newCustomer) => {
    console.log('Customer created:', newCustomer);
    navigate('/customers'); // Navigate back to the customers list after creation
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <NewCustomerForm 
          onClose={handleClose} 
          onCustomerCreated={handleCustomerCreated} 
        />
      </div>
    </div>
  );
};

export default NewCustomerPage;



