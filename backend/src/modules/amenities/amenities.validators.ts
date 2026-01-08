import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { isNonEmptyString } from '../../common/validators';

export interface CreateAmenityInput {
  name: string;
  description?: string;
}

export function validateCreateAmenityInput(body: unknown): CreateAmenityInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const data = body as Record<string, unknown>;

  if (!isNonEmptyString(data.name)) {
    throw new AppError('Amenity name is required', HTTP_STATUS.BAD_REQUEST);
  }

  return {
    name: data.name.trim(),
    description: isNonEmptyString(data.description) ? data.description.trim() : undefined,
  };
}
