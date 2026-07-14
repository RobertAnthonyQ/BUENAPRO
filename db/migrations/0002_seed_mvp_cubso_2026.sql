-- Initial MVP CUBSO segment scope for 2026.
-- These are configuration seeds, not worker logic.

SET TIME ZONE 'UTC';

INSERT INTO cat_cubso_segmentos (codigo, anio, nombre, raw_json)
VALUES
  (
    '43',
    2026,
    'Telecomunicaciones, radiodifusion y tecnologia de la informacion',
    '{"clave":43,"valorCadena":"Telecomunicaciones, radiodifusion y tecnologia de la informacion"}'::jsonb
  ),
  (
    '81',
    2026,
    'Servicios en Ingenieria e investigacion y servicios basados en tecnologia',
    '{"clave":81,"valorCadena":"Servicios en Ingenieria e investigacion y servicios basados en tecnologia"}'::jsonb
  ),
  (
    '78',
    2026,
    'Servicios de transporte, almacenamiento y correspondencia',
    '{"clave":78,"valorCadena":"Servicios de transporte, almacenamiento y correspondencia"}'::jsonb
  ),
  (
    '80',
    2026,
    'Servicios profesionales de gestion, negocios y servicios administrativos',
    '{"clave":80,"valorCadena":"Servicios profesionales de gestion, negocios y servicios administrativos"}'::jsonb
  )
ON CONFLICT (codigo, anio) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  raw_json = cat_cubso_segmentos.raw_json || EXCLUDED.raw_json,
  synced_at = now();

INSERT INTO mvp_enabled_cubso_segments (codigo, anio, bucket, enabled, notes)
VALUES
  ('43', 2026, 'tecnologia', true, 'Tecnologia de la informacion y telecomunicaciones.'),
  ('81', 2026, 'tecnologia', true, 'Servicios de ingenieria, investigacion y tecnologia.'),
  ('78', 2026, 'transporte', true, 'Servicios de transporte, almacenamiento y correspondencia.'),
  ('80', 2026, 'legal', true, 'Bucket amplio para servicios profesionales; refinar con items/keywords legales.')
ON CONFLICT (codigo, anio, bucket) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  notes = EXCLUDED.notes,
  updated_at = now();
