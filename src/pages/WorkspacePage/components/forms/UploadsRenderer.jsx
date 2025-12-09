import React from 'react';
import UploadManager from './UploadManager';

const UploadsRenderer = ({ data, uploadType }) => {
  return <UploadManager data={data} uploadType={uploadType} />;
};

export default UploadsRenderer;