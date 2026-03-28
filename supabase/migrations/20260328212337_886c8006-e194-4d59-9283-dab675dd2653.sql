-- Scenario connections: each scenario has exactly 2 doors (neighbors)
CREATE TABLE public.scenario_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_a uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  scenario_b uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  UNIQUE(scenario_a, scenario_b)
);

ALTER TABLE public.scenario_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Connections readable" ON public.scenario_connections
  FOR SELECT TO authenticated USING (true);

-- Circuit: Cuina → Menjador → Jardí → Balcó → Habitació → Despatx → Lavabo → Cuina
-- Store both directions for easy querying
INSERT INTO public.scenario_connections (scenario_a, scenario_b) VALUES
  ('ee0d1a9a-d8bd-434f-8b65-e564ea86b0aa', 'cf85ae15-3c88-444f-8190-1297c8b75051'),
  ('cf85ae15-3c88-444f-8190-1297c8b75051', 'ee0d1a9a-d8bd-434f-8b65-e564ea86b0aa'),
  ('cf85ae15-3c88-444f-8190-1297c8b75051', 'dbe367e4-ecdd-472a-80bd-02d6468c31a4'),
  ('dbe367e4-ecdd-472a-80bd-02d6468c31a4', 'cf85ae15-3c88-444f-8190-1297c8b75051'),
  ('dbe367e4-ecdd-472a-80bd-02d6468c31a4', 'ec02eff4-389f-4359-bd39-89536ae91933'),
  ('ec02eff4-389f-4359-bd39-89536ae91933', 'dbe367e4-ecdd-472a-80bd-02d6468c31a4'),
  ('ec02eff4-389f-4359-bd39-89536ae91933', 'd30d87ba-7ffc-477a-bf43-e1dbe416b2ac'),
  ('d30d87ba-7ffc-477a-bf43-e1dbe416b2ac', 'ec02eff4-389f-4359-bd39-89536ae91933'),
  ('d30d87ba-7ffc-477a-bf43-e1dbe416b2ac', '323f6dd8-2d31-4a5b-932a-b93dc775d3a3'),
  ('323f6dd8-2d31-4a5b-932a-b93dc775d3a3', 'd30d87ba-7ffc-477a-bf43-e1dbe416b2ac'),
  ('323f6dd8-2d31-4a5b-932a-b93dc775d3a3', 'a18d9e08-63ef-491f-80a9-e85dad3bec3c'),
  ('a18d9e08-63ef-491f-80a9-e85dad3bec3c', '323f6dd8-2d31-4a5b-932a-b93dc775d3a3'),
  ('a18d9e08-63ef-491f-80a9-e85dad3bec3c', 'ee0d1a9a-d8bd-434f-8b65-e564ea86b0aa'),
  ('ee0d1a9a-d8bd-434f-8b65-e564ea86b0aa', 'a18d9e08-63ef-491f-80a9-e85dad3bec3c');