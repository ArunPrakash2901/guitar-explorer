const assert = require('assert');
const Music = require('./music.js');

assert.deepStrictEqual(Music.getMajorTriad('A'), ['A', 'C#', 'E']);
assert.deepStrictEqual(Music.getMajorTriad('Bb'), ['Bb', 'D', 'F']);
assert.deepStrictEqual(Music.getMajorTriad('F#'), ['F#', 'A#', 'C#']);
assert.deepStrictEqual(Music.getMajorTriad('Eb'), ['Eb', 'G', 'Bb']);
assert.deepStrictEqual(Music.spellMajorScale('A'), ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#']);
assert.strictEqual(Music.getInterval('A', 'C#').name, 'Major 3rd');
assert.strictEqual(Music.getInterval('A', 'E').name, 'Perfect 5th');
assert.strictEqual(Music.getInterval('C', 'F').name, 'Perfect 4th');
assert.deepStrictEqual(Music.getCagedVoicing('A', 'G'), [5, 4, 2, 2, 2, 5]);
assert.deepStrictEqual(Music.getMajorProgression('A').map(c => c.root), ['A', 'D', 'E', 'A']);
assert.deepStrictEqual(Music.getMajorProgression('Bb').map(c => c.notes), [
  ['Bb', 'D', 'F'], ['Eb', 'G', 'Bb'], ['F', 'A', 'C'], ['Bb', 'D', 'F'],
]);
console.log('music tests passed');
assert.deepStrictEqual(Music.spellMajorScale('C#'), ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#']);
assert.deepStrictEqual(Music.getMajorProgression('C#').map(c => c.root), ['C#', 'F#', 'G#', 'C#']);
