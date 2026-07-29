const assert = require('assert');
const fs = require('fs');
const path = require('path');
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

test('creates ordered question ids without shuffling', () => {
  const ids = core.createQuestionIds([{ id: 'a' }, { id: 'b' }, { id: 'c' }], 'ordered', 2);
  assert.deepEqual(ids, ['a', 'b']);
});

test('creates random question ids only when random order is selected', () => {
  const ids = core.createQuestionIds([{ id: 'a' }, { id: 'b' }, { id: 'c' }], 'random', 3, () => 0);
  assert.deepEqual(ids, ['b', 'c', 'a']);
});

test('practice navigation can move backward and forward within bounds', () => {
  assert.equal(core.getPracticeNavigationIndex(1, -1, 3), 0);
  assert.equal(core.getPracticeNavigationIndex(1, 1, 3), 2);
  assert.equal(core.getPracticeNavigationIndex(0, -1, 3), 0);
  assert.equal(core.getPracticeNavigationIndex(2, 1, 3), 3);
});

test('builds a dictionary map from hand-written scene word notes', () => {
  const map = core.createDictionaryMap([
    {
      term: 'broom',
      zh: '扫帚',
      explain: 'A tool used to sweep the floor.',
      example: 'I use a broom to sweep the floor.'
    },
    {
      term: 'trash can',
      zh: '垃圾桶',
      explain: 'A container for trash.',
      example: 'Throw it into the trash can.'
    }
  ]);
  assert.equal(map.get('broom').zh, '扫帚');
  assert.equal(map.get('trash can').example, 'Throw it into the trash can.');
});

test('finds dictionary entries case-insensitively', () => {
  const words = [
    {
      term: 'water stain',
      zh: '水渍',
      explain: 'A mark left by water.',
      example: 'There is a water stain near the door.'
    }
  ];
  assert.equal(core.findDictionaryEntry(words, 'Water Stain').zh, '水渍');
});

test('picks a deterministic random dictionary word', () => {
  const words = [
    { term: 'floor', zh: '地面', explain: 'Surface.', example: 'The floor is dirty.' },
    { term: 'mop', zh: '拖把', explain: 'Tool.', example: 'I mop the floor.' },
    { term: 'crumbs', zh: '碎屑', explain: 'Small pieces.', example: 'There are crumbs on the floor.' }
  ];
  assert.equal(core.pickRandomDictionaryEntry(words, () => 0.5).term, 'mop');
});

test('validates scene word notes have all dictionary fields', () => {
  const result = core.validateSceneWords([
    {
      term: 'passport',
      zh: '护照',
      explain: 'The booklet you show when you enter another country.',
      example: 'May I see your passport?',
      note: '机场柜台、海关、酒店都可能会用到。'
    },
    {
      term: 'platform',
      zh: '站台',
      explain: 'The place where you wait for a train.',
      example: 'Which platform does the train leave from?',
      note: '坐火车时比 station 更具体。'
    }
  ]);

  assert.deepEqual(result, []);
});

test('reports missing dictionary fields by term', () => {
  const result = core.validateSceneWords([
    {
      term: 'boarding pass',
      zh: '登机牌',
      example: 'Here is my boarding pass.'
    }
  ]);

  assert.deepEqual(result, [
    { term: 'boarding pass', missing: ['explain', 'note'] }
  ]);
});

test('matches scene word notes during local search', () => {
  const words = [
    {
      term: 'lost wallet',
      zh: '钱包丢了',
      explain: 'A wallet that you cannot find.',
      example: 'I think I lost my wallet.',
      note: '先说 I think 比直接下结论更自然。'
    }
  ];

  assert.equal(core.sceneWordsMatchQuery(words, 'lost wallet'), true);
  assert.equal(core.sceneWordsMatchQuery(words, '钱包'), true);
  assert.equal(core.sceneWordsMatchQuery(words, 'train'), false);
});

test('includes the second Germany first-week scene batch in the page data', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('德国酒店入住'));
  assert.ok(html.includes('德国超市买东西'));
  assert.ok(html.includes('room key'));
  assert.ok(html.includes('bottle deposit'));
});

test('includes the third Germany first-week scene batch in the page data', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('德国餐厅点餐'));
  assert.ok(html.includes('客户见面寒暄'));
  assert.ok(html.includes('突发情况求助'));
  assert.ok(html.includes('tap water'));
  assert.ok(html.includes('business card'));
  assert.ok(html.includes('lost wallet'));
});
