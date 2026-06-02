-- Fase 0: Afegir flag is_outdoor a scenarios per substituir la comparació per nom
-- que actualment es fa a OUTDOOR_SCENARIOS = ["Jardí", "Balcó"] al codi.
-- Això desbloqueja la traducció segura de scenarios.name sense trencar la lògica
-- de la llanterna (escenaris exteriors són foscos i requereixen llanterna).

ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS is_outdoor BOOLEAN NOT NULL DEFAULT false;

-- Marcar com a exteriors els escenaris coneguts (per nom CA actual).
UPDATE public.scenarios
SET is_outdoor = true
WHERE name IN ('Jardí', 'Balcó', 'Jardi', 'Garden', 'Balcony');
