import { z } from 'zod';

export const loginReqBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
});

export const resgisterReqBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  password_confirm: z.string().min(6),
  name: z.string().min(3).max(50),
  surname: z.string().min(3).max(50),
  username: z.string().min(3).max(50),
});
