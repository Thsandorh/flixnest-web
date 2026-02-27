import { z } from 'zod';

export const loginValidationSchema = z.object({
  email: z.string().min(1, { message: 'Email is required' }).email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export type LoginValidationSchemaType = z.infer<typeof loginValidationSchema>;
