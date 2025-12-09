  const handleEditService = (serviceData) => {
      setEditServiceData(serviceData);
      setNewImages([null, null, null]); // Reset image uploads
      
      // Initialize custom fields if the service has them
      if (serviceData.customFields) {
        const customFieldsArray = [];
        for (const [key, value] of Object.entries(serviceData.customFields)) {
          customFieldsArray.push({ label: key, value: value });
        }
        setNewServiceCustomFields(customFieldsArray);
      } else {
        setNewServiceCustomFields([]); // Reset custom fields if none exist
      }
      
      setShowEditServiceDialog(true);
    };