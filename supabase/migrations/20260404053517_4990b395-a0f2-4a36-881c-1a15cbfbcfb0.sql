
-- Add has_hide_message to allow both hide message AND find prompt
ALTER TABLE public.object_specials ADD COLUMN has_hide_message boolean NOT NULL DEFAULT false;

-- Carta already has prompt_on=hide, so it has hide message by definition
-- Foto should have hide message + find prompt
UPDATE public.object_specials SET has_hide_message = true WHERE special_type = 'custom_message';
UPDATE public.object_specials SET has_hide_message = true 
WHERE object_id = (SELECT id FROM objects WHERE name = 'Foto');
