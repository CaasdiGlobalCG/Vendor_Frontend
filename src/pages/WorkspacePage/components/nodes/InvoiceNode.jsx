import React from 'react';
import { FileText } from 'lucide-react';
import { DocumentNode } from '../ElementDocumentPreview';

const InvoiceNode = ({ id, data, selected, isConnectable }) => (
  <DocumentNode id={id} data={data} selected={selected} isConnectable={isConnectable} docType="invoice" title="Tax Invoice" icon={FileText} />
);

export default InvoiceNode;
