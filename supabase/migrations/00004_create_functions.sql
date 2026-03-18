-- 00004_create_functions.sql
-- 데이터베이스 함수

-- =====================================================
-- AI 매칭: 반경 내 기관 검색 + 점수 산출
-- =====================================================
CREATE OR REPLACE FUNCTION public.find_matching_organizations(
  p_patient_id UUID,
  p_radius_km NUMERIC DEFAULT 10
)
RETURNS TABLE (
  org_id UUID,
  org_name TEXT,
  distance_km NUMERIC,
  travel_minutes NUMERIC,
  service_match_score NUMERIC,
  capacity_score NUMERIC,
  reputation_score NUMERIC,
  response_score NUMERIC,
  total_score NUMERIC
) AS $$
DECLARE
  v_patient_location GEOGRAPHY;
  v_needed_services TEXT[];
BEGIN
  -- 환자 위치/필요 서비스 조회
  SELECT location, needed_services
    INTO v_patient_location, v_needed_services
    FROM public.patients WHERE id = p_patient_id;

  RETURN QUERY
  SELECT
    o.id AS org_id,
    o.name AS org_name,

    -- 거리 (km)
    ROUND((ST_Distance(o.location, v_patient_location) / 1000)::NUMERIC, 1) AS distance_km,

    -- 예상 이동 시간 (분) — 평균 시속 30km 추정
    ROUND((ST_Distance(o.location, v_patient_location) / 1000 / 30 * 60)::NUMERIC, 0) AS travel_minutes,

    -- 서비스 적합성 점수 (0~100)
    ROUND(
      (ARRAY_LENGTH(
        ARRAY(SELECT UNNEST(v_needed_services) INTERSECT SELECT UNNEST(o.services)),
        1
      )::NUMERIC / GREATEST(ARRAY_LENGTH(v_needed_services, 1), 1) * 100)::NUMERIC,
      1
    ) AS service_match_score,

    -- 가용 인력 점수 (0~100)
    ROUND(
      GREATEST(0, (1 - (
        COALESCE((SELECT AVG(s.current_patient_count::NUMERIC / GREATEST(s.max_patients, 1))
                  FROM public.staff s WHERE s.org_id = o.id AND s.is_active), 0.5)
      )) * 100)::NUMERIC,
      1
    ) AS capacity_score,

    -- 평판 점수 (0~100)
    ROUND((o.rating_avg / 5 * 100)::NUMERIC, 1) AS reputation_score,

    -- 응답 속도 점수 (0~100)
    ROUND(GREATEST(0, (1 - o.response_avg_hours / 48) * 100)::NUMERIC, 1) AS response_score,

    -- 종합 점수 (가중 평균)
    ROUND((
      (1 - LEAST(ST_Distance(o.location, v_patient_location) / 1000 / p_radius_km, 1)) * 30
      + ROUND(
          (ARRAY_LENGTH(
            ARRAY(SELECT UNNEST(v_needed_services) INTERSECT SELECT UNNEST(o.services)),
            1
          )::NUMERIC / GREATEST(ARRAY_LENGTH(v_needed_services, 1), 1) * 100)::NUMERIC,
          1
        ) * 0.25
      + GREATEST(0, (1 - (
          COALESCE((SELECT AVG(s.current_patient_count::NUMERIC / GREATEST(s.max_patients, 1))
                    FROM public.staff s WHERE s.org_id = o.id AND s.is_active), 0.5)
        )) * 100) * 0.15
      + (o.rating_avg / 5 * 100) * 0.20
      + GREATEST(0, (1 - o.response_avg_hours / 48) * 100) * 0.10
    )::NUMERIC, 1) AS total_score

  FROM public.organizations o
  WHERE o.verification_status = 'verified'
    AND ST_DWithin(o.location, v_patient_location, p_radius_km * 1000)
    AND o.services && v_needed_services
  ORDER BY total_score DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RAG 하이브리드 검색 (벡터 + BM25 키워드)
-- =====================================================
CREATE OR REPLACE FUNCTION public.rag_hybrid_search(
  p_query_embedding vector(1536),
  p_query_text TEXT,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  source TEXT,
  similarity NUMERIC,
  rank_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT
      d.id,
      d.title,
      d.content,
      d.source,
      1 - (d.embedding <=> p_query_embedding) AS similarity
    FROM public.rag_documents d
    WHERE d.is_active = TRUE
    ORDER BY d.embedding <=> p_query_embedding
    LIMIT p_limit * 2
  ),
  keyword_results AS (
    SELECT
      d.id,
      d.title,
      d.content,
      d.source,
      ts_rank(
        to_tsvector('simple', d.content),
        plainto_tsquery('simple', p_query_text)
      ) AS keyword_rank
    FROM public.rag_documents d
    WHERE d.is_active = TRUE
      AND to_tsvector('simple', d.content) @@ plainto_tsquery('simple', p_query_text)
    LIMIT p_limit * 2
  )
  SELECT
    COALESCE(v.id, k.id) AS id,
    COALESCE(v.title, k.title) AS title,
    COALESCE(v.content, k.content) AS content,
    COALESCE(v.source, k.source) AS source,
    COALESCE(v.similarity, 0)::NUMERIC AS similarity,
    (COALESCE(v.similarity, 0) * 0.7
     + COALESCE(k.keyword_rank, 0) * 0.3)::NUMERIC AS rank_score
  FROM vector_results v
  FULL OUTER JOIN keyword_results k ON v.id = k.id
  ORDER BY rank_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 리뷰 작성 시 기관 평점 자동 업데이트 트리거
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_org_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.organizations
  SET
    rating_avg = (
      SELECT ROUND(AVG(rating)::NUMERIC, 1)
      FROM public.reviews
      WHERE org_id = NEW.org_id AND is_visible = TRUE
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE org_id = NEW.org_id AND is_visible = TRUE
    ),
    updated_at = NOW()
  WHERE id = NEW.org_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_org_rating();

-- =====================================================
-- updated_at 자동 갱신 트리거 함수
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 주요 테이블에 updated_at 트리거 적용
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.service_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.visit_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ai_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.advertisements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.rag_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
