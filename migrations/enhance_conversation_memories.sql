-- Add new columns to conversation_memories table
ALTER TABLE "conversation_memories" 
  ADD COLUMN IF NOT EXISTS "category" text,
  ADD COLUMN IF NOT EXISTS "emotional_tone" text,
  ADD COLUMN IF NOT EXISTS "growth_opportunity" text;