import { z } from 'zod';

export const signUpValidationSchema = z.object({
  name: z.string().min(1, { message: 'Username is required' }),
  email: z.string().min(1, { message: 'Email is required' }).email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

export type signUpValidationSchemaType = z.infer<typeof signUpValidationSchema>;
