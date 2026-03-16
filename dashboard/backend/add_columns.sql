-- Add confidence_score column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='passport_data' AND column_name='confidence_score') THEN
        ALTER TABLE passport_data ADD COLUMN confidence_score FLOAT;
    END IF;
END $$;

-- Add extraction_status column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='passport_data' AND column_name='extraction_status') THEN
        ALTER TABLE passport_data ADD COLUMN extraction_status VARCHAR;
    END IF;
END $$; 