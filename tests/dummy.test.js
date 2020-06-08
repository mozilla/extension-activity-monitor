import Dummy from '../src/lib/Dummy';

test('just a dummy test', () => {
  const dummy = new Dummy();
  expect(dummy.setname('john doe')).toBe('john doe');
});
