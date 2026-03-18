-- 00001_enable_extensions.sql
-- PostgreSQL 확장 모듈 활성화

CREATE EXTENSION IF NOT EXISTS "postgis";          -- 위치 기반 거리 계산
CREATE EXTENSION IF NOT EXISTS "vector";           -- pgvector (RAG 임베딩)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";          -- 텍스트 유사도 검색
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";        -- UUID 생성
CREATE EXTENSION IF NOT EXISTS "pg_cron";          -- 정기 작업 스케줄링
CREATE EXTENSION IF NOT EXISTS "pgjwt";            -- JWT 처리
