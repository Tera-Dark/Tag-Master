import { describe, it, expect } from 'vitest';
import { parseRetryAfter, isRateLimitResponse, RateLimitError } from '../geminiService';

describe('geminiService rate limit helpers', () => {
    it('should correctly parse retryDelay from Google error details', () => {
        const errorData = {
            error: {
                code: 429,
                message: 'Resource has been exhausted (e.g. check quota).',
                status: 'RESOURCE_EXHAUSTED',
                details: [
                    {
                        '@type': 'type.googleapis.com/google.rpc.RetryInfo',
                        retryDelay: '21.451314s'
                    }
                ]
            }
        };

        const sec = parseRetryAfter(undefined, errorData);
        expect(sec).toBe(22); // Math.ceil(21.451314)
    });

    it('should correctly parse Retry-After header from Response', () => {
        const mockResponse = {
            headers: {
                get: (header: string) => header.toLowerCase() === 'retry-after' ? '35' : null
            }
        } as unknown as Response;

        const sec = parseRetryAfter(mockResponse);
        expect(sec).toBe(35);
    });

    it('should parse retry delay from error message string', () => {
        const errorData = {
            error: {
                message: 'Please retry after 18.2s due to rate limit'
            }
        };
        const sec = parseRetryAfter(undefined, errorData);
        expect(sec).toBe(19);
    });

    it('should fallback to 20s if no delay is specified', () => {
        const sec = parseRetryAfter(undefined, {});
        expect(sec).toBe(20);
    });

    it('should detect rate limit responses from HTTP status and text', () => {
        expect(isRateLimitResponse(429, 'Too Many Requests')).toBe(true);
        expect(isRateLimitResponse(400, 'RESOURCE_EXHAUSTED', { error: { status: 'RESOURCE_EXHAUSTED' } })).toBe(true);
        expect(isRateLimitResponse(200, 'Quota exceeded for requests per minute')).toBe(true);
        expect(isRateLimitResponse(500, 'Internal Server Error')).toBe(false);
    });

    it('should create RateLimitError with correct properties', () => {
        const err = new RateLimitError('Quota limit hit', 15);
        expect(err.name).toBe('RateLimitError');
        expect(err.retryAfterSec).toBe(15);
        expect(err.isRateLimit).toBe(true);
    });
});
