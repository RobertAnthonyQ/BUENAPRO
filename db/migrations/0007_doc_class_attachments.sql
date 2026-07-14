-- Documentos de categoria 2 (anexos y formato de cotizacion) ahora se listan
-- sin descargarse; necesitan sus propias clases.
ALTER TABLE contract_documents
  DROP CONSTRAINT IF EXISTS contract_documents_doc_class_check;

ALTER TABLE contract_documents
  ADD CONSTRAINT contract_documents_doc_class_check
  CHECK (doc_class = ANY (ARRAY['tdr', 'eett', 'bases', 'acta', 'anexo', 'cotizacion', 'otro']));
