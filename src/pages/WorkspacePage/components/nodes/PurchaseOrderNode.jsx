import React from 'react';
import { Package } from 'lucide-react';
import { DocumentNode } from '../ElementDocumentPreview';

const PurchaseOrderNode = ({ id, data, selected, isConnectable }) => (
  <DocumentNode id={id} data={data} selected={selected} isConnectable={isConnectable} docType="po" title="Purchase Order" icon={Package} />
);

export default PurchaseOrderNode;
