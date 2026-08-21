-- ============================================================
-- Migration 003 : Seed catégories + aliases de recherche
-- ============================================================
-- Ces données sont confirmées et stables.
-- Les produits réels seront saisis via le back-office.
-- ============================================================

-- CATÉGORIES AL FURQAN
insert into categories (name, slug, position, is_visible)
values
  ('Coran',             'coran',             0,  true),
  ('Tafsir',            'tafsir',            1,  true),
  ('Invocations & Dhikr','invocations-dhikr',2,  true),
  ('Croyance & Foi',    'croyance-foi',      3,  true),
  ('Spiritualité',      'spiritualite',      4,  true),
  ('Mariage',           'mariage',           5,  true),
  ('Femme',             'femme',             6,  true),
  ('Jeunesse',          'jeunesse',          7,  true),
  ('Récits',            'recits',            8,  true),
  ('Éducation',         'education',         9,  true),
  ('Arabe',             'arabe',             10, true),
  ('Packs',             'packs',             11, true)
on conflict (slug) do nothing;

-- ALIASES DE RECHERCHE (translittérations confirmées)
insert into search_aliases (alias, normalized_alias, canonical)
values
  ('quran',       'quran',        'coran'),
  ('qur''an',     'qur an',       'coran'),
  ('koran',       'koran',        'coran'),
  ('warch',       'warch',        'warsh'),
  ('varch',       'varch',        'warsh'),
  ('aqidah',      'aqidah',       'aqida'),
  ('aqîda',       'aqida',        'aqida'),
  ('zikr',        'zikr',         'dhikr'),
  ('ibn kathîr',  'ibn kathir',   'ibn kathir'),
  ('ibn al-qayyim','ibn al qayyim','ibn qayyim')
on conflict do nothing;
