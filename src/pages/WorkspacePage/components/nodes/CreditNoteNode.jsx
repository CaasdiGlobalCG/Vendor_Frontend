import React from 'react';
import { FileText } from 'lucide-react';
import { DocumentNode } from '../ElementDocumentPreview';

const CreditNoteNode = ({ id, data, selected, isConnectable }) => (
  <DocumentNode id={id} data={data} selected={selected} isConnectable={isConnectable} docType="creditnote" title="Credit Note" icon={FileText} />
);

export default CreditNoteNode;
