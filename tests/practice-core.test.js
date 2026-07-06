const assert = require('assert');
const core = require('../practice-core');

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test('matches without final period', () => {
  assert.equal(core.isAnswerCorrect('put the bowl in the sink', 'Put the bowl in the sink.'), true);
});

test('matches when user omits final punctuation', () => {
  assert.equal(core.isAnswerCorrect('Put the bowl in the sink', 'Put the bowl in the sink.'), true);
});

test('matches with repeated spaces', () => {
  assert.equal(core.isAnswerCorrect('put   the bowl in the sink', 'Put the bowl in the sink.'), true);
});

test('detects a missing middle word without index drift', () => {
  const diff = core.compareWords('Put bowl in the sink.', 'Put the bowl in the sink.');
  assert.deepEqual(diff.missing, ['the']);
  assert.deepEqual(diff.extra, []);
});

test('suggests a likely spelling correction', () => {
  const diff = core.compareWords('Put the bowel in the sink.', 'Put the bowl in the sink.');
  assert.deepEqual(diff.typos, [{ from: 'bowel', to: 'bowl' }]);
});

test('matches do not with don apostrophe t', () => {
  assert.equal(core.isAnswerCorrect('Do not forget your homework.', "Don't forget your homework."), true);
});

test('matches i am with i apostrophe m', () => {
  assert.equal(core.isAnswerCorrect('I am tired.', "I'm tired."), true);
});

test('matches it is with it apostrophe s', () => {
  assert.equal(core.isAnswerCorrect('It is your turn.', "It's your turn."), true);
});

test('detects a missing first word', () => {
  const diff = core.compareWords('the bowl in the sink.', 'Put the bowl in the sink.');
  assert.deepEqual(diff.missing, ['put']);
});

test('detects a missing middle word', () => {
  const diff = core.compareWords('Put the bowl the sink.', 'Put the bowl in the sink.');
  assert.deepEqual(diff.missing, ['in']);
});

test('detects a missing last word', () => {
  const diff = core.compareWords('Put the bowl in the.', 'Put the bowl in the sink.');
  assert.deepEqual(diff.missing, ['sink']);
});

test('detects an extra word', () => {
  const diff = core.compareWords('Put the clean bowl in the sink.', 'Put the bowl in the sink.');
  assert.deepEqual(diff.extra, ['clean']);
});

test('matches different case', () => {
  assert.equal(core.isAnswerCorrect('PUT THE BOWL IN THE SINK', 'Put the bowl in the sink.'), true);
});

test('matches final period differences', () => {
  assert.equal(core.isAnswerCorrect('Put the bowl in the sink.', 'Put the bowl in the sink'), true);
});

test('matches final question mark differences', () => {
  assert.equal(core.isAnswerCorrect('Are you ready', 'Are you ready?'), true);
});

test('matches final exclamation differences', () => {
  assert.equal(core.isAnswerCorrect('Good job', 'Good job!'), true);
});

test('normalizes common Chinese punctuation typed by mistake', () => {
  assert.equal(core.isAnswerCorrect('Put the bowl in the sink。', 'Put the bowl in the sink.'), true);
});

test('does not pass an empty answer', () => {
  assert.equal(core.isAnswerCorrect('', 'Put the bowl in the sink.'), false);
});

test('guards against repeated answer submission', () => {
  const guard = core.createSubmitGuard();
  assert.equal(guard.tryStart(), true);
  assert.equal(guard.tryStart(), false);
  guard.done();
  assert.equal(guard.tryStart(), true);
});

test('empty speech recognition result does not submit', () => {
  const result = core.applySpeechTranscript('previous answer', '   ');
  assert.equal(result.value, 'previous answer');
  assert.equal(result.shouldSubmit, false);
  assert.equal(result.hasTranscript, false);
});
