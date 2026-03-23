-- 00006_alter_rag_embedding_1536.sql
-- RAG 벡터 차원 768 → 1536 (Gemini text-embedding-004 outputDimensionality=1536)

DROP INDEX IF EXISTS idx_patient_rag_diseases_embedding;
DROP INDEX IF EXISTS idx_patient_rag_emergency_embedding;
DROP INDEX IF EXISTS idx_nurse_rag_clinical_embedding;
DROP INDEX IF EXISTS idx_nurse_rag_assessment_embedding;

ALTER TABLE public.patient_agent_rag_diseases ALTER COLUMN embedding TYPE vector(1536);
ALTER TABLE public.patient_agent_rag_emergency ALTER COLUMN embedding TYPE vector(1536);
ALTER TABLE public.nurse_agent_rag_clinical ALTER COLUMN embedding TYPE vector(1536);
ALTER TABLE public.nurse_agent_rag_assessment ALTER COLUMN embedding TYPE vector(1536);

CREATE INDEX idx_patient_rag_diseases_embedding ON public.patient_agent_rag_diseases
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_patient_rag_emergency_embedding ON public.patient_agent_rag_emergency
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX idx_nurse_rag_clinical_embedding ON public.nurse_agent_rag_clinical
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_nurse_rag_assessment_embedding ON public.nurse_agent_rag_assessment
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
