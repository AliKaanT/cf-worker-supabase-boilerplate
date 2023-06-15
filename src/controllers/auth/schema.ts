import { z } from 'zod';

export const loginReqBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
});
