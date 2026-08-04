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

test('sets sentence membership without duplicates', () => {
  assert.deepEqual(core.setSentenceMembership(['a', 'b'], 'a', true), ['a', 'b']);
  assert.deepEqual(core.setSentenceMembership(['a', 'b'], 'c', true), ['a', 'b', 'c']);
  assert.deepEqual(core.setSentenceMembership(['a', 'b'], 'a', false), ['b']);
});

test('prefers hard status over mastered status', () => {
  assert.equal(core.getSentenceStatus('1', ['1'], ['1']), 'hard');
  assert.equal(core.getSentenceStatus('2', [], ['2']), 'mastered');
  assert.equal(core.getSentenceStatus('3', [], []), 'new');
});

test('summarizes scene progress from hard and mastered ids', () => {
  const result = core.createSceneProgress(['1', '2', '3'], ['2'], ['1', '3']);
  assert.deepEqual(result, { total: 3, hard: 1, mastered: 2, remaining: 1 });
});

test('picks a random scene that still has unmastered sentences', () => {
  const scenes = [
    { subName: 'done', itemIds: ['a'] },
    { subName: 'ready', itemIds: ['b', 'c'] }
  ];
  assert.equal(core.pickRandomUnmasteredScene(scenes, ['a'], () => 0).subName, 'ready');
});

test('filters mastered sentences from a normal practice pool', () => {
  const pool = [
    { id: 'a', en: 'A' },
    { id: 'b', en: 'B' },
    { id: 'c', en: 'C' }
  ];

  assert.deepEqual(core.filterPracticePool(pool, ['b']), [
    { id: 'a', en: 'A' },
    { id: 'c', en: 'C' }
  ]);
});

test('builds a hard practice pool from only marked-hard sentences', () => {
  const pool = [
    { id: 'a', en: 'A' },
    { id: 'b', en: 'B' },
    { id: 'c', en: 'C' }
  ];

  assert.deepEqual(core.filterHardPracticePool(pool, ['c', 'missing', 'a']).map(item => item.id), ['a', 'c']);
});

test('reads hand-written sentence study notes from array metadata', () => {
  const notes = core.getSentenceStudyNotes([
    'Grab the broom and dustpan.',
    '把扫帚和簸箕拿过来。',
    {
      key: ['broom', 'dustpan'],
      power: ['grab'],
      sentence: ['Grab the ... and ...']
    }
  ]);

  assert.deepEqual(notes.key, ['broom', 'dustpan']);
  assert.deepEqual(notes.power, ['grab']);
  assert.deepEqual(notes.sentence, ['Grab the ... and ...']);
});

test('does not invent study notes for older plain sentences', () => {
  const notes = core.getSentenceStudyNotes([
    'Pass me the remote.',
    '把遥控器递给我。'
  ]);

  assert.deepEqual(notes.key, []);
  assert.deepEqual(notes.power, []);
  assert.deepEqual(notes.sentence, []);
});

test('does not turn scene words into sentence tags without hand-written metadata', () => {
  const notes = core.getSentenceStudyNotes(
    ['Could I have the receipt, please?', '能给我小票吗？'],
    [{ term: 'receipt', zh: '小票' }]
  );

  assert.deepEqual(notes.key, []);
  assert.deepEqual(notes.power, []);
  assert.deepEqual(notes.sentence, []);
});

test('does not invent a universal sentence when there is no reusable frame', () => {
  const notes = core.getSentenceStudyNotes([
    "Dinner's ready.",
    '饭好了。'
  ]);

  assert.deepEqual(notes.key, []);
  assert.deepEqual(notes.sentence, []);
});

test('keeps a manually written universal sentence when provided', () => {
  const notes = core.getSentenceStudyNotes([
    'Pass me the remote.',
    '把遥控器递给我。',
    { sentence: ['Pass me ...'] }
  ]);

  assert.deepEqual(notes.sentence, ['Pass me ...']);
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

test('includes the fourth Germany first-week scene batch in the page data', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('德国手机上网'));
  assert.ok(html.includes('德国打车接送'));
  assert.ok(html.includes('德国药店求助'));
  assert.ok(html.includes('SIM card'));
  assert.ok(html.includes('pickup point'));
  assert.ok(html.includes('sore throat'));
});

test('includes the fifth Germany first-week scene batch in the page data', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('德国行李出问题'));
  assert.ok(html.includes('德国工厂参观'));
  assert.ok(html.includes('德国咖啡面包店'));
  assert.ok(html.includes('missing suitcase'));
  assert.ok(html.includes('safety shoes'));
  assert.ok(html.includes('pastry'));
});

test('includes the sixth Germany first-week scene batch in the page data', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('听不懂时接话'));
  assert.ok(html.includes('展会客户现场'));
  assert.ok(html.includes('say that again'));
  assert.ok(html.includes('make sure I understood'));
  assert.ok(html.includes('booth'));
  assert.ok(html.includes('technical brochure'));
});

