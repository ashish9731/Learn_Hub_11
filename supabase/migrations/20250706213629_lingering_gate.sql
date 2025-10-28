-- Set search_path explicitly for the migration
SET search_path = public;

-- Fix sync_podcast_category function
CREATE OR REPLACE FUNCTION public.sync_podcast_category()
RETURNS TRIGGER AS $$
DECLARE
    category_record RECORD;
    category_name TEXT;
BEGIN
    -- Set search_path explicitly
    SET search_path = public;
    
    -- If category_id is set but category is not, update category from category_id
    IF NEW.category_id IS NOT NULL AND (NEW.category IS NULL OR NEW.category::text = '') THEN
        SELECT name INTO category_record
        FROM public.content_categories
        WHERE id = NEW.category_id;
        
        IF FOUND THEN
            category_name := category_record.name;
            
            -- Try to convert the category name to the enum type with case handling
            BEGIN
                -- First try direct conversion
                NEW.category := category_name::public.podcast_category;
                RAISE NOTICE 'Updated category to % based on category_id %', NEW.category, NEW.category_id;
            EXCEPTION WHEN OTHERS THEN
                -- If direct conversion fails, try case-insensitive matching
                CASE LOWER(category_name)
                    WHEN 'books' THEN 
                        NEW.category := 'Books'::public.podcast_category;
                    WHEN 'hbr' THEN 
                        NEW.category := 'HBR'::public.podcast_category;
                    WHEN 'ted talks' THEN 
                        NEW.category := 'TED Talks'::public.podcast_category;
                    WHEN 'concept' THEN 
                        NEW.category := 'Concept'::public.podcast_category;
                    WHEN 'role play' THEN 
                        NEW.category := 'Role Play'::public.podcast_category;
                    ELSE
                        -- Try partial matching
                        IF LOWER(category_name) LIKE '%book%' THEN
                            NEW.category := 'Books'::public.podcast_category;
                        ELSIF LOWER(category_name) LIKE '%hbr%' OR LOWER(category_name) LIKE '%harvard%' THEN
                            NEW.category := 'HBR'::public.podcast_category;
                        ELSIF LOWER(category_name) LIKE '%ted%' OR LOWER(category_name) LIKE '%talk%' THEN
                            NEW.category := 'TED Talks'::public.podcast_category;
                        ELSIF LOWER(category_name) LIKE '%concept%' THEN
                            NEW.category := 'Concept'::public.podcast_category;
                        ELSIF LOWER(category_name) LIKE '%role%' OR LOWER(category_name) LIKE '%play%' THEN
                            NEW.category := 'Role Play'::public.podcast_category;
                        ELSE
                            -- Default to Books if no match
                            NEW.category := 'Books'::public.podcast_category;
                            RAISE NOTICE 'Could not match category name %, defaulting to Books', category_name;
                        END IF;
                END CASE;
                
                RAISE NOTICE 'Converted category name % to enum value % for podcast', category_name, NEW.category;
            END;
        END IF;
    -- If category is set but category_id is not, find or create the category
    ELSIF NEW.category IS NOT NULL AND NEW.category_id IS NULL AND NEW.course_id IS NOT NULL THEN
        -- Check if a category with this name exists for this course
        SELECT id, name INTO category_record
        FROM public.content_categories
        WHERE course_id = NEW.course_id
        AND LOWER(name) = LOWER(NEW.category::text)
        LIMIT 1;
        
        -- If category doesn't exist, create it
        IF NOT FOUND THEN
            INSERT INTO public.content_categories (name, course_id)
            VALUES (NEW.category::text, NEW.course_id)
            RETURNING id, name INTO category_record;
            
            RAISE NOTICE 'Created new category % for course %', category_record.name, NEW.course_id;
        END IF;
        
        -- Set the category_id
        NEW.category_id := category_record.id;
        RAISE NOTICE 'Updated category_id to % based on category %', NEW.category_id, NEW.category;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in sync_podcast_category: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix log_activity function
CREATE OR REPLACE FUNCTION public.log_activity(
    p_user_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_details JSONB
)
RETURNS VOID AS $$
BEGIN
    -- Set search_path explicitly
    SET search_path = public;
    
    INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
    VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_details);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in log_activity: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Set search_path explicitly
    SET search_path = public;
    
    -- Create user with conflict handling
    BEGIN
        INSERT INTO public.users (id, email, role)
        VALUES (NEW.id, NEW.email, 'user')
        ON CONFLICT (id) DO UPDATE SET 
            email = EXCLUDED.email;
        
        -- Create profile
        INSERT INTO public.user_profiles (
            user_id,
            first_name,
            last_name,
            full_name
        ) VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'full_name', '')
        )
        ON CONFLICT (user_id) DO UPDATE SET
            first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', public.user_profiles.first_name),
            last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', public.user_profiles.last_name),
            full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', public.user_profiles.full_name);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix create_user_safely function
