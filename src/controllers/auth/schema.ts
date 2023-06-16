import { z } from 'zod';

export const loginReqBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
});

export const resgisterReqBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(3).max(50),
  surname: z.string().min(3).max(50),
  username: z.string().min(3).max(50),
});

export const forgotPasswordReqBodySchema = z.object({
  email: z.string().email(),
});

export const resetPasswordReqBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  access_token: z.string(),
  refresh_token: z.string(),
});

export const changePasswordReqBodySchema = z.object({
  old_password: z.string().min(6),
  new_password: z.string().min(6),
});