test('includes hand-written daily action chains in the original categories', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('辣椒炒鸡蛋一串动作'));
  assert.ok(html.includes('Take the peppers out of the fridge.'));
  assert.ok(html.includes('扫地倒垃圾一串动作'));
  assert.ok(html.includes('Can you bring me the broom and the dustpan?'));
  assert.ok(html.includes('厕所和卫生用品'));
  assert.ok(html.includes('I got my period today.'));
  assert.ok(html.includes('肚子疼和脱发怎么说'));
  assert.ok(html.includes('Could it be appendicitis?'));
  assert.ok(html.includes('请事假请病假'));
  assert.ok(html.includes('I need to take sick leave today.'));
  assert.ok(html.includes('小区和环境闲聊'));
  assert.ok(html.includes('This neighborhood is pretty quiet.'));
  assert.ok(html.includes('出门买菜到家收拾'));
  assert.ok(html.includes('Can I scan to pay?'));
  assert.ok(html.includes('QR code'));
  assert.ok(html.includes('给外国人解释中国家常饭桌'));
  assert.ok(html.includes('We usually eat family-style at home.'));
  assert.ok(html.includes('中国早餐摊'));
  assert.ok(html.includes('There is a breakfast stall near the community gate.'));
  assert.ok(html.includes('小区取快递和外卖'));
  assert.ok(html.includes('The pickup code is in the text message.'));
  assert.ok(html.includes('小区物业报修'));
  assert.ok(html.includes('I need to call property management.'));
  assert.ok(html.includes('卫生间堵了和清理'));
  assert.ok(html.includes('The shower drain is clogged again.'));
  assert.ok(html.includes('从挂号到看医生'));
  assert.ok(html.includes('I need to check in for my appointment.'));
  assert.ok(html.includes('药店买药和问用法'));
  assert.ok(html.includes('What is the dosage for an adult?'));
  assert.ok(html.includes('手机没网和付款失败'));
  assert.ok(html.includes('The payment failed, but the money may have been deducted.'));
  assert.ok(html.includes('Laundry from Basket to Closet'));
  assert.ok(html.includes('Put all the dirty clothes in the laundry basket first.'));
  assert.ok(html.includes('Neighbor Noise and Upstairs Leak'));
  assert.ok(html.includes('There is water leaking through the ceiling.'));
  assert.ok(html.includes('Talking with a Landlord'));
  assert.ok(html.includes('Does the rent include utility bills?'));
  assert.ok(html.includes('Asking for Leave from School'));
  assert.ok(html.includes('I need to ask for sick leave for him today.'));
  assert.ok(html.includes('Explaining a Haircut'));
  assert.ok(html.includes('Please do not cut it too short.'));
  assert.ok(html.includes('Using a Public Restroom'));
  assert.ok(html.includes('There is no toilet paper in this stall.'));
  assert.ok(html.includes('Period Supplies in a Hurry'));
  assert.ok(html.includes('I got my period all of a sudden.'));
  assert.ok(html.includes('Explaining Stomach Pain to a Doctor'));
  assert.ok(html.includes('What warning signs should I watch for?'));
  assert.ok(html.includes('Late Arrival and Extending Leave'));
  assert.ok(html.includes('I need to extend my leave by one day.'));
  assert.ok(html.includes('Showing Someone Around the Neighborhood'));
  assert.ok(html.includes('Some people do square dancing here in the evening.'));
  assert.ok(html.includes('Rice Cooker and Leftover Rice'));
  assert.ok(html.includes('Rinse the rice twice until the water looks clearer.'));
  assert.ok(html.includes("Visiting Someone's Home"));
  assert.ok(html.includes('Should I take off my shoes?'));
  assert.ok(html.includes('Toothache and Dentist Visit'));
  assert.ok(html.includes('I need to book a dental appointment.'));
  assert.ok(html.includes('Self-Checkout Problems in Germany'));
  assert.ok(html.includes('The machine says unexpected item in the bagging area.'));
  assert.ok(html.includes('Wrong Train and Transfer Fixes'));
  assert.ok(html.includes('I think I got on the wrong train.'));
  assert.ok(html.includes('Shared Laundry Room and Dryer'));
  assert.ok(html.includes('The laundry room is downstairs.'));
  assert.ok(html.includes('Trash Sorting in Germany'));
  assert.ok(html.includes('How does trash sorting work here?'));
  assert.ok(html.includes('Lost Phone and Blocking Cards'));
  assert.ok(html.includes('I need to block my card as soon as possible.'));
  assert.ok(html.includes('Airport Security Step by Step'));
  assert.ok(html.includes('Do I need to take out my laptop?'));
  assert.ok(html.includes('ATM and Bank Card Problems'));
  assert.ok(html.includes('My card is stuck in the ATM.'));
});

test('page stays usable without external font cdn links', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.equal(html.includes('fonts.googleapis.com'), false);
  assert.equal(html.includes('fonts.gstatic.com'), false);
});

test('service worker asks the network before falling back to old cache', () => {
  const worker = fs.readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8');
  const fetchIndex = worker.indexOf('fetch(e.request).then');
  const cacheIndex = worker.indexOf('caches.match(e.request)');

  assert.ok(fetchIndex >= 0);
  assert.ok(cacheIndex > fetchIndex);
});
