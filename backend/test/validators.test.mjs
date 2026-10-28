import assert from 'node:assert';
import { test } from 'node:test';
import {
  createUserSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../src/utils/validators.js';

test('createUserSchema accepts valid signup payload', () => {
  const result = createUserSchema.safeParse({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    password: 'Str0ng!Pass'
  });
  assert.ok(result.success);
  assert.equal(result.data.email, 'ada@example.com');
});

test('createUserSchema rejects short name', () => {
  const result = createUserSchema.safeParse({
    name: 'A',
    email: 'ada@example.com',
    password: 'Str0ng!Pass'
  });
  assert.ok(!result.success);
});

test('createUserSchema rejects invalid email', () => {
  const result = createUserSchema.safeParse({
    name: 'Ada Lovelace',
    email: 'not-an-email',
    password: 'Str0ng!Pass'
  });
  assert.ok(!result.success);
});

test('createUserSchema rejects short password', () => {
  const result = createUserSchema.safeParse({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    password: 'short'
  });
  assert.ok(!result.success);
});

test('loginSchema accepts valid credentials', () => {
  const result = loginSchema.safeParse({ email: 'ada@example.com', password: 'Str0ng!Pass' });
  assert.ok(result.success);
});

test('loginSchema rejects missing email', () => {
  const result = loginSchema.safeParse({ email: '', password: 'Str0ng!Pass' });
  assert.ok(!result.success);
});

test('forgotPasswordSchema accepts valid email', () => {
  const result = forgotPasswordSchema.safeParse({ email: 'ada@example.com' });
  assert.ok(result.success);
});

test('resetPasswordSchema accepts token and password', () => {
  const result = resetPasswordSchema.safeParse({ token: 'abcdef123456', password: 'Str0ng!Pass' });
  assert.ok(result.success);
});

test('resetPasswordSchema rejects short token', () => {
  const result = resetPasswordSchema.safeParse({ token: 'abc', password: 'Str0ng!Pass' });
  assert.ok(!result.success);
});
