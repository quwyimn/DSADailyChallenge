-- Add avatar_url column to users table
ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;

-- Backfill existing users: generate DiceBear adventurer PNG URL using email as seed.
-- URL-encode the email via encode(convert_to(...,'UTF8'),'escape') then replace spaces
-- with %20; '@' and '.' are already safe in a query string seed value.
UPDATE "users"
SET "avatar_url" = 'https://api.dicebear.com/7.x/adventurer/png?seed='
  || replace(encode(convert_to(email, 'UTF8'), 'escape'), ' ', '%20')
  || '&size=128&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf'
WHERE "avatar_url" IS NULL;
