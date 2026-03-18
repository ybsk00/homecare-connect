// 음성→텍스트 변환 (Gemini 활용)
// 간호사가 방문 중 음성 메모를 녹음하면 텍스트로 변환합니다.
// Input: multipart/form-data (audio 파일)
// Output: { text: string, duration_seconds: number }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 오디오 데이터를 base64로 인코딩
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// 파일 확장자/MIME 타입으로 Gemini 지원 오디오 형식 확인
function getAudioMimeType(filename: string, contentType: string): string {
  // Gemini가 지원하는 오디오 MIME 타입 매핑
  const mimeMap: Record<string, string> = {
    mp3: 'audio/mp3',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    aac: 'audio/aac',
    webm: 'audio/webm',
  };

  // 파일 확장자에서 MIME 타입 추출
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (mimeMap[ext]) return mimeMap[ext];

  // Content-Type 헤더에서 추출
  if (contentType.startsWith('audio/')) return contentType;

  // 기본값
  return 'audio/mp3';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 인증 확인
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ code: 'UNAUTHORIZED', message: '인증 토큰이 필요합니다.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ code: 'UNAUTHORIZED', message: '유효하지 않은 인증 토큰입니다.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // multipart form data 파싱
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({ code: 'BAD_REQUEST', message: 'multipart/form-data 형식으로 오디오 파일을 전송해주세요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ code: 'BAD_REQUEST', message: 'audio 필드에 오디오 파일을 첨부해주세요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 파일 크기 제한 (10MB)
    if (audioFile.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ code: 'BAD_REQUEST', message: '오디오 파일은 10MB 이하만 가능합니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 오디오 파일 읽기 및 base64 인코딩
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBase64 = arrayBufferToBase64(audioBuffer);
    const mimeType = getAudioMimeType(audioFile.name, audioFile.type);

    // Gemini API로 음성→텍스트 변환
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ code: 'CONFIG_ERROR', message: 'Gemini API 키가 설정되지 않았습니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `당신은 한국어 의료 음성 전사(transcription) 전문 AI입니다.
간호사가 환자 방문 중 녹음한 음성 메모를 정확하게 텍스트로 변환합니다.
의학 용어, 약물명, 처치 내용을 정확하게 기록합니다.
불명확한 부분은 [불명확] 표시를 합니다.
음성이 없거나 인식할 수 없으면 빈 문자열을 반환합니다.`,
            }],
          },
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: audioBase64,
                  },
                },
                {
                  text: '이 오디오를 한국어 텍스트로 정확하게 전사해주세요. 의학 용어는 최대한 정확하게 기록하세요.',
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini STT API 오류:', errorText);
      return new Response(
        JSON.stringify({ code: 'STT_FAILED', message: '음성 인식에 실패했습니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const geminiResult = await geminiResponse.json();
    const transcribedText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 오디오 길이 추정 (파일 크기 기반 대략적 추정)
    // MP3 기준: 약 128kbps = 16KB/s
    const estimatedDurationSeconds = Math.round(audioFile.size / 16000);

    // 응답 반환
    return new Response(
      JSON.stringify({
        text: transcribedText.trim(),
        duration_seconds: estimatedDurationSeconds,
        file_name: audioFile.name,
        file_size: audioFile.size,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('음성→텍스트 변환 중 예외:', err);
    return new Response(
      JSON.stringify({ code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
