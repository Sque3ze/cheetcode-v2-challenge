const IS_TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === 'true';

export function testAttr(name: string, value?: string): Record<string, string> {
  if (!IS_TEST_MODE) return {};
  return { [`data-${name}`]: value ?? '' };
}
