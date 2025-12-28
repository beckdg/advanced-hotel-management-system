import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { isNonEmptyString } from '../../common/validators';

export interface UpdateUserInput {
  name?: string;
  email?: string;
  isActive?: boolean;
  roleId?: string;
}

export function validateUpdateUserInput(body: unknown): UpdateUserInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request body', HTTP_STATUS.BAD_REQUEST);
  }

  const { name, email, isActive, roleId } = body as Record<string, unknown>;
  const input: UpdateUserInput = {};

  if (name !== undefined) {
    if (!isNonEmptyString(name)) {
      throw new AppError('Name must be a non-empty string', HTTP_STATUS.BAD_REQUEST);
    }
    input.name = name.trim();
  }

  if (email !== undefined) {
    if (!isNonEmptyString(email) || !email.includes('@')) {
      throw new AppError('Valid email is required', HTTP_STATUS.BAD_REQUEST);
    }
    input.email = email.toLowerCase().trim();
  }

  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') {
      throw new AppError('isActive must be a boolean', HTTP_STATUS.BAD_REQUEST);
    }
    input.isActive = isActive;
  }

  if (roleId !== undefined) {
    if (!isNonEmptyString(roleId)) {
      throw new AppError('roleId must be a non-empty string', HTTP_STATUS.BAD_REQUEST);
    }
    input.roleId = roleId;
  }

  if (Object.keys(input).length === 0) {
    throw new AppError('At least one field must be provided', HTTP_STATUS.BAD_REQUEST);
  }

  return input;
}
