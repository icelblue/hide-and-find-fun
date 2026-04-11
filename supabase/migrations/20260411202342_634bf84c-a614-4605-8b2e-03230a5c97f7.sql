-- Foto: canviar a popup complet al amagar (com la Carta)
UPDATE object_specials
SET prompt_on = 'hide',
    special_type = 'custom_message',
    has_hide_message = true,
    prompt_text = 'Escriu un missatge per al qui trobi la foto:'
WHERE object_id = '24d168f5-727e-48d9-a637-ae50f5a09881';
