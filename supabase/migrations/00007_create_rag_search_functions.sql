-- 00007_create_rag_search_functions.sql
-- RAG 벡터 검색 RPC 함수 (1536 차원)

CREATE OR REPLACE FUNCTION match_patient_rag(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid, category text, question text, answer text,
  source text, source_type text, similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.category, d.question, d.answer, d.source, d.source_type,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.patient_agent_rag_diseases d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding LIMIT match_count;
END; $$;

CREATE OR REPLACE FUNCTION match_patient_rag_emergency(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid, symptom text, severity text, question text, answer text,
  nurse_instruction text, source text, similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.symptom, e.severity, e.question, e.answer, e.nurse_instruction, e.source,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.patient_agent_rag_emergency e
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding LIMIT match_count;
END; $$;

CREATE OR REPLACE FUNCTION match_nurse_rag_clinical(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid, category text, question text, answer text,
  source text, source_type text, similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.category, c.question, c.answer, c.source, c.source_type,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.nurse_agent_rag_clinical c
  WHERE 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding LIMIT match_count;
END; $$;

CREATE OR REPLACE FUNCTION match_nurse_rag_assessment(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid, assessment_type text, question text, answer text,
  criteria jsonb, source text, similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.assessment_type, a.question, a.answer, a.criteria, a.source,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM public.nurse_agent_rag_assessment a
  WHERE 1 - (a.embedding <=> query_embedding) > match_threshold
  ORDER BY a.embedding <=> query_embedding LIMIT match_count;
END; $$;
