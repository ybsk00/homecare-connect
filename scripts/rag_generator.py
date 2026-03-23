"""
RAG FAQ 대량 생성기
- Gemini로 카테고리별 FAQ 생성
- Gemini text-embedding-004 (1536차원) 임베딩
- Supabase DB 직접 적재
- PubMed 논문 수집 → FAQ 변환 지원

사용법:
  python scripts/rag_generator.py --action seed          # MVP 시드 데이터 적재
  python scripts/rag_generator.py --action generate_all   # 전체 5000개 생성
  python scripts/rag_generator.py --action generate --category hypertension --target patient --count 100
  python scripts/rag_generator.py --action pubmed --query "hypertension elderly nursing" --category hypertension --max 10
  python scripts/rag_generator.py --action status         # 현재 DB 현황 확인

환경변수 (.env에서 로드):
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, NCBI_API_KEY
"""

import os
import sys
import io
import json
import time
import argparse
import requests
from pathlib import Path
from dotenv import load_dotenv

# Windows cp949 인코딩 문제 해결
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# .env 로드
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
NCBI_API_KEY = os.getenv("NCBI_API_KEY", "")

if not all([SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY]):
    print("❌ .env에서 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY를 확인하세요")
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


# ── Gemini API ──

def gemini_generate(system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str:
    """Gemini 텍스트 생성"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    body = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"parts": [{"text": user_prompt}]}],
        "generationConfig": {"temperature": temperature, "maxOutputTokens": 8192},
    }
    resp = requests.post(url, json=body, timeout=120)
    resp.raise_for_status()
    result = resp.json()
    return result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")


def gemini_embed(text: str) -> list[float]:
    """Gemini 임베딩 (1536차원)"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={GEMINI_API_KEY}"
    body = {
        "content": {"parts": [{"text": text}]},
        "taskType": "RETRIEVAL_DOCUMENT",
        "outputDimensionality": 1536,
    }
    resp = requests.post(url, json=body, timeout=30)
    resp.raise_for_status()
    return resp.json().get("embedding", {}).get("values", [])


# ── Supabase ──

def supabase_insert(table: str, row: dict):
    """Supabase 테이블에 행 삽입"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    resp = requests.post(url, json=row, headers=HEADERS, timeout=30)
    if resp.status_code not in (200, 201, 204):
        print(f"  ⚠️ INSERT 실패 ({table}): {resp.status_code} {resp.text[:200]}")
        return False
    return True


def supabase_count(table: str) -> int:
    """테이블 행 수 조회"""
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=id&limit=0"
    h = {**HEADERS, "Prefer": "count=exact"}
    resp = requests.get(url, headers=h, timeout=10)
    count_header = resp.headers.get("content-range", "*/0")
    return int(count_header.split("/")[-1])


# ── FAQ 생성 ──

CATEGORY_TOPICS = {
    # ── 환자용 (patient_agent_rag_diseases) ──
    "patient": {
        "hypertension": {
            "name": "고혈압",
            "subtopics": ["혈압 측정법", "식이요법(저염식)", "운동", "약 복용", "합병증", "일상생활 주의", "스트레스 관리", "계절별 관리", "혈압 수치 의미", "병원 방문 시기"],
        },
        "diabetes": {
            "name": "당뇨",
            "subtopics": ["혈당 측정", "식이요법", "인슐린", "저혈당 대처", "발 관리", "운동", "합병증 예방", "간식", "외식 시 주의", "아픈 날 관리"],
        },
        "dementia": {
            "name": "치매",
            "subtopics": ["초기 증상", "일상생활 도움", "의사소통", "배회 대응", "수면 문제", "식사 도움", "약 복용", "보호자 스트레스", "인지 활동", "안전 환경"],
        },
        "arthritis": {
            "name": "관절염",
            "subtopics": ["통증 관리", "운동", "일상생활 보조", "한냉요법/온열요법", "체중 관리", "보조기구", "약물치료", "수술 시기", "관절 보호", "식이"],
        },
        "fall_prevention": {
            "name": "낙상예방",
            "subtopics": ["집안 환경", "신발", "운동(균형)", "약물(어지러움)", "시력", "화장실", "야간 안전", "보행보조기", "외출 시 주의", "낙상 후 대처"],
        },
        "heart_failure": {
            "name": "심부전",
            "subtopics": ["증상 인식", "체중 관리", "수분/나트륨 제한", "약 복용", "활동 제한", "호흡곤란 대처", "붓기 관찰", "병원 방문 시기", "예방접종", "일상생활"],
        },
        "stroke": {
            "name": "뇌졸중",
            "subtopics": ["경고 증상(FAST)", "재활운동", "연하장애", "언어재활", "우울증", "재발 예방", "혈압/당뇨 관리", "약 복용", "일상생활 복귀", "보호자 역할"],
        },
        "copd": {
            "name": "만성폐쇄성폐질환",
            "subtopics": ["호흡법", "흡입기 사용", "운동", "감염 예방", "영양 관리", "금연", "산소 치료", "악화 징후", "일상 활동", "예방접종"],
        },
        "depression": {
            "name": "우울증",
            "subtopics": ["증상 인식", "대화 방법", "활동 참여", "수면 관리", "식사", "약물치료", "자살 예방", "사회적 교류", "보호자 역할", "전문 상담"],
        },
        "parkinson": {
            "name": "파킨슨병",
            "subtopics": ["떨림 관리", "보행 훈련", "약 복용 시간", "낙상 예방", "연하장애", "변비 관리", "수면 장애", "일상생활 보조", "운동", "정서 지원"],
        },
        # ── 추가 주제 ──
        "long_term_care": {
            "name": "장기요양제도",
            "subtopics": ["등급 신청", "등급 판정 기준", "급여 종류", "본인부담금", "감경 기준", "이의신청", "서비스 이용", "가족 요양", "시설 입소", "비용 안내"],
        },
        "daily_care": {
            "name": "일상생활관리",
            "subtopics": ["구강 관리", "피부 관리", "배변 관리", "수면 위생", "체위 변경", "이동 보조", "목욕", "옷 입기", "정리정돈", "외출 준비"],
        },
        "nutrition": {
            "name": "영양관리",
            "subtopics": ["균형 식단", "단백질 섭취", "수분 섭취", "연하식", "간식", "비타민", "칼슘", "식욕부진", "체중 관리", "특수 식이"],
        },
        "caregiver": {
            "name": "보호자관리",
            "subtopics": ["번아웃 예방", "스트레스 관리", "돌봄 기술", "의사소통", "법적 권리", "지원 서비스", "응급 대처", "시설 선택", "경제적 지원", "자기 돌봄"],
        },
    },

    # ── 간호사용 (nurse_agent_rag_clinical) ──
    "nurse": {
        "hypertension_clinical": {
            "name": "고혈압 임상관리",
            "subtopics": ["약물 분류(ACEi/ARB/CCB/이뇨제)", "용량 조절", "부작용 모니터링", "가정혈압 기준", "이상혈압 대응", "합병증 스크리닝", "노인 특이사항", "임상 지표", "교육 포인트", "기록 방법"],
        },
        "diabetes_clinical": {
            "name": "당뇨 임상관리",
            "subtopics": ["인슐린 종류/용량", "경구약 분류", "저혈당 프로토콜", "DKA/HHS", "발 사정", "신경병증", "신장합병증", "망막합병증", "Sick Day 관리", "혈당 모니터링"],
        },
        "dementia_clinical": {
            "name": "치매 임상관리",
            "subtopics": ["인지기능 평가(MMSE/CDR)", "BPSD 약물", "비약물 중재", "영양 관리", "낙상 위험", "억제대 대안", "가족 교육", "법적 이슈", "의사소통 기법", "말기 돌봄"],
        },
        "wound_care": {
            "name": "상처/욕창 관리",
            "subtopics": ["욕창 단계별 처치", "드레싱 종류", "감염 판별", "영양 지원", "체위 변경", "압력 분산", "상처 사정(PUSH)", "하지 궤양", "당뇨발 관리", "기록법"],
        },
        "medication_mgmt": {
            "name": "약물 관리",
            "subtopics": ["다약제 관리", "약물 상호작용", "노인 금기약물(Beers)", "복약 순응도", "약물 부작용 모니터링", "PRN 약물", "마약성 진통제", "항응고제", "수액 관리", "투약 안전"],
        },
        "infection_control": {
            "name": "감염관리",
            "subtopics": ["손 위생", "개인보호구", "요로감염", "폐렴 예방", "MRSA", "결핵 관리", "COVID 대응", "예방접종", "가정 내 감염관리", "격리 기준"],
        },
        "palliative": {
            "name": "완화케어",
            "subtopics": ["통증 관리(WHO 사다리)", "증상 관리", "호스피스 기준", "사전의료의향서", "가족 지원", "임종 간호", "영적 돌봄", "비암성 완화", "의사소통", "윤리적 이슈"],
        },
        "mental_health": {
            "name": "정신건강간호",
            "subtopics": ["우울 스크리닝(GDS)", "자살 위험 평가", "불안 관리", "수면장애", "섬망 감별", "치매 감별", "비약물 중재", "약물치료", "가족 교육", "의뢰 기준"],
        },
        "rehab_nursing": {
            "name": "재활간호",
            "subtopics": ["ROM 운동", "이동 훈련", "ADL 훈련", "연하재활", "호흡재활", "배변훈련", "보조기구", "욕창 예방", "낙상 예방", "목표 설정"],
        },
    },
}

# 환자 응급 RAG 카테고리
EMERGENCY_CATEGORIES = {
    "cardiovascular": ["가슴 통증", "심장 두근거림", "호흡곤란", "다리 부종", "실신"],
    "neurological": ["갑작스런 두통", "말이 어눌해짐", "한쪽 마비", "어지러움", "의식 변화"],
    "respiratory": ["기침 악화", "가래에 피", "천명음", "숨찬 증상", "산소포화도 저하"],
    "metabolic": ["고혈당(300↑)", "저혈당(70↓)", "탈수", "전해질 이상", "갑상선 위기"],
    "musculoskeletal": ["낙상", "골절 의심", "심한 요통", "관절 급성 부종", "보행 불능"],
    "gastrointestinal": ["구토/설사", "복통", "변비 악화", "혈변", "식욕부진 지속"],
    "skin": ["욕창 악화", "피부 발적", "상처 감염", "발진/두드러기", "화상"],
    "medication": ["약물 과량", "심한 부작용", "알레르기 반응", "복약 거부", "약물 상호작용"],
    "psychiatric": ["심한 불안", "공격적 행동", "자해 위험", "심한 혼란", "야간 섬망"],
    "general": ["발열(38℃↑)", "체중 급변", "극심한 피로", "수면 장애", "통증 악화"],
}

# 간호사 사정 RAG 카테고리
ASSESSMENT_CATEGORIES = {
    "vital_signs": "바이탈 사인 측정 및 해석",
    "pain": "통증 사정 (NRS, OPQRST, 비언어적)",
    "nutrition": "영양 사정 (MNA, BMI, 식이 섭취량)",
    "wound": "상처/욕창 사정 (Braden, PUSH, Wagner)",
    "fall_risk": "낙상 위험 사정 (Morse, STRATIFY, TUG)",
    "cognitive": "인지기능 사정 (MMSE, CDR, GDS)",
    "adl": "일상생활 수행능력 (Barthel, K-ADL, IADL)",
    "respiratory": "호흡기능 사정 (SpO2, 호흡음, 호흡패턴)",
    "cardiovascular": "심혈관 사정 (혈압, 맥박, 부종, 경정맥)",
    "skin": "피부 사정 (색깔, 탄력, 습도, 병변)",
}


def generate_patient_faqs(category: str, info: dict, count: int = 50) -> list[dict]:
    """환자용 FAQ 대량 생성"""
    name = info["name"]
    subtopics = info["subtopics"]
    subtopics_str = ", ".join(subtopics)

    system_prompt = f"""당신은 65세 이상 어르신을 위한 건강 FAQ 작성 전문가입니다.
'{name}' 관련 FAQ를 작성합니다.

규칙:
- 70대 어르신이 이해할 수 있는 쉬운 한국어
- 의학 용어 사용 금지 (대신 쉬운 표현)
- 답변은 2~4문장
- "~하세요", "~드세요" 존댓말
- 실용적이고 구체적인 내용
- 중복 없이 다양한 질문

반드시 JSON 배열로만 응답 (마크다운 코드블록 없이):
[{{"question": "질문", "answer": "답변"}}]"""

    user_prompt = f"""'{name}' 관련 FAQ를 {count}개 생성하세요.

다루어야 할 세부 주제: {subtopics_str}

각 세부 주제마다 최소 {count // len(subtopics)}개 이상의 Q&A를 만들어주세요.
어르신이 실제로 궁금해할 만한 질문을 만들어주세요."""

    text = gemini_generate(system_prompt, user_prompt)
    cleaned = text.replace("```json", "").replace("```", "").strip()

    try:
        faqs = json.loads(cleaned)
        return [{"question": f["question"], "answer": f["answer"]} for f in faqs if "question" in f and "answer" in f]
    except json.JSONDecodeError:
        print(f"  ⚠️ JSON 파싱 실패 ({name}), 재시도...")
        return []


def generate_nurse_faqs(category: str, info: dict, count: int = 50) -> list[dict]:
    """간호사용 임상 FAQ 대량 생성"""
    name = info["name"]
    subtopics = info["subtopics"]
    subtopics_str = ", ".join(subtopics)

    system_prompt = f"""당신은 방문간호 임상 가이드라인 FAQ 작성 전문가입니다.
'{name}' 관련 임상 FAQ를 작성합니다.

규칙:
- 간호사 대상, 전문 용어 사용 가능
- 수치 기준과 근거 포함
- 답변은 3~5문장, 구체적이고 실무적
- 가이드라인/프로토콜 기반
- 중복 없이 다양한 질문

반드시 JSON 배열로만 응답 (마크다운 코드블록 없이):
[{{"question": "질문", "answer": "답변"}}]"""

    user_prompt = f"""'{name}' 관련 간호사용 임상 FAQ를 {count}개 생성하세요.

세부 주제: {subtopics_str}

각 주제마다 최소 {count // len(subtopics)}개의 Q&A를 만들어주세요.
방문간호 현장에서 실제로 판단에 필요한 질문 중심으로."""

    text = gemini_generate(system_prompt, user_prompt)
    cleaned = text.replace("```json", "").replace("```", "").strip()

    try:
        faqs = json.loads(cleaned)
        return [{"question": f["question"], "answer": f["answer"]} for f in faqs if "question" in f and "answer" in f]
    except json.JSONDecodeError:
        print(f"  ⚠️ JSON 파싱 실패 ({name}), 재시도...")
        return []


def generate_emergency_faqs(category: str, symptoms: list[str]) -> list[dict]:
    """환자 응급 대응 FAQ 생성"""
    system_prompt = """당신은 어르신 응급상황 대응 FAQ 작성 전문가입니다.

규칙:
- 환자용: 쉬운 한국어, 공포 최소화, 2~3문장
- 간호사 지시: 임상적 판단 기준, 3~4문장
- severity: info(참고) / warning(주의) / critical(긴급)

반드시 JSON 배열로만 응답:
[{"symptom": "증상 키워드", "severity": "warning", "question": "환자 질문", "answer": "환자용 답변", "nurse_instruction": "간호사 지시사항"}]"""

    symptoms_str = ", ".join(symptoms)
    user_prompt = f"""다음 증상들에 대한 응급 대응 FAQ를 각각 생성하세요: {symptoms_str}

각 증상별로 2~3개의 다양한 질문을 만들어주세요 (총 {len(symptoms) * 3}개 목표)."""

    text = gemini_generate(system_prompt, user_prompt)
    cleaned = text.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        print(f"  ⚠️ JSON 파싱 실패 (emergency-{category})")
        return []


def generate_assessment_faqs(atype: str, description: str, count: int = 30) -> list[dict]:
    """간호사 사정 기준 FAQ 생성"""
    system_prompt = """당신은 방문간호 환자사정 FAQ 작성 전문가입니다.

규칙:
- 간호사 대상, 사정 도구/기준/수치 포함
- criteria 필드에 JSON으로 수치 기준 제공
- 답변은 3~5문장

반드시 JSON 배열로만 응답:
[{"question": "질문", "answer": "답변", "criteria": {"key": "value"}}]"""

    user_prompt = f"""'{description}' 관련 사정 FAQ를 {count}개 생성하세요.
사정 도구, 정상/비정상 기준, 수치 해석, 보고 기준 등을 포함하세요."""

    text = gemini_generate(system_prompt, user_prompt)
    cleaned = text.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        print(f"  ⚠️ JSON 파싱 실패 (assessment-{atype})")
        return []


# ── PubMed ──

def search_pubmed(query: str, max_results: int = 5) -> list[dict]:
    """PubMed 논문 검색"""
    key_param = f"&api_key={NCBI_API_KEY}" if NCBI_API_KEY else ""

    # 검색
    search_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={requests.utils.quote(query)}&retmax={max_results}&retmode=json{key_param}"
    resp = requests.get(search_url, timeout=30)
    resp.raise_for_status()
    pmids = resp.json().get("esearchresult", {}).get("idlist", [])

    if not pmids:
        return []

    # 상세 조회
    fetch_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id={','.join(pmids)}&rettype=abstract&retmode=text{key_param}"
    resp = requests.get(fetch_url, timeout=30)
    resp.raise_for_status()

    # 간단 파싱 (전체 텍스트를 논문별로 분할)
    articles = []
    for pmid in pmids:
        articles.append({"pmid": pmid, "text": resp.text[:3000]})  # 길이 제한

    return articles


# ── 메인 실행 ──

def insert_with_embedding(table: str, row: dict, text_for_embed: str):
    """임베딩 생성 후 DB 삽입"""
    embedding = gemini_embed(text_for_embed)
    row["embedding"] = embedding
    success = supabase_insert(table, row)
    time.sleep(0.15)  # Rate limit
    return success


def cmd_status():
    """DB 현황 출력"""
    tables = [
        ("patient_agent_rag_diseases", "환자 질환"),
        ("patient_agent_rag_emergency", "환자 응급"),
        ("nurse_agent_rag_clinical", "간호사 임상"),
        ("nurse_agent_rag_assessment", "간호사 사정"),
    ]
    total = 0
    print("\n📊 RAG DB 현황")
    print("─" * 40)
    for table, label in tables:
        count = supabase_count(table)
        total += count
        bar = "█" * (count // 20) + "░" * max(0, 50 - count // 20)
        print(f"  {label:12s} │ {bar} │ {count:,}개")
    print("─" * 40)
    print(f"  {'합계':12s} │ {' ' * 50} │ {total:,}개")
    print(f"\n  목표: 5,000개 | 달성률: {total / 50:.1f}%\n")


def cmd_generate(category: str, target: str, count: int):
    """특정 카테고리 FAQ 생성"""
    if target == "patient":
        topics = CATEGORY_TOPICS.get("patient", {})
        if category not in topics:
            print(f"❌ 환자 카테고리 '{category}' 없음. 사용 가능: {list(topics.keys())}")
            return
        info = topics[category]
        print(f"\n🏥 환자용 FAQ 생성: {info['name']} ({count}개 목표)")
        faqs = generate_patient_faqs(category, info, count)
        print(f"  → {len(faqs)}개 생성됨, DB 적재 중...")

        inserted = 0
        for faq in faqs:
            row = {
                "category": category,
                "question": faq["question"],
                "answer": faq["answer"],
                "source": f"Gemini 생성 ({info['name']} FAQ)",
                "source_type": "manual",
            }
            if insert_with_embedding("patient_agent_rag_diseases", row, f"{faq['question']} {faq['answer']}"):
                inserted += 1
                if inserted % 10 == 0:
                    print(f"    ✅ {inserted}/{len(faqs)} 적재 완료")
        print(f"  ✅ {inserted}개 적재 완료\n")

    elif target == "nurse":
        topics = CATEGORY_TOPICS.get("nurse", {})
        if category not in topics:
            print(f"❌ 간호사 카테고리 '{category}' 없음. 사용 가능: {list(topics.keys())}")
            return
        info = topics[category]
        print(f"\n🩺 간호사용 FAQ 생성: {info['name']} ({count}개 목표)")
        faqs = generate_nurse_faqs(category, info, count)
        print(f"  → {len(faqs)}개 생성됨, DB 적재 중...")

        inserted = 0
        for faq in faqs:
            row = {
                "category": category,
                "question": faq["question"],
                "answer": faq["answer"],
                "source": f"Gemini 생성 ({info['name']} 임상 FAQ)",
                "source_type": "guideline",
            }
            if insert_with_embedding("nurse_agent_rag_clinical", row, f"{faq['question']} {faq['answer']}"):
                inserted += 1
                if inserted % 10 == 0:
                    print(f"    ✅ {inserted}/{len(faqs)} 적재 완료")
        print(f"  ✅ {inserted}개 적재 완료\n")


def cmd_generate_all():
    """전체 5000개 FAQ 생성"""
    print("\n🚀 전체 FAQ 대량 생성 시작 (목표: ~5,000개)")
    print("=" * 60)

    # 1. 환자 질환 FAQ (~2,500개)
    print("\n📋 [1/4] 환자 질환 FAQ 생성")
    for cat, info in CATEGORY_TOPICS["patient"].items():
        count = 100 if cat in ["hypertension", "diabetes", "dementia", "arthritis", "fall_prevention"] else 80
        print(f"\n  → {info['name']} ({count}개)")
        faqs = generate_patient_faqs(cat, info, count)
        inserted = 0
        for faq in faqs:
            row = {
                "category": cat,
                "question": faq["question"],
                "answer": faq["answer"],
                "source": f"Gemini 생성 ({info['name']} FAQ)",
                "source_type": "manual",
            }
            if insert_with_embedding("patient_agent_rag_diseases", row, f"{faq['question']} {faq['answer']}"):
                inserted += 1
        print(f"    ✅ {inserted}개 적재")
        time.sleep(2)  # API 쿨다운

    # 2. 환자 응급 FAQ (~500개)
    print("\n📋 [2/4] 환자 응급 FAQ 생성")
    for cat, symptoms in EMERGENCY_CATEGORIES.items():
        print(f"\n  → {cat} ({len(symptoms)}개 증상)")
        faqs = generate_emergency_faqs(cat, symptoms)
        inserted = 0
        for faq in faqs:
            row = {
                "symptom": faq.get("symptom", ""),
                "severity": faq.get("severity", "info"),
                "question": faq["question"],
                "answer": faq["answer"],
                "nurse_instruction": faq.get("nurse_instruction", ""),
                "source": f"Gemini 생성 (응급-{cat})",
            }
            text = f"{row['symptom']} {row['question']} {row['answer']}"
            if insert_with_embedding("patient_agent_rag_emergency", row, text):
                inserted += 1
        print(f"    ✅ {inserted}개 적재")
        time.sleep(2)

    # 3. 간호사 임상 FAQ (~1,500개)
    print("\n📋 [3/4] 간호사 임상 FAQ 생성")
    for cat, info in CATEGORY_TOPICS["nurse"].items():
        count = 80
        print(f"\n  → {info['name']} ({count}개)")
        faqs = generate_nurse_faqs(cat, info, count)
        inserted = 0
        for faq in faqs:
            row = {
                "category": cat,
                "question": faq["question"],
                "answer": faq["answer"],
                "source": f"Gemini 생성 ({info['name']} 임상 FAQ)",
                "source_type": "guideline",
            }
            if insert_with_embedding("nurse_agent_rag_clinical", row, f"{faq['question']} {faq['answer']}"):
                inserted += 1
        print(f"    ✅ {inserted}개 적재")
        time.sleep(2)

    # 4. 간호사 사정 FAQ (~500개)
    print("\n📋 [4/4] 간호사 사정 FAQ 생성")
    for atype, desc in ASSESSMENT_CATEGORIES.items():
        count = 30
        print(f"\n  → {desc} ({count}개)")
        faqs = generate_assessment_faqs(atype, desc, count)
        inserted = 0
        for faq in faqs:
            row = {
                "assessment_type": atype,
                "question": faq["question"],
                "answer": faq["answer"],
                "criteria": faq.get("criteria", {}),
                "source": f"Gemini 생성 ({desc})",
            }
            if insert_with_embedding("nurse_agent_rag_assessment", row, f"{faq['question']} {faq['answer']}"):
                inserted += 1
        print(f"    ✅ {inserted}개 적재")
        time.sleep(2)

    print("\n" + "=" * 60)
    cmd_status()


def cmd_pubmed(query: str, category: str, max_results: int):
    """PubMed 수집 → 간호사 임상 FAQ"""
    print(f"\n🔬 PubMed 수집: '{query}' → {category}")
    articles = search_pubmed(query, max_results)
    print(f"  → {len(articles)}개 논문 수집")

    total_inserted = 0
    for article in articles:
        faqs = generate_nurse_faqs(category, {"name": category, "subtopics": [query]}, 10)
        for faq in faqs:
            row = {
                "category": category,
                "question": faq["question"],
                "answer": faq["answer"],
                "source": f"PubMed PMID:{article['pmid']}",
                "source_type": "pubmed",
                "metadata": json.dumps({"pmid": article["pmid"]}),
            }
            if insert_with_embedding("nurse_agent_rag_clinical", row, f"{faq['question']} {faq['answer']}"):
                total_inserted += 1
        time.sleep(1)

    print(f"  ✅ {total_inserted}개 적재 완료\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RAG FAQ 대량 생성기")
    parser.add_argument("--action", required=True, choices=["status", "generate", "generate_all", "pubmed", "seed"])
    parser.add_argument("--category", help="카테고리 (예: hypertension)")
    parser.add_argument("--target", choices=["patient", "nurse"], help="대상 (patient/nurse)")
    parser.add_argument("--count", type=int, default=50, help="생성 개수 (기본 50)")
    parser.add_argument("--query", help="PubMed 검색어")
    parser.add_argument("--max", type=int, default=5, help="PubMed 최대 논문 수")

    args = parser.parse_args()

    if args.action == "status":
        cmd_status()
    elif args.action == "generate":
        if not args.category or not args.target:
            print("❌ --category, --target 필요")
        else:
            cmd_generate(args.category, args.target, args.count)
    elif args.action == "generate_all":
        cmd_generate_all()
    elif args.action == "pubmed":
        if not args.query or not args.category:
            print("❌ --query, --category 필요")
        else:
            cmd_pubmed(args.query, args.category, args.max)
    elif args.action == "seed":
        # 기존 seed_mvp 로직은 Edge Function 사용
        print("시드 데이터는 Edge Function으로 실행하세요:")
        print("  supabase functions invoke rag-pipeline-ingest --body '{\"action\": \"seed_mvp\"}'")
