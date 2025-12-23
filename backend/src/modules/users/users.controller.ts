import { Request, Response } from 'express';
import { AppError } from '../../common/errors';
import { HTTP_STATUS } from '../../common/constants';
import { PERMISSIONS, userHasPermission } from '../rbac';
import { validateUpdateUserInput } from './users.validators';
import { getCurrentUser, listUsers, getUserById, updateUser } from './users.service';

function getIpAddress(req: Request): string | undefined {
  return (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await getCurrentUser(req.user!.id);
  res.status(200).json({ status: 'success', data: user });
}

export async function getAll(req: Request, res: Response): Promise<void> {
  const users = await listUsers();
  res.status(200).json({ status: 'success', data: users });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const user = await getUserById(req.params.id);
  res.status(200).json({ status: 'success', data: user });
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = validateUpdateUserInput(req.body);
  const targetId = req.params.id;
  const actor = req.user!;

  const isSelf = actor.id === targetId;
  const canUpdateOthers = userHasPermission(actor, PERMISSIONS.USERS_UPDATE);

  if (!isSelf && !canUpdateOthers) {
    throw new AppError('Insufficient permissions', HTTP_STATUS.FORBIDDEN);
  }

  let updatePayload = input;

  if (isSelf && !canUpdateOthers) {
    const restrictedKeys = Object.keys(input).filter((key) => key !== 'name');
    if (restrictedKeys.length > 0) {
      throw new AppError('You can only update your own name', HTTP_STATUS.FORBIDDEN);
    }
    updatePayload = { name: input.name };
  }

  const user = await updateUser(targetId, updatePayload, actor.id, getIpAddress(req));
  res.status(200).json({ status: 'success', data: user });
}
