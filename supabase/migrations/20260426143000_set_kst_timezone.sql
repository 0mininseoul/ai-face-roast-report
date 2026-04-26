-- Keep timestamptz display and database-side timestamp defaults aligned to KST.
alter database postgres set timezone to 'Asia/Seoul';
