-- Database Size (Tables & Indexes)
select
  pg_size_pretty(pg_database_size(current_database())) as "Total Database Size (Tables + Indexes)";

-- File Storage Size by Bucket (Images, Documents)
select 
  bucket_id as "Storage Bucket",
  count(*) as "Total Files",
  round(sum((metadata->>'size')::bigint) / 1024.0 / 1024.0, 2) as "Size (MB)"
from storage.objects
group by bucket_id;
