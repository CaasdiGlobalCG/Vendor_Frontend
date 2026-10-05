import React from 'react';
import { FileText } from 'lucide-react';
import { DocumentNode } from '../ElementDocumentPreview';

const QuotationNode = ({ id, data, selected, isConnectable }) => (
  <DocumentNode id={id} data={data} selected={selected} isConnectable={isConnectable} docType="quote" title="Quotation" icon={FileText} />
);

export default QuotationNode;
