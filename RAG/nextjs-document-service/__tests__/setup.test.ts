/**
 * Basic test to verify testing setup is working
 */

describe('Testing Setup', () => {
  it('should run Jest tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should have access to Node.js environment', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });

  it('should support async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  it('should support mocking', () => {
    const mockFn = jest.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});