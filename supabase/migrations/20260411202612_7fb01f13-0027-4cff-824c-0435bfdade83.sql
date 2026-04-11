-- Afegir camps opcionals per objectes que necessiten popup tant al hide com al find
ALTER TABLE object_specials
ADD COLUMN find_special_type text DEFAULT NULL,
ADD COLUMN find_prompt_text text DEFAULT NULL;

-- Foto: popup custom_message al hide + custom_name al find
UPDATE object_specials
SET find_special_type = 'custom_name',
    find_prompt_text = 'Has trobat una 🖼️ Foto! Vols posar-li un nom i guardar-la com a trofeu?'
WHERE object_id = '24d168f5-727e-48d9-a637-ae50f5a09881';
