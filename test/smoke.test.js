const assert = require('assert');

describe('CI smoke', () => {
  it('runs at least one test', () => {
    assert.strictEqual(1, 1);
  });
});