CREATE OR REPLACE FUNCTION public.create_user_safely(
    p_id UUID,
    p_email TEXT,
    p_role public.user_role DEFAULT 'user'
)
RETURNS VOID AS $$
BEGIN
    -- Set search_path explicitly
    SET search_path = public;
    
    -- First try to insert
    BEGIN
        INSERT INTO public.users (id, email, role)
        VALUES (p_id, p_email, p_role);
        RETURN;
    EXCEPTION 
        WHEN unique_violation THEN
            -- If violation is on id, update the record
            BEGIN
                UPDATE public.users SET email = p_email, role = p_role
                WHERE id = p_id;
                RETURN;
            EXCEPTION WHEN unique_violation THEN
                -- If that fails, try updating by email
                UPDATE public.users SET id = p_id, role = p_role
                WHERE email = p_email;
                RETURN;
            END;
    END;
EXCEPTION WHEN OTHERS THEN
    -- Final fallback
    RAISE NOTICE 'Error in create_user_safely: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Set search_path explicitly
    SET search_path = public;
    
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in update_updated_at_column: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix ensure_user_exists function
CREATE OR REPLACE FUNCTION public.ensure_user_exists()
RETURNS TRIGGER AS $$
DECLARE
    user_exists boolean;
    user_email text;
BEGIN
    -- Set search_path explicitly
    SET search_path = public;
    
    -- Check if user exists in users table
    SELECT EXISTS (
        SELECT 1 FROM public.users WHERE id = NEW.user_id
    ) INTO user_exists;
    
    -- If user doesn't exist, try to create them
    IF NOT user_exists THEN
        -- Get email from auth.users
        SELECT email INTO user_email
        FROM auth.users
        WHERE id = NEW.user_id;
        
        IF user_email IS NOT NULL THEN
            -- Insert the user
            BEGIN
                INSERT INTO public.users (id, email, role)
                VALUES (NEW.user_id, user_email, 'user');
                RAISE NOTICE 'Created missing user % with email %', NEW.user_id, user_email;
            EXCEPTION WHEN unique_violation THEN
                -- If there's a duplicate key violation, it means another process
                -- created the user in the meantime, which is fine
                RAISE NOTICE 'User % already exists (created by another process)', NEW.user_id;
            END;
        ELSE
            RAISE EXCEPTION 'Cannot create user profile: User ID % not found in auth.users', NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in ensure_user_exists: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix trigger_activity_log function
CREATE OR REPLACE FUNCTION public.trigger_activity_log()
RETURNS TRIGGER AS $$
DECLARE
    record_id UUID;
    record_data JSONB;
BEGIN
    -- Set search_path explicitly
    SET search_path = public;
    
    -- Different handling based on operation type
    IF TG_OP = 'DELETE' THEN
        -- For DELETE operations, use OLD record
        record_id := OLD.id;
        record_data := to_jsonb(OLD);
    ELSE
        -- For INSERT and UPDATE operations, use NEW record
        record_id := NEW.id;
        record_data := to_jsonb(NEW);
    END IF;

    -- Insert the activity log
    BEGIN
        INSERT INTO public.activity_logs (
            user_id, 
            action, 
            entity_type, 
            entity_id, 
            details
        )
        VALUES (
            auth.uid(), 
            TG_OP, 
            TG_TABLE_NAME, 
            record_id, 
            jsonb_build_object('table', TG_TABLE_NAME, 'record', record_data)
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error logging activity for %: %', TG_OP, SQLERRM;
    END;

    -- Return the appropriate record based on operation
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE NOTICE 'Error in trigger_activity_log: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update statistics for better query planning
ANALYZE public.users;
ANALYZE public.user_profiles;
ANALYZE public.podcasts;
ANALYZE public.content_categories;
ANALYZE public.activity_logs;

-- Note: The ALTER SYSTEM command has been removed as it cannot run inside a transaction block
-- To enable leaked password protection, this needs to be run separately by a superuser:
-- ALTER SYSTEM SET pgsodium.enable_leaked_password_detection = on;