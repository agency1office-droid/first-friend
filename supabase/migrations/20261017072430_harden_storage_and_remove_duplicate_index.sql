-- The sibling index has the identical columns, order and predicate.
drop index if exists public.idx_public_animals_feed_size_updated;

-- Legacy bucket is empty; preserve read compatibility, restrict future uploads.
update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'uploads';
