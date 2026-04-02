-- Create private storage bucket for automated backups
INSERT INTO storage.buckets (id, name, public) VALUES ('backups', 'backups', false);
