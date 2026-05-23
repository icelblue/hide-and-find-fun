
ALTER TABLE public.story_choices DROP CONSTRAINT IF EXISTS story_choices_choice_order_check;
ALTER TABLE public.story_choices ADD CONSTRAINT story_choices_choice_order_check
  CHECK (choice_order >= 1 AND choice_order <= 10);
