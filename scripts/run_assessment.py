import sys, os, time
sys.path.insert(0, os.path.dirname(__file__))

from rag_generator import generate_assessment_faqs, insert_with_embedding, ASSESSMENT_CATEGORIES

for atype, desc in ASSESSMENT_CATEGORIES.items():
    sys.stderr.write(f'  {desc}...\n')
    faqs = generate_assessment_faqs(atype, desc, 30)
    inserted = 0
    for faq in faqs:
        row = {
            'assessment_type': atype,
            'question': faq['question'],
            'answer': faq.get('answer', ''),
            'criteria': faq.get('criteria', {}),
            'source': f'Gemini ({desc})',
        }
        text = f"{faq['question']} {faq.get('answer', '')}"
        if insert_with_embedding('nurse_agent_rag_assessment', row, text):
            inserted += 1
    sys.stderr.write(f'    {inserted} inserted\n')
    time.sleep(3)

sys.stderr.write('Done!\n')
