
-- Allow updating own pet accessories (needed for upsert on conflict)
CREATE POLICY "Update own accessories"
ON public.pet_accessories
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow deleting own pet (for rebirth at max XP)
CREATE POLICY "Delete own pet"
ON public.player_pets
FOR DELETE
USING (auth.uid() = user_id);

-- Allow deleting own story progress (for rebirth)
CREATE POLICY "Delete own progress"
ON public.story_progress
FOR DELETE
USING (auth.uid() = user_id);

-- Allow deleting own accessories (for rebirth)
CREATE POLICY "Delete own accessories"
ON public.pet_accessories
FOR DELETE
USING (auth.uid() = user_id);
