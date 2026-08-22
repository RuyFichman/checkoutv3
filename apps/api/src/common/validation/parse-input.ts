import { BadRequestException } from '@nestjs/common';
import type { ZodType } from 'zod';

export function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new BadRequestException({
      message: 'Revise os campos destacados.',
      fields: result.error.flatten().fieldErrors,
    });
  }

  return result.data;
}
