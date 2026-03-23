import { NextRequest, NextResponse } from 'next/server';

/**
 * Google Cloud Speech-to-Text API 프록시
 * POST /api/stt
 * Body: { audio: string (base64), encoding: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { audio, encoding } = await req.json();

    if (!audio) {
      return NextResponse.json({ error: '오디오 데이터가 없습니다' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_CLOUD_STT_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'STT API 키가 설정되지 않았습니다' }, { status: 500 });
    }

    // Google Cloud STT v1 REST API
    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            encoding: encoding?.includes('webm') ? 'WEBM_OPUS' : 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'ko-KR',
            model: 'latest_long',
            enableAutomaticPunctuation: true,
            enableWordTimeOffsets: false,
          },
          audio: {
            content: audio,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google STT API error:', errorText);
      return NextResponse.json({ error: 'STT 처리 실패' }, { status: 502 });
    }

    const data = await response.json();

    const transcript =
      data.results
        ?.map((r: { alternatives?: { transcript?: string }[] }) =>
          r.alternatives?.[0]?.transcript ?? '',
        )
        .join(' ')
        .trim() ?? '';

    return NextResponse.json({ transcript });
  } catch (err) {
    console.error('STT route error:', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
