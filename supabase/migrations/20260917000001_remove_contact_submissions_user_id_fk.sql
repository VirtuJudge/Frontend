-- Migration: 20260917000001_remove_contact_submissions_user_id_fk.sql
-- Description: Drop foreign key constraint on user_id to prevent constraint violations
-- when submissions are made by backend-authenticated users or when auth.users does not contain the ID.

ALTER TABLE public.contact_submissions
    DROP CONSTRAINT IF EXISTS contact_submissions_user_id_fkey;
