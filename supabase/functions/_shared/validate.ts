import { errorResponse } from './cors.ts';

/**
 * 요청 본문을 파싱하고 필수/선택 필드를 검증합니다.
 * 검증 실패 시 적절한 에러 Response를 반환합니다.
 */
export async function parseAndValidate<T extends Record<string, unknown>>(
  req: Request,
  schema: FieldSchema[],
): Promise<T | Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse('BAD_REQUEST', '유효한 JSON 본문이 필요합니다.', 400);
  }

  for (const field of schema) {
    const value = body[field.name];

    // 필수 필드 체크
    if (field.required && (value === undefined || value === null || value === '')) {
      return errorResponse('BAD_REQUEST', `${field.name}은(는) 필수입니다.`, 400);
    }

    // 값이 있으면 타입 체크
    if (value !== undefined && value !== null) {
      if (field.type === 'string' && typeof value !== 'string') {
        return errorResponse('BAD_REQUEST', `${field.name}은(는) 문자열이어야 합니다.`, 400);
      }
      if (field.type === 'number' && typeof value !== 'number') {
        return errorResponse('BAD_REQUEST', `${field.name}은(는) 숫자여야 합니다.`, 400);
      }
      if (field.type === 'boolean' && typeof value !== 'boolean') {
        return errorResponse('BAD_REQUEST', `${field.name}은(는) 불리언이어야 합니다.`, 400);
      }
      if (field.type === 'array' && !Array.isArray(value)) {
        return errorResponse('BAD_REQUEST', `${field.name}은(는) 배열이어야 합니다.`, 400);
      }

      // 문자열 최대 길이 체크
      if (field.type === 'string' && field.maxLength && (value as string).length > field.maxLength) {
        return errorResponse('BAD_REQUEST', `${field.name}은(는) ${field.maxLength}자 이하여야 합니다.`, 400);
      }

      // 숫자 범위 체크
      if (field.type === 'number') {
        if (field.min !== undefined && (value as number) < field.min) {
          return errorResponse('BAD_REQUEST', `${field.name}은(는) ${field.min} 이상이어야 합니다.`, 400);
        }
        if (field.max !== undefined && (value as number) > field.max) {
          return errorResponse('BAD_REQUEST', `${field.name}은(는) ${field.max} 이하여야 합니다.`, 400);
        }
      }

      // 배열 최대 길이 체크
      if (field.type === 'array' && field.maxLength && (value as unknown[]).length > field.maxLength) {
        return errorResponse('BAD_REQUEST', `${field.name}은(는) ${field.maxLength}개 이하여야 합니다.`, 400);
      }
    }
  }

  return body as T;
}

export function isValidationError<T>(result: T | Response): result is Response {
  return result instanceof Response;
}

export interface FieldSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
}
