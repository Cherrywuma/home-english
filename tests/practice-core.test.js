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
  assert.ok(html.includes('Buying Toiletries at a Drugstore'));
  assert.ok(html.includes('Do you have body wash for sensitive skin?'));
  assert.ok(html.includes('Hotel Room Problems and Room Change'));
  assert.ok(html.includes('Could I request a room change if this cannot be fixed?'));
  assert.ok(html.includes('Calling to Book a Doctor Appointment'));
  assert.ok(html.includes('Could I get the earliest available appointment?'));
  assert.ok(html.includes('Sending Packages and Returns in Germany'));
  assert.ok(html.includes('Could I have the tracking number?'));
  assert.ok(html.includes('Cooking Noodles and Dumplings'));
  assert.ok(html.includes('Put the dumplings into the boiling water one by one.'));
  assert.ok(html.includes('Clothes Sizes and Returns'));
  assert.ok(html.includes('Can I exchange this for a different size?'));
  assert.ok(html.includes('Ticket Machine and Ticket Check'));
  assert.ok(html.includes('Do I need to validate this ticket before I get on?'));
  assert.ok(html.includes('Video Meeting and Screen Sharing'));
  assert.ok(html.includes('I think your microphone is muted.'));
  assert.ok(html.includes('Apartment Move-in Check'));
  assert.ok(html.includes('Can we do a move-in check together?'));
  assert.ok(html.includes('Getting Off Work'));
  assert.ok(html.includes('What time do you get off work?'));
  assert.ok(html.includes('After Work and Heading Home'));
  assert.ok(html.includes('Do you want to grab dinner after work?'));
  assert.ok(html.includes('Clocking In and Work Shifts'));
  assert.ok(html.includes('Please remind me to clock out before I leave.'));
  assert.ok(html.includes('Commute to Work and Arriving'));
  assert.ok(html.includes('I am on my way to work.'));
  assert.ok(html.includes('Starting the Workday'));
  assert.ok(html.includes('What is the top priority this morning?'));
  assert.ok(html.includes('Lunch Break at Work'));
  assert.ok(html.includes('I brought lunch today.'));
  assert.ok(html.includes('Overtime and Wrapping Up'));
  assert.ok(html.includes('Let me send out this file before I leave.'));
  assert.ok(html.includes('Weekend, Rest, and Comp Time'));
  assert.ok(html.includes('I am trying to keep a better work-life balance.'));
  assert.ok(html.includes('Finding a Restroom Politely'));
  assert.ok(html.includes('May I use your bathroom?'));
  assert.ok(html.includes('Awkward Bathroom Moments'));
  assert.ok(html.includes('The toilet seems clogged.'));
  assert.ok(html.includes('Tracking Stomach Symptoms'));
  assert.ok(html.includes('My pain level is about seven out of ten.'));
  assert.ok(html.includes('Hair Loss and Scalp Problems'));
  assert.ok(html.includes('My hairline seems to be moving back.'));
  assert.ok(html.includes('Buying Small Health Items at a Pharmacy'));
  assert.ok(html.includes('Do you sell thermometers?'));
  assert.ok(html.includes('Bus and Tram Basics'));
  assert.ok(html.includes('Do I need to press the stop button?'));
  assert.ok(html.includes('Train Delay and Route Changes'));
  assert.ok(html.includes('Can I get a delay certificate for work?'));
  assert.ok(html.includes('City Office Appointment in Germany'));
  assert.ok(html.includes('Which counter should I go to?'));
  assert.ok(html.includes('Address Registration and Forms'));
  assert.ok(html.includes('I am here for address registration.'));
  assert.ok(html.includes('Explaining a Chinese Residential Community'));
  assert.ok(html.includes('This is a typical residential community in China.'));
  assert.ok(html.includes('Fridge Check and Food Storage'));
  assert.ok(html.includes('Check the expiration date before you use it.'));
  assert.ok(html.includes('Setting Up Seasonings Before Cooking'));
  assert.ok(html.includes('Get the seasonings ready before you turn on the heat.'));
  assert.ok(html.includes('Steaming Fish, Eggs, and Buns'));
  assert.ok(html.includes('Steam the fish for eight to ten minutes.'));
  assert.ok(html.includes('Pan-Frying Without Sticking'));
  assert.ok(html.includes('Flip it when the bottom is golden brown.'));
  assert.ok(html.includes('Making Soup and Broth'));
  assert.ok(html.includes('Skim the foam off the soup after it boils.'));
  assert.ok(html.includes('Small Kitchen Appliances'));
  assert.ok(html.includes('Which setting should I use for this?'));
  assert.ok(html.includes('Kitchen Burns and Small Cuts'));
  assert.ok(html.includes('I cut my finger while slicing the onion.'));
  assert.ok(html.includes('Dishes, Sink, and Kitchen Reset'));
  assert.ok(html.includes("Let's reset the kitchen before bed."));
  assert.ok(html.includes('Leafy Greens Prep and Stir-Fry'));
  assert.ok(html.includes('Separate the leaves so the dirt can come out.'));
  assert.ok(html.includes('Root Vegetables, Gourds, and Firm Vegetables'));
  assert.ok(html.includes('Slice the lotus root and rinse the holes clean.'));
  assert.ok(html.includes('Mushrooms, Tofu, and Soy Products'));
  assert.ok(html.includes('Be gentle with soft tofu because it breaks easily.'));
  assert.ok(html.includes('Aromatics, Herbs, and Removing Smell'));
  assert.ok(html.includes('Ginger and cooking wine can help reduce the fishy smell.'));
  assert.ok(html.includes('Knives, Boards, and Cutting Tools'));
  assert.ok(html.includes('Use separate boards for raw meat and vegetables.'));
  assert.ok(html.includes('Pots, Pans, Bowls, and Measuring Tools'));
  assert.ok(html.includes('Use the ladle to serve the soup.'));
  assert.ok(html.includes('Meat Prep and Marinating'));
  assert.ok(html.includes('Cut the beef against the grain so it is easier to chew.'));
  assert.ok(html.includes('Fish, Shrimp, and Shellfish Prep'));
  assert.ok(html.includes('Devein the shrimp before you stir-fry them.'));
  assert.ok(html.includes('Everyday Egg Dishes'));
  assert.ok(html.includes('Pour the eggs slowly into the soup to make egg drop soup.'));
  assert.ok(html.includes('Staples, Dough, and Breakfast Carbs'));
  assert.ok(html.includes('Let the dough rest for twenty minutes.'));
  assert.ok(html.includes('Sauces, Oils, Salt, Sugar, and Vinegar'));
  assert.ok(html.includes('Use light soy sauce for flavor and dark soy sauce for color.'));
  assert.ok(html.includes('Morning Kitchen Routine'));
  assert.ok(html.includes('Pack lunch before the kitchen gets messy.'));
  assert.ok(html.includes('Kitchen Problems and Quick Fixes'));
  assert.ok(html.includes('The stove will not light.'));
  assert.ok(html.includes('Plating, Packing, and Taking Food Out'));
  assert.ok(html.includes('Put the sauce in a separate container.'));
  assert.ok(html.includes('Pantry Staples and Dry Goods'));
  assert.ok(html.includes('Put the flour in an airtight container.'));
  assert.ok(html.includes('Frozen Food and Quick Dinner'));
  assert.ok(html.includes('Can I cook this from frozen, or should I thaw it first?'));
  assert.ok(html.includes('Oven Baking and Roasting'));
  assert.ok(html.includes('Line the baking tray with parchment paper.'));
  assert.ok(html.includes('Washing and Cutting Fruit'));
  assert.ok(html.includes('Core the apple and cut it into slices.'));
  assert.ok(html.includes('Tea, Coffee, and Kitchen Drinks'));
  assert.ok(html.includes('Let the tea steep for three minutes.'));
  assert.ok(html.includes('Meal Planning and Grocery List'));
  assert.ok(html.includes('Use up the spinach first before it goes bad.'));
  assert.ok(html.includes('Kids Helping in the Kitchen'));
  assert.ok(html.includes('Stand on this side, away from the hot stove.'));
  assert.ok(html.includes('Kitchen Smell, Grease, and Food Waste'));
  assert.ok(html.includes('Wipe grease off the stove before it gets sticky.'));
  assert.ok(html.includes('Dumpling Filling and Wrapping'));
  assert.ok(html.includes('Pinch the edges tightly so the dumpling stays closed.'));
  assert.ok(html.includes('Hot Pot Prep at Home'));
  assert.ok(html.includes('Mix your dipping sauce in a small bowl.'));
  assert.ok(html.includes('Cold Dishes and Simple Sides'));
  assert.ok(html.includes('Smash the cucumber with the side of the knife.'));
  assert.ok(html.includes('Basic Baking and Simple Desserts'));
  assert.ok(html.includes('Use the kitchen scale to weigh the flour.'));
  assert.ok(html.includes('Chinese Breakfast Snacks at Home'));
  assert.ok(html.includes('Heat the fried dough stick in the air fryer if it has gone soft.'));
  assert.ok(html.includes('Pickles, Quick Pickles, and Make-Ahead Flavor'));
  assert.ok(html.includes('Salt the vegetables first to draw out moisture.'));
  assert.ok(html.includes('Turning Leftovers Into New Meals'));
  assert.ok(html.includes('This feels like a new meal now.'));
  assert.ok(html.includes('Deep Cleaning the Kitchen'));
  assert.ok(html.includes('Take out the range hood filter carefully.'));
  assert.ok(html.includes('Squat Toilet and Sitting Toilet Details'));
  assert.ok(html.includes('Face the right way when you use a squat toilet.'));
  assert.ok(html.includes('Public Restroom Buttons and Stalls'));
  assert.ok(html.includes('Press the flush button firmly once.'));
  assert.ok(html.includes('Period Leak and Cleanup'));
  assert.ok(html.includes('I need to check if it leaked onto my pants.'));
  assert.ok(html.includes('Shower, Hair Wash, and Skin Care'));
  assert.ok(html.includes('Rinse the conditioner out completely.'));
  assert.ok(html.includes('Teeth, Mouth, and Small Grooming'));
  assert.ok(html.includes('The floss is stuck between my teeth.'));
  assert.ok(html.includes('Bathroom Cleaning Supplies'));
  assert.ok(html.includes('Spray the mirror and wipe it with a dry cloth.'));
  assert.ok(html.includes("Bathroom Etiquette at Someone Else's Home"));
  assert.ok(html.includes('May I use your bathroom before we leave?'));
  assert.ok(html.includes('Toilet Paper, Wet Wipes, and Disposal'));
  assert.ok(html.includes('Do not flush wet wipes unless the sign says it is okay.'));
  assert.ok(html.includes('Hair Care and Hair Falling Out'));
  assert.ok(html.includes('There is a lot of hair in the drain after I wash my hair.'));
  assert.ok(html.includes('Shaving and Small Grooming'));
  assert.ok(html.includes('Use shaving cream before you shave.'));
  assert.ok(html.includes('Small Skin Problems and Body Care'));
  assert.ok(html.includes('My skin feels irritated after I used that soap.'));
  assert.ok(html.includes('Calling In Sick and Doctor Notes'));
  assert.ok(html.includes('I need to call in sick today.'));
  assert.ok(html.includes('Fever, Cold, and Flu-Like Symptoms'));
  assert.ok(html.includes('My fever came back in the evening.'));
  assert.ok(html.includes('Medicine Schedule and Side Effects'));
  assert.ok(html.includes('I missed one dose by accident.'));
  assert.ok(html.includes('When It Feels Urgent'));
  assert.ok(html.includes('The pain is getting worse instead of better.'));
  assert.ok(html.includes("Women's Health and Private Symptoms"));
  assert.ok(html.includes('I have unusual discharge and I feel worried.'));
  assert.ok(html.includes('Work Instructions and Priorities'));
  assert.ok(html.includes('Could you show me exactly where to start?'));
  assert.ok(html.includes('When I Make a Mistake at Work'));
  assert.ok(html.includes('I made a mistake in the file and I am fixing it now.'));
  assert.ok(html.includes('Asking for Help at Work'));
  assert.ok(html.includes('Could you walk me through this step?'));
  assert.ok(html.includes('Workplace Politeness and Boundaries'));
  assert.ok(html.includes('I need a moment to think before I answer.'));
  assert.ok(html.includes('Payslip, Contract, and HR Questions'));
  assert.ok(html.includes('Who should I ask about my payslip?'));
  assert.ok(html.includes('Ticket Machine and Public Transport Passes'));
  assert.ok(html.includes('Can I buy a ticket from this machine?'));
  assert.ok(html.includes('Platforms, Delays, and Transfers'));
  assert.ok(html.includes('Which platform does the train leave from?'));
  assert.ok(html.includes('Bus, Tram, and Daily Ride'));
  assert.ok(html.includes('Does this bus stop near the city center?'));
  assert.ok(html.includes('Getting Lost and Map Help'));
  assert.ok(html.includes('Could you point me in the right direction?'));
  assert.ok(html.includes('Walking, Bike Lanes, and Street Safety'));
  assert.ok(html.includes('Stay out of the bike lane while you check the map.'));
  assert.ok(html.includes('Finding Aisles and Reading Labels'));
  assert.ok(html.includes('Which aisle has rice and noodles?'));
  assert.ok(html.includes('Weighing Fruit and Vegetables'));
  assert.ok(html.includes('Do I weigh these apples before checkout?'));
  assert.ok(html.includes('Bottle Deposit and Return Machine'));
  assert.ok(html.includes('Where is the bottle return machine?'));
  assert.ok(html.includes('Cashier, Bags, and Packing Groceries'));
  assert.ok(html.includes('I will pack the heavy items first.'));
  assert.ok(html.includes('Customer Service, Returns, and Exchanges'));
  assert.ok(html.includes('I bought this yesterday, but it does not work.'));
  assert.ok(html.includes('Verification Codes and Logging In'));
  assert.ok(html.includes('The verification code has not arrived yet.'));
  assert.ok(html.includes('Maps, Navigation, and Offline Routes'));
  assert.ok(html.includes('Can you send me the location pin?'));
  assert.ok(html.includes('Translation Apps and Taking Photos'));
  assert.ok(html.includes('I will take a photo and translate the label.'));
  assert.ok(html.includes('Hotspot, Charging, and Power Bank'));
  assert.ok(html.includes('Can I borrow your charger for ten minutes?'));
  assert.ok(html.includes('Lost Phone and Account Safety'));
  assert.ok(html.includes('I cannot find my phone, so please call it for me.'));
  assert.ok(html.includes('Handover and Checking Standards'));
  assert.ok(html.includes('Let me give you a quick handover before I leave.'));
  assert.ok(html.includes('Skin, Eyes, and Allergy Details'));
  assert.ok(html.includes('My eyelid is swollen this morning.'));
  assert.ok(html.includes('Explaining Chinese Hospitality'));
  assert.ok(html.includes('We usually eat family-style at home.'));
  assert.ok(html.includes('Utilities and Internet Setup'));
  assert.ok(html.includes('Do I need to set up the utilities myself?'));
  assert.ok(html.includes('Bedding and Sleep Setup'));
  assert.ok(html.includes('Put the duvet into the cover and shake it out.'));
  assert.ok(html.includes('Test Results and Follow-up Visit'));
  assert.ok(html.includes('Could you explain the result in simple words?'));
  assert.ok(html.includes('After-Meeting Email Follow-up'));
  assert.ok(html.includes('This is a gentle reminder about the file we discussed yesterday.'));
  assert.ok(html.includes('Bank Account and Payment Setup'));
  assert.ok(html.includes('How do I activate online banking?'));
  assert.ok(html.includes('Entryway, Shoes, and Keys'));
  assert.ok(html.includes('Lock the door and pull it once to check.'));
  assert.ok(html.includes('Corner Store Downstairs'));
  assert.ok(html.includes('Do you need anything from the convenience store?'));
  assert.ok(html.includes('Elevator Small Talk with Neighbors'));
  assert.ok(html.includes('Could you hold the door for a second?'));
  assert.ok(html.includes('Property Notices and Community Office'));
  assert.ok(html.includes('It says there will be a water outage tomorrow morning.'));
  assert.ok(html.includes('End-of-Day Handover Checklist'));
  assert.ok(html.includes('Let me do a quick handover before I leave.'));
  assert.ok(html.includes('Back From Leave and Catching Up'));
  assert.ok(html.includes('I need to catch up on what I missed.'));
  assert.ok(html.includes('First Week at Work in Germany'));
  assert.ok(html.includes('Please correct me if I do something the wrong way.'));
  assert.ok(html.includes('Pharmacy Help for Stomach Problems'));
  assert.ok(html.includes('I have an upset stomach and I am not sure what to buy.'));
  assert.ok(html.includes('Running Out of Period Supplies'));
  assert.ok(html.includes('Do you have a spare pad I can use?'));
  assert.ok(html.includes('Texting a Manager When Sick'));
  assert.ok(html.includes('I will send a handover note before noon.'));
  assert.ok(html.includes('Viewing a Place and Talking About the Area'));
  assert.ok(html.includes('The greenery in this community is really nice.'));
  assert.ok(html.includes('Neighbor Noise and Quiet Hours'));
  assert.ok(html.includes('Could you keep it down a little after ten?'));
  assert.ok(html.includes('Parking, Bike Storage, and Basement Storage'));
  assert.ok(html.includes('Is basement storage included?'));
  assert.ok(html.includes('Morning Bathroom Rush'));
  assert.ok(html.includes('There is a bathroom rush every morning.'));
  assert.ok(html.includes('Toilet, Drain, and Hot Water Repair'));
  assert.ok(html.includes('The toilet will not flush properly.'));
  assert.ok(html.includes('After-Shower Cleanup and Slip Prevention'));
  assert.ok(html.includes('Step onto the bath mat so you do not slip.'));
  assert.ok(html.includes('Explaining Myself During a Ticket Check'));
  assert.ok(html.includes('My ticket is in the app, but it is not loading.'));
  assert.ok(html.includes('When I Cannot Understand Station Announcements'));
  assert.ok(html.includes('Was there a platform change?'));
  assert.ok(html.includes('Last Train and Getting Home Late'));
  assert.ok(html.includes('I think I missed the last train.'));
  assert.ok(html.includes('Real End-of-Work Conversations'));
  assert.ok(html.includes('I want to leave on time today if nothing urgent comes up.'));
  assert.ok(html.includes('Leaving My Desk for a Moment'));
  assert.ok(html.includes('I need to step away for a moment.'));
  assert.ok(html.includes('Overtime Without Forcing Myself'));
  assert.ok(html.includes('If I rush it now, I may make mistakes.'));
  assert.ok(html.includes('Covering Shifts and Helping Coworkers'));
  assert.ok(html.includes('Can we swap shifts this Friday?'));
  assert.ok(html.includes('Supermarket Shopping to Checkout'));
  assert.ok(html.includes('Do I need to weigh the bananas myself?'));
  assert.ok(html.includes('Payment Failed and Card Problems'));
  assert.ok(html.includes('My card was declined, but I do not know why.'));
  assert.ok(html.includes('Self-Checkout and Bagging Items'));
  assert.ok(html.includes('How do I scan loose produce?'));
  assert.ok(html.includes('Bottle Deposit and Reusable Bags'));
  assert.ok(html.includes('Can I use this voucher at the checkout?'));
  assert.ok(html.includes('Returns, Exchanges, and Receipts'));
  assert.ok(html.includes('Is it a refund to my card or store credit?'));
  assert.ok(html.includes('Splitting Bills and Paying Friends Back'));
  assert.ok(html.includes('How much is my share?'));
  assert.ok(html.includes('Checking the Weather and Getting Dressed'));
  assert.ok(html.includes('Wear layers today so you can take one off later.'));
  assert.ok(html.includes('Rain, Snow, and Slippery Roads'));
  assert.ok(html.includes('The steps are icy. Hold the handrail.'));
  assert.ok(html.includes('Making and Changing Plans'));
  assert.ok(html.includes('Could we move it earlier by half an hour?'));
  assert.ok(html.includes('Running Late and Missing the Time'));
  assert.ok(html.includes('I may not make it on time.'));
  assert.ok(html.includes('Dates, Months, and Appointment Clarity'));
  assert.ok(html.includes('Is it next week or the week after?'));
  assert.ok(html.includes('Daily Schedule and Alarms'));
  assert.ok(html.includes('I hit snooze twice and almost overslept.'));
  assert.ok(html.includes('Faucet, Sink, and Drain Problems'));
  assert.ok(html.includes('The pipe under the sink is leaking.'));
  assert.ok(html.includes('Lights, Outlets, and Small Appliances'));
  assert.ok(html.includes('I saw a spark, so I unplugged it right away.'));
  assert.ok(html.includes('Door, Lock, Window, and Key Problems'));
  assert.ok(html.includes('I am locked out. Do you have a spare key?'));
  assert.ok(html.includes('Heating, Hot Water, and Ventilation'));
  assert.ok(html.includes('There is no hot water in the shower.'));
  assert.ok(html.includes('Booking a Repair Visit'));
  assert.ok(html.includes('What is the appointment window?'));
  assert.ok(html.includes('Cleaning Tools and Putting Things Back'));
  assert.ok(html.includes('Put the broom and dustpan back in the storage closet.'));
  assert.ok(html.includes('Family Morning Before Leaving'));
  assert.ok(html.includes('We need to leave the house in ten minutes.'));
  assert.ok(html.includes('Sharing Chores Without Fighting'));
  assert.ok(html.includes('Please do it without being asked every time.'));
  assert.ok(html.includes('Talking After an Argument'));
  assert.ok(html.includes('That sentence hurt my feelings.'));
  assert.ok(html.includes('School Pickup and Talking About Kids'));
  assert.ok(html.includes('The teacher called because he felt sick at school.'));
  assert.ok(html.includes('Calling Parents and Checking In'));
  assert.ok(html.includes('I miss home today, so I wanted to hear your voice.'));
  assert.ok(html.includes('When Something Comes Up at Home'));
  assert.ok(html.includes('Something came up at home, and I need to handle it first.'));
  assert.ok(html.includes('Lost and Finding a Safe Place'));
  assert.ok(html.includes('I do not want to walk through this quiet area alone.'));
  assert.ok(html.includes('When Someone Makes Me Feel Unsafe'));
  assert.ok(html.includes('Could you pretend you know me until that person leaves?'));
  assert.ok(html.includes('Suddenly Feeling Unwell'));
  assert.ok(html.includes('I am short of breath, and I need medical help.'));
  assert.ok(html.includes('Breaking Something by Accident'));
  assert.ok(html.includes('I dropped the glass, and it shattered.'));
  assert.ok(html.includes('Power, Internet, and Phone Battery Problems'));
  assert.ok(html.includes('The internet is down, but mobile data still works.'));
  assert.ok(html.includes('Finding Official Help and Confirming Identity'));
  assert.ok(html.includes('Could I see your ID badge, please?'));
  assert.ok(html.includes('Morning and Night Skincare Routine'));
  assert.ok(html.includes('I want a simple routine, not too many steps.'));
  assert.ok(html.includes('Everyday Makeup Routine'));
  assert.ok(html.includes('This foundation is too light for my skin tone.'));
  assert.ok(html.includes('Removing Makeup and Cleaning Tools'));
  assert.ok(html.includes('I need to remove my makeup before bed.'));
  assert.ok(html.includes('Buying Skincare and Reading Labels'));
  assert.ok(html.includes('Do you have a sample I can try first?'));
  assert.ok(html.includes('Skin Reaction After Skincare or Makeup'));
  assert.ok(html.includes('Should I stop using this product for now?'));
  assert.ok(html.includes('Touching Up Makeup and Sunscreen Outside'));
  assert.ok(html.includes('I need to reapply sunscreen before we go back outside.'));
  assert.ok(html.includes('Choosing What to Wear Every Day'));
  assert.ok(html.includes('This jacket goes with jeans.'));
  assert.ok(html.includes('Dressing for the Weather'));
  assert.ok(html.includes('Layer up today because it gets cold in the evening.'));
  assert.ok(html.includes('Shoes, Socks, and Foot Comfort'));
  assert.ok(html.includes('These shoes gave me a blister on my heel.'));
  assert.ok(html.includes('Closet Storage and Seasonal Clothes'));
  assert.ok(html.includes('Use a vacuum bag for bulky coats.'));
  assert.ok(html.includes('Small Clothing Problems and Quick Fixes'));
  assert.ok(html.includes('The zipper is stuck. Do not pull it too hard.'));
  assert.ok(html.includes('Trying on Clothes in More Detail'));
  assert.ok(html.includes('Can I try this on in two sizes?'));
  assert.ok(html.includes('Packing the Baby Bag Before Going Out'));
  assert.ok(html.includes('Put three extra diapers in the bag.'));
  assert.ok(html.includes('Stroller and Public Places'));
  assert.ok(html.includes('Could you make a little room for the stroller?'));
  assert.ok(html.includes('Messy Meals With Kids'));
  assert.ok(html.includes('There are crumbs all over the floor.'));
  assert.ok(html.includes('Diapers and Dirty Clothes'));
  assert.ok(html.includes('We had a diaper blowout in the stroller.'));
  assert.ok(html.includes('Crying, Overtired, and Soothing'));
  assert.ok(html.includes('She is overtired and cannot fall asleep.'));
  assert.ok(html.includes('Falls, Bumps, and Comforting'));
  assert.ok(html.includes('Did you fall down? Let me check your knees.'));
  assert.ok(html.includes('Reading and Replying to Teacher Messages'));
  assert.ok(html.includes('I cannot open the attachment in the school app.'));
  assert.ok(html.includes('School Gate Pickup and Being Late'));
  assert.ok(html.includes('My husband is the authorized person for pickup today.'));
  assert.ok(html.includes('Homework Struggles and Study at Home'));
  assert.ok(html.includes('Show your work, not just the answer.'));
  assert.ok(html.includes('Classmates, Friendship, and Bullying'));
  assert.ok(html.includes('Did anyone tease you or call you names?'));
  assert.ok(html.includes('School Events and What to Bring'));
  assert.ok(html.includes('Where is the bring list for the field trip?'));
  assert.ok(html.includes('When a Child Feels Unwell at School'));
  assert.ok(html.includes('He threw up at school after lunch.'));
  assert.ok(html.includes('A Day With a Cold and Cough'));
  assert.ok(html.includes('I woke up with a runny nose and a sore throat.'));
  assert.ok(html.includes('Cuts, Burns, and Small Wounds'));
  assert.ok(html.includes('I cut my finger while chopping vegetables.'));
  assert.ok(html.includes('Poor Sleep and Feeling Exhausted'));
  assert.ok(html.includes('I have had poor sleep for several nights.'));
  assert.ok(html.includes('Stress and Feeling Close to Breaking Down'));
  assert.ok(html.includes('I do not need advice right now. I just need you to listen.'));
  assert.ok(html.includes('After Taking Medicine and Checking Again'));
  assert.ok(html.includes('Should I stop taking it until I speak to a doctor?'));
  assert.ok(html.includes('After the Doctor Visit at Home'));
  assert.ok(html.includes('I need a sick note for work.'));
  assert.ok(html.includes('Restroom Codes, Coins, and Access'));
  assert.ok(html.includes('Do I need a restroom code?'));
  assert.ok(html.includes('Squat Toilet or Sitting Toilet'));
  assert.ok(html.includes('I need a sitting toilet because my knees hurt.'));
  assert.ok(html.includes('Hotel and Airbnb Bathroom'));
  assert.ok(html.includes('Is there a hot water switch I need to turn on?'));
  assert.ok(html.includes('Body Odor and Deodorant'));
  assert.ok(html.includes('Please tell me quietly if I smell sweaty.'));
  assert.ok(html.includes('Shaving, Brows, and Small Grooming Tools'));
  assert.ok(html.includes('I nicked my chin while shaving.'));
  assert.ok(html.includes('Kids Using the Toilet and Potty Training'));
  assert.ok(html.includes('You almost made it to the toilet.'));
  assert.ok(html.includes('Building Access and Forgotten Keys'));
  assert.ok(html.includes('Can you buzz me in through the intercom?'));
  assert.ok(html.includes('Wrong Package Drop-off and Finding a Parcel'));
  assert.ok(html.includes('The delivery photo shows a red door, but my door is gray.'));
  assert.ok(html.includes('Hallway, Elevator, and Shared Spaces'));
  assert.ok(html.includes('Please keep the shared space clear.'));
  assert.ok(html.includes('Trash Room and Bulky Waste'));
  assert.ok(html.includes('Flatten the cardboard before you throw it away.'));
  assert.ok(html.includes('Neighbor Greetings and Borrowing Small Things'));
  assert.ok(html.includes('Can I borrow a screwdriver for ten minutes?'));
  assert.ok(html.includes('Lost Items and Asking for Help Around the Building'));
  assert.ok(html.includes('Can property management check the camera footage if possible?'));
  assert.ok(html.includes('Last Train and Getting Home at Night'));
  assert.ok(html.includes('We missed the last train, so we need another way home.'));
  assert.ok(html.includes('Riding With Kids and Luggage'));
  assert.ok(html.includes('Do I need to fold the stroller before we get on?'));
  assert.ok(html.includes('Ticket Check on Board'));
  assert.ok(html.includes('The QR code is still loading.'));
  assert.ok(html.includes('Ride Cancelled or Cannot Find the Driver'));
  assert.ok(html.includes('I may be on the wrong side of the street.'));
  assert.ok(html.includes('Getting Around in Rain or Snow'));
  assert.ok(html.includes('The bus may be delayed by weather.'));
  assert.ok(html.includes('Shared Bikes and Scooters'));
  assert.ok(html.includes('The bike will not unlock.'));
  assert.ok(html.includes('Wrong Scanned Price and Checking the Receipt'));
  assert.ok(html.includes('The scanned price looks different from the shelf price.'));
  assert.ok(html.includes('Forgotten Items and Going Back to Buy More'));
  assert.ok(html.includes('I need to go back in for one more thing.'));
  assert.ok(html.includes('Finding Sensitive Items at a Drugstore'));
  assert.ok(html.includes('I need a little privacy while I ask this.'));
  assert.ok(html.includes('Shopping With Kids in a Busy Supermarket'));
  assert.ok(html.includes('We are not buying a checkout treat today.'));
  assert.ok(html.includes('Unpacking and Storing Groceries at Home'));
  assert.ok(html.includes('Split the meat into two portions.'));
  assert.ok(html.includes('Buying Large Items and Home Delivery'));
  assert.ok(html.includes('I need to measure the doorway before I buy it.'));
  assert.ok(html.includes('id="idiomBtn"'));
  assert.ok(html.includes('const IDIOM_LIBRARY'));
  assert.ok(html.includes('地道说法库'));
  assert.ok(html.includes('臭 / 难闻'));
  assert.ok(html.includes('It smells off.'));
  assert.ok(html.includes('闻起来不太对，好像坏了。'));
  assert.ok(html.includes('人多 / 拥挤'));
  assert.ok(html.includes('This place is packed.'));
  assert.ok(html.includes('累 / 累坏了'));
  assert.ok(html.includes('I feel drained.'));
  assert.ok(html.includes('贵 / 不划算'));
  assert.ok(html.includes('It is not worth it.'));
  assert.ok(html.includes('麻烦 / 不方便'));
  assert.ok(html.includes('Do we have a workaround?'));
  assert.ok(html.includes('I am in a rush.'));
  assert.ok(html.includes('It drives me crazy.'));
  assert.ok(html.includes('It works like a charm.'));
  assert.ok(html.includes('It does not fit right.'));
  assert.ok(html.includes('It hurts when I move.'));
  assert.ok(html.includes('I am starving.'));
  assert.ok(html.includes('I get cold easily.'));
  assert.ok(html.includes('That is a bargain.'));
  assert.ok(html.includes('I can barely keep my eyes open.'));
  assert.ok(html.includes('I am swamped today.'));
  assert.ok(html.includes('What time do you get off work?'));
  assert.ok(html.includes('I need to take a personal day.'));
  assert.ok(html.includes('The toilet is clogged.'));
  assert.ok(html.includes('My stomach hurts.'));
  assert.ok(html.includes('I have a fever.'));
  assert.ok(html.includes('I am on my period.'));
  assert.ok(html.includes('My hair is falling out.'));
  assert.ok(html.includes('There is a lot of greenery here.'));
  assert.ok(html.includes('Could you speak a little slower?'));
  assert.ok(html.includes('The soup is bland.'));
  assert.ok(html.includes('The laundry is still damp.'));
  assert.ok(html.includes('The light bulb is out.'));
  assert.ok(html.includes('My package has not arrived yet.'));
  assert.ok(html.includes('Which platform should I go to?'));
  assert.ok(html.includes('My card was declined.'));
  assert.ok(html.includes('Are there any side effects?'));
  assert.ok(html.includes('We will figure it out.'));
  assert.ok(html.includes('Could you do me a quick favor?'));
  assert.ok(html.includes('Can we reschedule?'));
  assert.ok(html.includes('Can you hear me?'));
  assert.ok(html.includes('I will text you.'));
  assert.ok(html.includes('I am on my way.'));
  assert.ok(html.includes('I have a reservation under Wang.'));
  assert.ok(html.includes('Does the rent include utilities?'));
  assert.ok(html.includes('I would like to make an appointment.'));
  assert.ok(html.includes('I just need a trim.'));
  assert.ok(html.includes('My mascara smudged.'));
  assert.ok(html.includes('Can I try this on?'));
  assert.ok(html.includes('The floor needs sweeping.'));
  assert.ok(html.includes('Good to hear from you.'));
  assert.ok(html.includes('What problem are you trying to solve?'));
  assert.ok(html.includes('Could you send me the drawing?'));
  assert.ok(html.includes('The price depends on the final configuration.'));
  assert.ok(html.includes('The lead time is about three weeks after confirmation.'));
  assert.ok(html.includes('You can test it first before placing a bigger order.'));
  assert.ok(html.includes('Please confirm the order details before payment.'));
  assert.ok(html.includes('I will share the tracking number once it is available.'));
  assert.ok(html.includes('We need your confirmation before we move forward.'));
  assert.ok(html.includes('Could you send a short video of the problem?'));
  assert.ok(html.includes('Let me check with our engineer.'));
  assert.ok(html.includes('We cannot guarantee that without testing.'));
  assert.ok(html.includes('There is not much room on the price.'));
  assert.ok(html.includes('I want to make sure we are on the same page.'));
  assert.ok(html.includes('Just checking if this is still needed.'));
  assert.ok(html.includes('Just checking if you had a chance to review the quote.'));
  assert.ok(html.includes('Did the information help?'));
  assert.ok(html.includes('Hi, just a quick follow-up.'));
  assert.ok(html.includes('I am off work now, but I will check this tomorrow morning.'));
  assert.ok(html.includes('Please note that the price is based on the current information.'));
  assert.ok(html.includes('Do you have any update on the order?'));
  assert.ok(html.includes('May I know your payment schedule?'));
  assert.ok(html.includes('I understand price is important.'));
  assert.ok(html.includes('Let us continue tomorrow.'));
  assert.ok(html.includes('data-dash-action="idioms"'));
  assert.ok(html.includes('showIdiomLibrary'));
  assert.ok(html.includes('IDIOM_CATEGORY_OPTIONS'));
  assert.ok(html.includes("id:'work-customer',label:'工作客户'"));
  assert.ok(html.includes('id="idiomCategorySelect"'));
  assert.ok(html.includes('id="idiomTopicSelect"'));
  assert.ok(html.includes('idiomTopicsForCategory'));
  assert.ok(html.includes('先选大类，再选具体主题'));
});

test('includes reusable hand-written work follow-up sentence frames', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('Following Up After a Quote'));
  assert.ok(html.includes('After Sending Information'));
  assert.ok(html.includes('Moving the Order to PI'));
  assert.ok(html.includes('After Hours and Tomorrow Reply'));
  assert.ok(html.includes('Reusable Explanation Frames'));
  assert.ok(html.includes('I just wanted to follow up on the quotation I sent yesterday.'));
  assert.ok(html.includes('If anything is unclear in the quotation, I can explain it point by point.'));
  assert.ok(html.includes('Are you ready to place the order, or do you still need to confirm something internally?'));
  assert.ok(html.includes('I am off work now, but I will check this first thing tomorrow.'));
  assert.ok(html.includes('At this stage, I suggest we confirm the basic details first.'));
});

test('includes more practical customer work sentence frames', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('Natural WhatsApp Follow-up'));
  assert.ok(html.includes('Missing Details Before Quoting'));
  assert.ok(html.includes('Price Discussion Without Awkwardness'));
  assert.ok(html.includes('Deposit, Payment, and Production Schedule'));
  assert.ok(html.includes('When I Cannot Agree Right Away'));
  assert.ok(html.includes('No pressure at all; I just wanted to know whether the information is still useful for you.'));
  assert.ok(html.includes('To quote accurately, I still need a few basic details from your side.'));
  assert.ok(html.includes('Let us find a workable option instead of only pushing the number down.'));
  assert.ok(html.includes('I am asking because we need to plan the production schedule, not because I want to pressure you.'));
  assert.ok(html.includes('Once I have a confirmed answer, I will send it to you in writing.'));
});

test('includes practical first-week abroad living sentence frames', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('First Day Abroad'));
  assert.ok(html.includes('When I Need Simpler English'));
  assert.ok(html.includes('Temporary Stay and Apartment Rules'));
  assert.ok(html.includes('When Grocery Shopping Feels Confusing'));
  assert.ok(html.includes('Laundry Abroad'));
  assert.ok(html.includes('I just arrived in Germany, so I am still trying to get oriented.'));
  assert.ok(html.includes('Could you say it another way? I understand some words, but not the full meaning.'));
  assert.ok(html.includes('How does recycling work here? I do not want to put trash in the wrong place.'));
  assert.ok(html.includes('I am not sure how to use the self-checkout. Could you help me with the first item?'));
  assert.ok(html.includes('How do I use this washing machine? The buttons are different from the ones at home.'));
});

test('includes hand-written word path library for vocabulary memory', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('id="wordPathBtn"'));
  assert.ok(html.includes('data-dash-action="wordpaths"'));
  assert.ok(html.includes('const WORD_PATH_LIBRARY'));
  assert.ok(html.includes('showWordPathLibrary'));
  assert.ok(html.includes('renderWordPathCards'));
  assert.ok(html.includes('wordPathIndexHtml'));
  assert.ok(html.includes('catName:\'单词路径\''));
  assert.ok(html.includes('re-: again or back'));
  assert.ok(html.includes('un-: not or reverse'));
  assert.ok(html.includes('-er: person or tool'));
  assert.ok(html.includes('-able: can be done'));
  assert.ok(html.includes('port: carry'));
  assert.ok(html.includes('Common daily verb pairs'));
  assert.ok(html.includes('Power verbs for life and work'));
  assert.ok(html.includes('Airport and Documents'));
  assert.ok(html.includes('Hotel and Apartment'));
  assert.ok(html.includes('Shopping and Payment'));
  assert.ok(html.includes('Quotation and Order'));
  assert.ok(html.includes('Shipping and Logistics'));
  assert.ok(html.includes('Customer Follow-up'));
  assert.ok(html.includes('Medical and Pharmacy'));
  assert.ok(html.includes('Train, Metro, and Street Signs'));
  assert.ok(html.includes('Restaurant, Cafe, and Food'));
  assert.ok(html.includes('Phone, Internet, and Accounts'));
  assert.ok(html.includes('Company Documents'));
  assert.ok(html.includes('Payment and Banking'));
  assert.ok(html.includes('Technical and Quality'));
  assert.ok(html.includes('After-sales and Problems'));
  assert.ok(html.includes('Weather and Clothing'));
  assert.ok(html.includes('Bathroom and Cleaning Supplies'));
  assert.ok(html.includes('Appliances and Repair'));
  assert.ok(html.includes('Children and School'));
  assert.ok(html.includes('Government and Administration'));
  assert.ok(html.includes('Safety and Emergency'));
  assert.ok(html.includes('Office and Meeting'));
  assert.ok(html.includes('Exhibition and Customer Visit'));
  assert.ok(html.includes('Supermarket Ingredients'));
  assert.ok(html.includes('Seasoning and Cooking'));
  assert.ok(html.includes('Bank and Post Office'));
  assert.ok(html.includes('Hair, Beauty, and Personal Care'));
  assert.ok(html.includes('Clothes, Shoes, and Laundry'));
  assert.ok(html.includes('Community and Neighborhood'));
  assert.ok(html.includes('Feelings and Communication'));
  assert.ok(html.includes('Packaging and Labels'));
  assert.ok(html.includes('Body Parts and Discomfort'));
  assert.ok(html.includes('City Directions and Places'));
  assert.ok(html.includes('Taxi and Ride-hailing'));
  assert.ok(html.includes('Time, Numbers, and Scheduling'));
  assert.ok(html.includes('Factory and Production'));
  assert.ok(html.includes('Materials, Tools, and Hardware'));
  assert.ok(html.includes('Price Negotiation'));
  assert.ok(html.includes('Customs and Trade Documents'));
  assert.ok(html.includes('Road and Public Sign Words in Germany'));
  assert.ok(html.includes('Station and Transport English in Germany'));
  assert.ok(html.includes('Supermarket English in Germany'));
  assert.ok(html.includes('Hotel and Apartment Stay English in Germany'));
  assert.ok(html.includes('Buildings and Shopping Malls in Germany'));
  assert.ok(html.includes('Exhibition Venue English in Germany'));
  assert.ok(html.includes('boarding pass'));
  assert.ok(html.includes('passport control'));
  assert.ok(html.includes('address registration'));
  assert.ok(html.includes('contactless payment'));
  assert.ok(html.includes('period pain'));
  assert.ok(html.includes('sanitary pad'));
  assert.ok(html.includes('validate the ticket'));
  assert.ok(html.includes('still water'));
  assert.ok(html.includes('verification code'));
  assert.ok(html.includes('business license'));
  assert.ok(html.includes('bank charge'));
  assert.ok(html.includes('surface treatment'));
  assert.ok(html.includes('root cause'));
  assert.ok(html.includes('weather forecast'));
  assert.ok(html.includes('squat toilet'));
  assert.ok(html.includes('circuit breaker'));
  assert.ok(html.includes('permission slip'));
  assert.ok(html.includes('residence permit'));
  assert.ok(html.includes('emergency contact'));
  assert.ok(html.includes('action item'));
  assert.ok(html.includes('factory visit'));
  assert.ok(html.includes('expiration date'));
  assert.ok(html.includes('soy sauce'));
  assert.ok(html.includes('customs form'));
  assert.ok(html.includes('sensitive skin'));
  assert.ok(html.includes('washing label'));
  assert.ok(html.includes('property management'));
  assert.ok(html.includes('overwhelmed'));
  assert.ok(html.includes('shipping mark'));
  assert.ok(html.includes('lower back'));
  assert.ok(html.includes('traffic light'));
  assert.ok(html.includes('license plate'));
  assert.ok(html.includes('business day'));
  assert.ok(html.includes('raw material'));
  assert.ok(html.includes('stainless steel'));
  assert.ok(html.includes('volume discount'));
  assert.ok(html.includes('certificate of origin'));
  assert.ok(html.includes('emergency exit'));
  assert.ok(html.includes('staff only'));
  assert.ok(html.includes('pedestrian zone'));
  assert.ok(html.includes('departure board'));
  assert.ok(html.includes('replacement bus'));
  assert.ok(html.includes('fare zone'));
  assert.ok(html.includes('bottle deposit'));
  assert.ok(html.includes('bottle return machine'));
  assert.ok(html.includes('best-before date'));
  assert.ok(html.includes('Wi-Fi password'));
  assert.ok(html.includes('maintenance request'));
  assert.ok(html.includes('visitor badge'));
  assert.ok(html.includes('parking garage'));
  assert.ok(html.includes('visitor registration'));
  assert.ok(html.includes('booth number'));
  assert.ok(html.includes('product sample'));
  assert.equal(html.includes('Eingang / entrance'), false);
  assert.equal(html.includes('Ausgang / exit'), false);
  assert.equal(html.includes('Notausgang / emergency exit'), false);
  assert.equal(html.includes('Kasse / checkout'), false);
  assert.equal(html.includes('Pfand / bottle deposit'), false);
  assert.equal(html.includes('WLAN / Wi-Fi'), false);
  assert.equal(html.includes('Rezeption / reception'), false);
  assert.ok(html.includes('purchase order'));
  assert.ok(html.includes('scope of supply'));
  assert.ok(html.includes('customs clearance'));
  assert.ok(html.includes('tracking number'));
  assert.ok(html.includes('internal discussion'));
  assert.ok(html.includes('target price'));
  assert.ok(html.includes('I will resend the quotation to you now.'));
  assert.ok(html.includes('Is the tap water drinkable here?'));
  assert.ok(html.includes('How early should we arrive at the airport?'));
  assert.ok(html.includes('The quotation is valid for seven days.'));
  assert.ok(html.includes('Please confirm the delivery address and consignee name.'));
  assert.ok(html.includes('Could you explain the dosage in simple English?'));
  assert.ok(html.includes('Which platform is for trains to the city center?'));
  assert.ok(html.includes('I did not receive the verification code.'));
  assert.ok(html.includes('Please send the serial number and a short video of the issue.'));
  assert.ok(html.includes('It is chilly outside, so wear one more layer.'));
  assert.ok(html.includes('The floor drain is clogged again.'));
  assert.ok(html.includes('What time is pick-up today?'));
  assert.ok(html.includes('Do I need proof of address for this registration?'));
  assert.ok(html.includes('Someone is hurt. Please call an ambulance.'));
  assert.ok(html.includes('Our booth is in Hall 3.'));
  assert.ok(html.includes('Where is the dairy section?'));
  assert.ok(html.includes('Mince the garlic before you heat the oil.'));
  assert.ok(html.includes('Do I need to fill out a customs form?'));
  assert.ok(html.includes('I need a moisturizer for sensitive skin.'));
  assert.ok(html.includes('This neighborhood has good greenery and feels quiet.'));
  assert.ok(html.includes('Please confirm the shipping mark before we print the labels.'));
  assert.ok(html.includes('My ankle is swollen after I twisted it.'));
  assert.ok(html.includes('Turn left at the traffic light.'));
  assert.ok(html.includes('Could I get a receipt for the fare?'));
  assert.ok(html.includes('It will be ready within three business days.'));
  assert.ok(html.includes('The raw materials are ready for production.'));
  assert.ok(html.includes('Do you need stainless steel or carbon steel?'));
  assert.ok(html.includes('Could you share your target price?'));
  assert.ok(html.includes('Please confirm the HS code with your customs broker.'));
  assert.ok(html.includes('Where is the main entrance?'));
  assert.ok(html.includes('Do I need to validate this ticket?'));
  assert.ok(html.includes('Where can I take the replacement bus?'));
  assert.ok(html.includes('Where is the bottle return machine?'));
  assert.ok(html.includes('Could I have the Wi-Fi password?'));
  assert.ok(html.includes('Do I need a visitor badge?'));
  assert.ok(html.includes('Our booth is in Hall 3, booth B18.'));
  assert.ok(html.includes('Can I borrow your charger for a minute?'));
  assert.ok(html.includes('Make sure the door is locked before you leave.'));
});

test('includes story speaking library for narrative practice', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('id="storyBtn"'));
  assert.ok(html.includes('data-dash-action="stories"'));
  assert.ok(html.includes('const STORY_LIBRARY'));
  assert.ok(html.includes('showStoryLibrary'));
  assert.ok(html.includes('storyIndexHtml'));
  assert.ok(html.includes('storyQuickKeywords'));
  assert.ok(html.includes('data-story-jump'));
  assert.ok(html.includes('data-story-search'));
  assert.ok(html.includes('口播目录'));
  assert.ok(html.includes('personal-arm-scar-commute'));
  assert.ok(html.includes('The Scar on My Arm and the Commute I Finally Questioned'));
  assert.ok(html.includes('Every time I see the scar on my arm, I still pause for a second.'));
  assert.ok(html.includes('I know my colleague did not mean to hurt me, but the pain was so sharp that I almost fainted.'));
  assert.ok(html.includes('Maybe accepting it does not mean I like it.'));
  assert.ok(html.includes('germany-station-platform-change-story'));
  assert.ok(html.includes('When the Platform Changes at a German Station'));
  assert.ok(html.includes('The platform had changed from seven to twelve.'));
  assert.ok(html.includes('exhibition-setup-first-morning'));
  assert.ok(html.includes('Setting Up the Booth on the First Morning'));
  assert.ok(html.includes('A booth does not need to look perfect, but it needs to feel ready.'));
  assert.ok(html.includes('china-breakfast-stall-morning'));
  assert.ok(html.includes('The Breakfast Stall Outside the Community Gate'));
  assert.ok(html.includes('Sometimes culture is also a warm plastic bag in someone'));
  assert.ok(html.includes('airport-gate-change-calmly'));
  assert.ok(html.includes('When the Gate Changes at the Airport'));
  assert.ok(html.includes('Travel teaches you one small habit: check the screen even when you think you already know.'));
  assert.ok(html.includes('child-apologizes-after-breaking-toy'));
  assert.ok(html.includes('Teaching a Child to Apologize After Breaking a Toy'));
  assert.ok(html.includes('A good apology does not make the past disappear, but it can make the next step cleaner.'));
  assert.ok(html.includes('two-kids-delay-bath-bedtime'));
  assert.ok(html.includes('When Two Kids Keep Delaying Bath and Bedtime'));
  assert.ok(html.includes('you can choose the order, but bath time still has to happen.'));
  assert.ok(html.includes('bedtime-small-talk-with-children'));
  assert.ok(html.includes('When I Do Not Know What to Talk About Before Sleep'));
  assert.ok(html.includes('Sometimes the best bedtime talk is just listening without fixing anything.'));
  assert.ok(html.includes('stop-saying-hurry-up-all-night'));
  assert.ok(html.includes('I Do Not Want to Say Hurry Up All Night'));
  assert.ok(html.includes('But I want my children to remember more than my tired voice.'));
  assert.ok(html.includes('two-children-fairness-bedtime'));
  assert.ok(html.includes('When Two Children Think Bedtime Is Not Fair'));
  assert.ok(html.includes('Children may still complain, but they can slowly learn that love is not a math problem.'));
  assert.ok(html.includes('child-worries-before-sleep'));
  assert.ok(html.includes('When a Child Suddenly Worries About Tomorrow'));
  assert.ok(html.includes('you are safe with me, and we can handle one step at a time.'));
  assert.ok(html.includes('疤痕'));
  assert.ok(html.includes('电动车'));
  assert.ok(html.includes('找到 ${stories.length} 段口播'));
  assert.ok(html.includes('card.scrollIntoView'));
  assert.ok(html.includes('英文口播'));
  assert.ok(html.includes('中英跟读'));
  assert.ok(html.includes('晚饭后扫餐桌下面'));
  assert.ok(html.includes('下班后做辣椒炒鸡蛋'));
  assert.ok(html.includes('刚到德国第一次逛超市'));
  assert.ok(html.includes('报价后客户突然安静了'));
  assert.ok(html.includes('早上醒来发现快迟到了'));
  assert.ok(html.includes('洗头时发现掉发有点多'));
  assert.ok(html.includes('厕所堵了先别继续冲水'));
  assert.ok(html.includes('在超市想买卫生巾但不知道怎么问'));
  assert.ok(html.includes('客户说价格高，我解释不能只比价格'));
  assert.ok(html.includes('和邻居聊小区环境'));
  assert.ok(html.includes('出门倒垃圾忘带钥匙'));
  assert.ok(html.includes('洗衣服时白衣服被染色了'));
  assert.ok(html.includes('第一次看房问清楚租房细节'));
  assert.ok(html.includes('去药店描述喉咙痛'));
  assert.ok(html.includes('孩子发烧给老师发消息请假'));
  assert.ok(html.includes('客户现场看机器不急着下结论'));
  assert.ok(html.includes('一个人去诊所时有点紧张'));
  assert.ok(html.includes('听不懂别人说话时觉得有点委屈'));
  assert.ok(html.includes('深夜突然想家'));
  assert.ok(html.includes('请病假时怕麻烦同事'));
  assert.ok(html.includes('搬到新住处的第一晚'));
  assert.ok(html.includes('别人问我中国日常生活是什么样'));
  assert.ok(html.includes('到德国机场后跟着 Arrival 和 Baggage Claim 走'));
  assert.ok(html.includes('入境时被问来德国做什么'));
  assert.ok(html.includes('德国火车站看懂 Platform、Track 和 Exit'));
  assert.ok(html.includes('在德国售票机前不知道怎么买票'));
  assert.ok(html.includes('德国超市买水、面包和简单晚饭'));
  assert.ok(html.includes('德国餐馆第一次点餐怕说错'));
  assert.ok(html.includes('After dinner, I looked under the table and noticed that the floor was pretty messy.'));
  assert.ok(html.includes('The point was not to force an answer, but to make the next step clear.'));
  assert.ok(html.includes('I woke up and realized that my alarm had not gone off.'));
  assert.ok(html.includes('The water level started to rise, so I stopped and did not flush again.'));
  assert.ok(html.includes('At first, I felt a little embarrassed to ask, but then I told myself it was just a normal daily need.'));
  assert.ok(html.includes('I wanted the customer to feel that I was helping him compare properly, not just defending my price.'));
  assert.ok(html.includes('The moment the door closed behind me, I realized I had made a mistake.'));
  assert.ok(html.includes('Lesson learned: next time I will separate white clothes from dark clothes before washing.'));
  assert.ok(html.includes('I asked how much the deposit was and whether utilities were included in the rent.'));
  assert.ok(html.includes('At the customer site, the customer took me to see the machine in the workshop.'));
  assert.ok(html.includes('It was not only because I felt unwell, but also because I was afraid I would not understand everything.'));
  assert.ok(html.includes('For a moment, I felt small, like everyone else knew what was happening except me.'));
  assert.ok(html.includes('I still missed home, but I also knew I was slowly learning how to live here.'));
  assert.ok(html.includes('I wanted him to understand the small real details, not just imagine China from news or travel videos.'));
  assert.ok(html.includes('The signs showed Passport Control, Baggage Claim, Customs, and Exit.'));
  assert.ok(html.includes('I kept my answer simple and said I was here for a business trip and customer training.'));
  assert.ok(html.includes('I checked the train number first, then the departure time, and then the platform or track number.'));
  assert.ok(html.includes('I learned that I do not need perfect English to eat out; I just need clear and polite English.'));
  assert.ok(html.includes('Buying a SIM Card and Checking Mobile Data'));
  assert.ok(html.includes('When the Hotel Wi-Fi Does Not Work'));
  assert.ok(html.includes('When the Train Is Delayed and the Platform Changes'));
  assert.ok(html.includes('Returning Deposit Bottles at the Supermarket'));
  assert.ok(html.includes('Asking About House Rules in a Temporary Stay'));
  assert.ok(html.includes('Finding a Seat and Power Outlet in a Cafe'));
  assert.ok(html.includes('I mainly needed mobile data for maps, messages, and translation.'));
  assert.ok(html.includes('I went down to the front desk and explained that the Wi-Fi was not connecting in my room.'));
  assert.ok(html.includes('People around me started moving, so I knew something had changed.'));
  assert.ok(html.includes('It felt like a tiny local habit, but learning it made daily life feel more normal.'));
  assert.ok(html.includes('Before visiting a customer in Germany, I did not want to rely only on the address in the email.'));
  assert.ok(html.includes('A small quiet corner can make a busy day feel much easier.'));
  assert.ok(html.includes('Getting Through Airport Security Without Panicking'));
  assert.ok(html.includes('Using a Luggage Locker at the Station'));
  assert.ok(html.includes('Taking a Bus or Tram in the Right Direction'));
  assert.ok(html.includes('When Someone Checks Your Ticket'));
  assert.ok(html.includes('Buying Vegetables and Checking How to Weigh Them'));
  assert.ok(html.includes('Asking Whether Card or Cash Is Better'));
  assert.ok(html.includes('Asking for the Bill and Receipt After a Meal'));
  assert.ok(html.includes('Asking for Towels and Housekeeping at the Hotel'));
  assert.ok(html.includes("Checking In at a Customer's Reception Desk"));
  assert.ok(html.includes("Visiting a Customer's Workshop in Germany"));
  assert.ok(html.includes('When Someone Stops at Your Booth at a Trade Fair'));
  assert.ok(html.includes('Checking a Public Notice You Do Not Understand'));
  assert.ok(html.includes('I was not sure whether my laptop should come out.'));
  assert.ok(html.includes('I saved the locker number and took a photo of the screen just in case.'));
  assert.ok(html.includes('I learned that asking early is much better than pretending I understand everything.'));
  assert.ok(html.includes('I did not over-explain; I just answered the questions clearly.'));
  assert.ok(html.includes('It was a tiny shopping detail, but it helped me feel less like a visitor and more like someone living there.'));
  assert.ok(html.includes('I did not jump into a long sales pitch right away.'));
  assert.ok(html.includes('Leaving Luggage at the Hotel After Checkout'));
  assert.ok(html.includes('Asking for Help After Missing a Train Connection'));
  assert.ok(html.includes('When Nearby Shops Are Closed and You Need a Backup Plan'));
  assert.ok(html.includes('Asking How Trash Sorting Works at a New Place'));
  assert.ok(html.includes('Asking About Heating and Windows in a German Room'));
  assert.ok(html.includes('Sending a Parcel or Returning an Online Order'));
  assert.ok(html.includes('Trying to Book a Doctor Appointment When You Feel Unwell'));
  assert.ok(html.includes('Making Natural Small Talk at a Customer Dinner'));
  assert.ok(html.includes('Following Up on WhatsApp After a Customer Meeting'));
  assert.ok(html.includes('That simple question saved me from worrying about my suitcase all afternoon.'));
  assert.ok(html.includes('Once I had the train number and platform, I felt less helpless.'));
  assert.ok(html.includes('Living abroad is full of small buttons and habits that nobody explains unless you ask.'));
  assert.ok(html.includes('I did not diagnose myself; I just learned how to ask for help clearly.'));
  assert.ok(html.includes('A good follow-up should help the customer remember the conversation, not feel chased.'));
  assert.ok(html.includes('Getting the Keys and Learning How the Door Works'));
  assert.ok(html.includes('Paying for Laundry in a Shared Laundry Room'));
  assert.ok(html.includes('When Self-Checkout Gets Stuck at the Supermarket'));
  assert.ok(html.includes('Asking at a Pharmacy About Allergy or Skin Discomfort'));
  assert.ok(html.includes('Finding the Right Way During an Airport Transfer'));
  assert.ok(html.includes('Confirming Meeting Points by Email With a Customer'));
  assert.ok(html.includes('When You Do Not Fully Understand a Technical Question'));
  assert.ok(html.includes('Organizing Receipts and Travel Details Before Leaving Germany'));
  assert.ok(html.includes('I practiced once while the host was still there, because I did not want to panic later.'));
  assert.ok(html.includes('I did not keep pressing random buttons because I did not want to make it worse.'));
  assert.ok(html.includes('Panic makes me miss details.'));
  assert.ok(html.includes('Not understanding everything is not the real problem; pretending to understand is.'));
  assert.ok(html.includes('Good records are quiet work, but they save a lot of trouble later.'));
  assert.ok(html.includes('When Your New SIM Card Has No Signal'));
  assert.ok(html.includes('Finding a Restroom When Payment or a Code Is Needed'));
  assert.ok(html.includes('Picking Up a Food Order at a Counter'));
  assert.ok(html.includes('Asking About Breakfast Ingredients at a Hotel'));
  assert.ok(html.includes('Withdrawing Cash From an ATM Carefully'));
  assert.ok(html.includes('When a Customer Reschedules a Meeting'));
  assert.ok(html.includes('Finding the Right Address and Doorbell Name'));
  assert.ok(html.includes('Checking Whether You Are in the Right Line'));
  assert.ok(html.includes('That small signal icon felt like a little piece of freedom in a new country.'));
  assert.ok(html.includes('A restroom question is not embarrassing; everybody needs it at some point.'));
  assert.ok(html.includes('Breakfast abroad became easier when I stopped guessing and started asking about ingredients.'));
  assert.ok(html.includes('A calm reply kept the relationship smooth even when the plan changed.'));
  assert.ok(html.includes('Now I know that an address is not always enough; sometimes the doorbell name matters just as much.'));
  assert.ok(html.includes('Contacting Maintenance About a Leaking Sink'));
  assert.ok(html.includes('Almost Mixing Up a Doctor Appointment Time'));
  assert.ok(html.includes('Having Lunch With German Colleagues for the First Time'));
  assert.ok(html.includes('When a Customer Asks for a Discount Right After the Quote'));
  assert.ok(html.includes('Sorting Business Cards and Leads After a Trade Fair Day'));
  assert.ok(html.includes('Recovering Naturally After Missing a Customer Message'));
  assert.ok(html.includes("Packing a Child's Schoolbag for Tomorrow"));
  assert.ok(html.includes('Sending a Message When Rain Makes You Late'));
  assert.ok(html.includes('I took a few photos and sent a short message to the landlord or maintenance contact.'));
  assert.ok(html.includes('Instead of guessing, I called again and said I wanted to confirm my appointment.'));
  assert.ok(html.includes('Sometimes connection starts with a simple question about food.'));
  assert.ok(html.includes('The goal was not to win the argument, but to find a workable option.'));
  assert.ok(html.includes('A trade fair does not end when the hall closes; it continues in the notes you keep.'));
  assert.ok(html.includes('Making a mistake is uncomfortable, but fixing it clearly can still protect trust.'));
  assert.ok(html.includes('It was not a formal lesson; it was just real life with simple words.'));
  assert.ok(html.includes('Being late is not good, but early communication makes it easier for everyone.'));
  assert.ok(html.includes("'维修','医生','同事','展会','孩子','迟到'"));
  assert.ok(html.includes('Realizing Your Passport Is Not in the Bag Before Leaving'));
  assert.ok(html.includes('Trying to Pay at a Parking Machine'));
  assert.ok(html.includes('Checking the Dosage After Buying Medicine'));
  assert.ok(html.includes('Recording a Machine Video at the Customer Site'));
  assert.ok(html.includes('Making Sure the Invoice Company Name Is Exactly Right'));
  assert.ok(html.includes('Messaging the Teacher When a Child Has a Fever at Night'));
  assert.ok(html.includes('Talking Politely About Noise From Upstairs'));
  assert.ok(html.includes('Reviewing the Day in Simple English at Night'));
  assert.ok(html.includes('Leaving enough time saved me from turning a small mistake into a real problem.'));
  assert.ok(html.includes('Next time, I will read the signs first and ask before I get nervous.'));
  assert.ok(html.includes('For medicine, understanding the instructions matters more than acting confident.'));
  assert.ok(html.includes('A useful video is not just about recording; it is about recording the right thing with permission.'));
  assert.ok(html.includes('Careful checking at the beginning saves many emails later.'));
  assert.ok(html.includes('When family life gets messy, simple clear words are often enough.'));
  assert.ok(html.includes('A polite sentence does not guarantee the problem disappears, but it gives peace a chance.'));
  assert.ok(html.includes('Learning a language becomes easier when daily life itself becomes the textbook.'));
  assert.ok(html.includes("'停车','发票','邻居','复盘'"));
  assert.ok(html.includes('When a Customer Goes Silent After a Quote'));
  assert.ok(html.includes('When the Customer Says the Price Is Too High'));
  assert.ok(html.includes('At a Pharmacy, Describe Symptoms Before Guessing the Illness'));
  assert.ok(html.includes('At the Airport, Watch Three Words First'));
  assert.ok(html.includes('Why the Invoice Name Must Be Exactly Right'));
  assert.ok(html.includes('In Germany, Do Not Wait Until Sunday to Buy Essentials'));
  assert.ok(html.includes('A Clear Question Saves Time When You Do Not Understand'));
  assert.ok(html.includes('Do Not Only Memorize English; Review Real Life'));
  assert.ok(html.includes('Good follow-up is not chasing; it is helping the next step become clear.'));
  assert.ok(html.includes('When I explain the number, the conversation feels less like a fight over a discount.'));
  assert.ok(html.includes('In health situations, simple truth is better than confident guessing.'));
  assert.ok(html.includes('At the airport, I care less about perfect sentences and more about finding the next counter or gate.'));
  assert.ok(html.includes('I would rather spend two minutes checking the invoice name than twenty emails fixing it later.'));
  assert.ok(html.includes('This is not only English; it is a small life habit abroad.'));
  assert.ok(html.includes('I still feel a bit awkward asking, but the conversation usually gets easier after that.'));
  assert.ok(html.includes('That is the kind of English I actually remember the next morning.'));
  assert.ok(html.includes("'短视频'"));
  assert.ok(html.includes("'跟进'"));
  assert.ok(html.includes("'谈价'"));
  assert.ok(html.includes("'学习方法'"));
  assert.ok(html.includes('Travel Is Not Only About Taking Photos'));
  assert.ok(html.includes('A Timeline Helps History Make Sense'));
  assert.ok(html.includes('Historical Figures Are Not Simple Labels'));
  assert.ok(html.includes('Being Calm Does Not Mean Having No Boundaries'));
  assert.ok(html.includes('Teach Children Trust Through Small Promises'));
  assert.ok(html.includes('A Museum Is Not Just a Place for Old Things'));
  assert.ok(html.includes('Long-term Work Is Not Built on Excitement Alone'));
  assert.ok(html.includes('Cultural Confidence Is Not Loud Superiority'));
  assert.ok(html.includes('A good trip does not only fill your album; it changes how you notice the world.'));
  assert.ok(html.includes('Learning history is learning to see time, not just learning to remember numbers.'));
  assert.ok(html.includes('A mature view of history leaves room for facts, context, and judgment together.'));
  assert.ok(html.includes('Real kindness should include respect for others and respect for yourself.'));
  assert.ok(html.includes('A reliable adult is often the first lesson in trust for a child.'));
  assert.ok(html.includes('A museum becomes interesting when old things start to speak about real people.'));
  assert.ok(html.includes('But small progress repeated for a long time becomes a different life.'));
  assert.ok(html.includes('It is easier to share my culture when I am not trying to win the conversation.'));
  assert.ok(html.includes('Start With the Market When You Visit a City'));
  assert.ok(html.includes('Du Fu Was Not Only a Poet in a Textbook'));
  assert.ok(html.includes('Talking About Zheng He Without Only Talking About Big Ships'));
  assert.ok(html.includes("A Historical Map Is Not Today's Map"));
  assert.ok(html.includes('When You Miss Home in a New Place'));
  assert.ok(html.includes('When a Child Loses a Game, Do Not Rush Past the Feeling'));
  assert.ok(html.includes('Kindness Can Pause Before Saying Yes'));
  assert.ok(html.includes('It Is Okay to Have an Accent'));
  assert.ok(html.includes('The famous square is still worth seeing, but the stall where someone is arguing over tomatoes feels closer to daily life.'));
  assert.ok(html.includes('When I explain him this way, he stops feeling like a name printed under a poem.'));
  assert.ok(html.includes('That question stays with me longer than the number of ships.'));
  assert.ok(html.includes('So when I see an old map, I try to slow down before I point and say a modern name.'));
  assert.ok(html.includes('After a short call home, I can usually go back to the new day in front of me.'));
  assert.ok(html.includes('I am still learning this one. Saying no early is kinder than saying yes and disappearing later.'));
  assert.ok(html.includes('These days I care more about being understood than sounding like someone from a movie.'));
  assert.ok(html.includes('Check the Platform Again Before Taking a Train in Germany'));
  assert.ok(html.includes('Do Not Forget the Bottle Deposit in Germany'));
  assert.ok(html.includes('Ask the Breakfast Time Clearly at a Hotel'));
  assert.ok(html.includes('Following Up After a Quote Without Sounding Pushy'));
  assert.ok(html.includes('What to Say After You Spoke Too Harshly'));
  assert.ok(html.includes('The Silk Road Was Not One Straight Road'));
  assert.ok(html.includes('How to Describe a Nice Neighborhood Without Only Saying Beautiful'));
  assert.ok(html.includes('When a Child Keeps Asking Why Before Bed'));
  assert.ok(html.includes('Missing one sign can cost more energy than asking one simple question.'));
  assert.ok(html.includes('After a few times, it becomes just another small habit of shopping there.'));
  assert.ok(html.includes('A clear question at the front desk can save a hungry walk in the hallway later.'));
  assert.ok(html.includes('If the customer still does not reply, I may ask one lighter question later: should I keep this on my follow-up list?'));
  assert.ok(html.includes('Usually the conversation becomes softer after one honest sentence.'));
  assert.ok(html.includes('That rough part makes the history easier for me to believe.'));
  assert.ok(html.includes('Another sentence is: the buildings are not new, but the area is well kept.'));
  assert.ok(html.includes('This keeps the door open without turning bedtime into a two-hour meeting.'));
  assert.ok(html.includes('Bring a Shopping Bag Before Going to the Supermarket'));
  assert.ok(html.includes('What to Say at Airport Security'));
  assert.ok(html.includes('Finding the Restroom When the Sign Does Not Say Bathroom'));
  assert.ok(html.includes('Still Water or Sparkling Water at a Restaurant'));
  assert.ok(html.includes('Describe Stomach Pain Clearly Before Guessing the Illness'));
  assert.ok(html.includes('How to Ask for Leave in Simple English'));
  assert.ok(html.includes('How to Say You Are Losing a Lot of Hair'));
  assert.ok(html.includes('Squat Toilet and Sitting Toilet'));
  assert.ok(html.includes('The hardest part is often not English. It is staying calm while people are waiting behind you.'));
  assert.ok(html.includes('A short question is better than opening the wrong bag three times.'));
  assert.ok(html.includes('When you really need the toilet, one clear sentence is enough.'));
  assert.ok(html.includes('These sentences are simple, but they keep the meal from turning into guessing.'));
  assert.ok(html.includes('A better sentence is: I have stomach pain, and it started this morning.'));
  assert.ok(html.includes('For personal leave, I can say: I need to take a day off for a personal matter.'));
  assert.ok(html.includes('One day I looked at the shower drain and felt scared by how much hair was there.'));
  assert.ok(html.includes('These are not words for exams. They are words for awkward moments.'));
  assert.ok(html.includes('In Germany, Look for an Apotheke When You Need Medicine'));
  assert.ok(html.includes('Read the Door Signs Before You Push or Pull'));
  assert.ok(html.includes('Explaining the Deposit Before Production Starts'));
  assert.ok(html.includes('When the Customer Changes the Specification Midway'));
  assert.ok(html.includes('When a Child Breaks a Cup'));
  assert.ok(html.includes('Chinese Tea Is More Than a Drink'));
  assert.ok(html.includes('Ask About Trash Sorting During Your First Week in Germany'));
  assert.ok(html.includes('When You Feel Left Out in a Conversation'));
  assert.ok(html.includes('That makes the short conversation much safer and clearer.'));
  assert.ok(html.includes('One calm look at the door can save one awkward minute.'));
  assert.ok(html.includes('I ask: could you send the bank slip so we can check with our finance team?'));
  assert.ok(html.includes('I do this because memory is not a good contract.'));
  assert.ok(html.includes('Next time, we move the cup farther from the edge. That is enough for today.'));
  assert.ok(html.includes('It is a quiet way to make a guest feel less like a stranger.'));
  assert.ok(html.includes('It is better to look careful than to mix everything because I feel shy.'));
  assert.ok(html.includes('I do not need to be funny right away. I just need a small place to stand.'));
  assert.ok(html.includes('Returning an Item Without Starting a Fight'));
  assert.ok(html.includes('Buying the Right Bus or Tram Ticket'));
  assert.ok(html.includes('Asking a Customer to Confirm Without Sounding Cold'));
  assert.ok(html.includes('When a Customer Says They Will Think About It'));
  assert.ok(html.includes('When a Child Says They Do Not Want to Go to School'));
  assert.ok(html.includes('Messaging the Landlord About a Repair'));
  assert.ok(html.includes('Chinese New Year Is Not Only Red and Lucky'));
  assert.ok(html.includes('Crowded, Busy, Packed: Different Ways to Say There Are Many People'));
  assert.ok(html.includes('A lot of people think returning something means you have to argue, but most of the time you just need your facts ready.'));
  assert.ok(html.includes('The scary part of public transport abroad is not always the price; it is buying the wrong kind of ticket.'));
  assert.ok(html.includes('Everyone says please confirm, but that sentence alone often sounds cold and easy to ignore.'));
  assert.ok(html.includes('When a customer says I will think about it, many salespeople hear no, but sometimes it means not yet.'));
  assert.ok(html.includes('When a child says I do not want to go to school, the fastest answer is you have to go, but it may not be the most useful one.'));
  assert.ok(html.includes('Broken is a useful word, but if everything is broken, the landlord still does not know what happened.'));
  assert.ok(html.includes('If I explain Chinese New Year with only red and lucky, I feel like I have missed the real part.'));
  assert.ok(html.includes('Many people is correct English, but it often sounds like you are only counting heads.'));
  assert.ok(html.includes('Confucius Is More Than an Old Saying'));
  assert.ok(html.includes('Su Shi Was Talented, But Also Very Human'));
  assert.ok(html.includes('The Forbidden City Is Not Just a Big Palace'));
  assert.ok(html.includes('Look at the Faces of the Terracotta Warriors'));
  assert.ok(html.includes('The Grand Canal Moved More Than Water'));
  assert.ok(html.includes('Dunhuang Was a Meeting Place, Not Just Beautiful Art'));
  assert.ok(html.includes('The Spring Festival Travel Rush Is More Than Crowds'));
  assert.ok(html.includes('A Hutong Is Not Just an Old Wall'));
  assert.ok(html.includes('If a foreign friend asks who Confucius was, famous philosopher is correct, but it feels too thin.'));
  assert.ok(html.includes('People often introduce Su Shi by saying he was talented, but that is only the door, not the room.'));
  assert.ok(html.includes('If I only say the Forbidden City is a big palace, the listener may imagine one large building and miss the feeling of the place.'));
  assert.ok(html.includes("A useful sentence is: the Terracotta Warriors were made for the tomb of China's first emperor, Qin Shi Huang."));
  assert.ok(html.includes('If you think the Grand Canal is just a long river, you miss why it mattered.'));
  assert.ok(html.includes('Dunhuang is beautiful, but if we only say beautiful, we make it too small.'));
  assert.ok(html.includes('If you only say the Spring Festival travel rush is crowded, you are correct, but you miss the reason people still go.'));
  assert.ok(html.includes('A hutong can look like an old wall in a photo, but real life there is louder than the photo.'));
  assert.ok(html.includes('Explain Traditional Chinese Medicine Without Making It Mysterious'));
  assert.ok(html.includes('The Imperial Exam Was More Than an Ancient Test'));
  assert.ok(html.includes('The Yangtze River Is Not Only a Long River'));
  assert.ok(html.includes('The Yellow River Is More Than the Mother River'));
  assert.ok(html.includes('The Dragon Boat Festival Is Not Only Zongzi'));
  assert.ok(html.includes('Li Bai Was Not Only Romantic'));
  assert.ok(html.includes('Sanxingdui Feels Strange at First, and That Is the Point'));
  assert.ok(html.includes('Delivery Riders Show the Speed of a Chinese City'));
  assert.ok(html.includes('When people talk about traditional Chinese medicine, the conversation can become mysterious too quickly.'));
  assert.ok(html.includes('If I translate 科举 as ancient exam, the English is not wrong, but the story becomes too small.'));
  assert.ok(html.includes('The Yangtze River is long, yes, but if we stop there, it becomes a line on a map.'));
  assert.ok(html.includes('Mother river is a strong phrase, but if I only say that, people may not know what the Yellow River actually did.'));
  assert.ok(html.includes('If I explain the Dragon Boat Festival only with zongzi, I can make foreigners hungry, but not really understand the festival.'));
  assert.ok(html.includes('Li Bai is often described as romantic, but that word alone is too clean for him.'));
  assert.ok(html.includes('Some ancient objects look familiar, but Sanxingdui almost refuses to look familiar.'));
  assert.ok(html.includes('If you want to understand a Chinese city today, do not only look at tall buildings; watch the delivery riders for five minutes.'));
  assert.ok(html.includes('A Teahouse Is Not Just a Place to Drink Tea'));
  assert.ok(html.includes('A Temple Fair Is Loud, Crowded, and Alive'));
  assert.ok(html.includes('A County Town Can Explain a Lot About China'));
  assert.ok(html.includes('Market Day Is More Than Shopping'));
  assert.ok(html.includes('An Ancestral Hall Holds Family Memory'));
  assert.ok(html.includes('A Chinese Garden Teaches You to Look Slowly'));
  assert.ok(html.includes('West Lake Is Scenery, Stories, and City Life Together'));
  assert.ok(html.includes('A Night Market Is Smoke, Choice, and Small Decisions'));
  assert.ok(html.includes('If I call a teahouse just a place to drink tea, I miss the chairs, the voices, and the slow time inside it.'));
  assert.ok(html.includes('A temple fair is not the quiet kind of tradition you only see in a museum.'));
  assert.ok(html.includes('If you only talk about Beijing, Shanghai, and Shenzhen, you may miss a large part of ordinary China.'));
  assert.ok(html.includes('Market day is shopping, yes, but in many towns it is also a weekly meeting of real life.'));
  assert.ok(html.includes('An ancestral hall is connected with ancestors, family names, ceremonies, and village memory.'));
  assert.ok(html.includes('A Chinese garden is not trying to show everything at once, and that is why some visitors miss it at first.'));
  assert.ok(html.includes('West Lake is beautiful, but saying only beautiful feels like taking one photo and leaving too early.'));
  assert.ok(html.includes('A night market looks like noise first, but after a while you start to hear small choices inside it.'));
  assert.ok(html.includes('City Walk Is Not Just Wandering Around'));
  assert.ok(html.includes('Museum Merch Is Not Just Cute Stuff'));
  assert.ok(html.includes('Hanfu Photos Are Not Just Dressing Up'));
  assert.ok(html.includes('New Chinese-Style Tea Drinks Are More Than Milk Tea'));
  assert.ok(html.includes('Livestream Shopping Is Not Just Shouting a Low Price'));
  assert.ok(html.includes('Electric Cars Are Cool Until You Need a Charger'));
  assert.ok(html.includes('Delivery Robots Are Cute Until They Meet Real Streets'));
  assert.ok(html.includes('Blind Boxes Are Not Just Toys for Children'));
  assert.ok(html.includes('Some people hear city walk and think it just means wandering around with nothing to do.'));
  assert.ok(html.includes('When museum merch becomes popular, it is easy to laugh and say people are just buying cute stuff.'));
  assert.ok(html.includes('Some people see Hanfu photos and say it is only dressing up, but that answer is too quick.'));
  assert.ok(html.includes('It is easy to say new Chinese-style tea drinks are just milk tea with nicer packaging.'));
  assert.ok(html.includes('If you only see livestream shopping as someone shouting cheap, cheap, cheap, you miss why people keep watching.'));
  assert.ok(html.includes('Electric cars look futuristic in videos, but real life starts when the battery drops below twenty percent.'));
  assert.ok(html.includes('A delivery robot looks cute online, but a real street is not a clean demo room.'));
  assert.ok(html.includes('Blind boxes look childish at first, until you notice how many adults are buying them after work.'));
  assert.ok(html.includes('High-Speed Rail Is Fast, But the Real Story Is Daily Life'));
  assert.ok(html.includes('Mobile Payment Feels Easy, But It Is Not Magic'));
  assert.ok(html.includes('A Community Canteen Is More Than a Cheap Meal'));
  assert.ok(html.includes('Square Dancing Is About Music, Exercise, and Public Space'));
  assert.ok(html.includes('County-Town Coffee Is Not Just Copying Big Cities'));
  assert.ok(html.includes('Exam Pressure Is Not Only About Wanting Stability'));
  assert.ok(html.includes('Short Dramas Are Fast Because Emotions Are Fast'));
  assert.ok(html.includes('Old Chinese Brands Are Trying to Speak Younger'));
  assert.ok(html.includes('If I describe Chinese high-speed rail only as fast, I miss why people depend on it so much.'));
  assert.ok(html.includes('Mobile payment in China can feel so easy that people forget how many small steps are hiding behind it.'));
  assert.ok(html.includes('A community canteen may look like a place for cheap lunch, but for some people it is also a reason to go downstairs.'));
  assert.ok(html.includes('If you call square dancing just aunties dancing, you miss the public-space problem behind it.'));
  assert.ok(html.includes('When a coffee shop opens in a small county town, some people laugh and say the town is copying big cities.'));
  assert.ok(html.includes('When young people prepare for exams again and again, it is easy to say they only want stability.'));
  assert.ok(html.includes('Short dramas can look ridiculous if you only watch one dramatic scene out of context.'));
  assert.ok(html.includes('When an old Chinese brand changes its packaging, some people say it is just trying to look young.'));
  assert.ok(html.includes("'文旅'"));
  assert.ok(html.includes("'历史'"));
  assert.ok(html.includes("'人物'"));
  assert.ok(html.includes("'情感'"));
  assert.ok(html.includes("'价值观'"));
  assert.ok(html.includes("'文化'"));
  assert.ok(html.includes("'博物馆'"));
});

test('includes separate bedtime encyclopedia library for children', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('id="bedtimeBtn"'));
  assert.ok(html.includes('data-dash-action="bedtime"'));
  assert.ok(html.includes('const BEDTIME_LIBRARY'));
  assert.ok(html.includes('showBedtimeLibrary'));
  assert.ok(html.includes('renderBedtimeStories'));
  assert.ok(html.includes('playBedtimeStory'));
  assert.ok(html.includes('playBedtimePlaylist'));
  assert.ok(html.includes('playBedtimeStoryOnce'));
  assert.ok(html.includes('createBedtimeQueue'));
  assert.ok(html.includes('markBedtimeListened'));
  assert.ok(html.includes('homeEnglishBedtimeListenedIds'));
  assert.ok(html.includes('homeEnglishBedtimeSkipListened'));
  assert.ok(html.includes('homeEnglishBedtimeTimerMinutes'));
  assert.ok(html.includes('bedtime-player'));
  assert.ok(html.includes('睡前播放器 1.0'));
  assert.ok(html.includes('data-bedtime-recommend'));
  assert.ok(html.includes('data-bedtime-playlist="filtered"'));
  assert.ok(html.includes('data-bedtime-playlist="unlistened"'));
  assert.ok(html.includes('data-bedtime-timer'));
  assert.ok(html.includes('data-bedtime-stop'));
  assert.ok(html.includes('跳过已听'));
  assert.ok(html.includes('只听未听过'));
  assert.equal(html.includes('中文讲故事'), false);
  assert.equal(html.includes('中英亲子讲'), false);
  assert.equal(html.includes('英文慢慢听'), false);
  assert.ok(html.includes('英文讲故事'));
  assert.ok(html.includes('BEDTIME_TTS_OPTIONS'));
  assert.ok(html.includes("voice:'fable'"));
  assert.ok(html.includes('bedtime-storyteller'));
  assert.ok(html.includes('Read in warm, expressive bedtime storyteller style for a child.'));
  assert.ok(html.includes('The Night Journey of a Drop of Water'));
  assert.ok(html.includes('How a Grain of Rice Arrives in a Bowl'));
  assert.ok(html.includes('The Second Life of a Cardboard Box'));
  assert.ok(html.includes('A tiny drop of water woke up on the edge of the kitchen tap.'));
  assert.ok(html.includes('The child suddenly understood that dinner was not just something that appeared'));
  assert.ok(html.includes('Some things are not just trash; they are materials waiting for a smarter choice.'));
  assert.ok(html.includes("catName:'睡前百科'"));
  assert.ok(html.includes('BEDTIME_LIBRARY.length'));
  assert.ok(html.includes('A Small Brick on the Great Wall'));
  assert.ok(html.includes('How a Map Tries to Lay the Earth Flat'));
  assert.ok(html.includes('The Tiny Ant City Under Our Feet'));
  assert.ok(html.includes('A Little Bell on the Silk Road'));
  assert.ok(html.includes('History was not only kings and battles; it was also someone staying awake when others slept.'));
  assert.ok(html.includes('A good map does not finish your thinking; it wakes it up.'));
  assert.ok(html.includes('There may be whole little worlds under places we usually ignore.'));
  assert.ok(html.includes('Maybe a road stays alive whenever people are willing to meet, listen, and learn.'));
  assert.ok(html.includes('The Little Boats Inside Our Blood'));
  assert.ok(html.includes('Why the Moon Seems to Follow Me'));
  assert.ok(html.includes('The Invisible Passages Under a City'));
  assert.ok(html.includes('A Letter Left by a Dinosaur Footprint'));
  assert.ok(html.includes('Sometimes the most important work is the quiet work we cannot see.'));
  assert.ok(html.includes('a good question can be like a small lamp in your mind.'));
  assert.ok(html.includes('A city is also the careful work underneath, helping everyone live above.'));
  assert.ok(html.includes('The dinosaur was gone, but one footprint still said, I was here.'));
  assert.ok(html.includes('The Little Seed Under the Window'));
  assert.ok(html.includes('The Day a Library Bookmark Remembered'));
  assert.ok(html.includes('How a Porcelain Bowl Reached the Dinner Table'));
  assert.ok(html.includes('a seed is quiet, but quiet does not mean empty.'));
  assert.ok(html.includes('A book is patient enough for all of them.'));
  assert.ok(html.includes('A bowl was no longer just a bowl.'));
  assert.ok(html.includes('data-bedtime-search'));
  assert.ok(html.includes('The Loose Tooth That Was Not So Scary'));
  assert.ok(html.includes('being brave can mean feeling scared and still taking care of yourself'));
  assert.ok(html.includes('Why the Compass Needle Wants to Find North'));
  assert.ok(html.includes('the earth itself can guide a little needle'));
  assert.ok(html.includes('A Boat of Rice on the Grand Canal'));
  assert.ok(html.includes('History was not only emperors, battles, and big gates.'));
  assert.ok(html.includes('How a Thermos Makes Winter Feel Smaller'));
  assert.ok(html.includes('Care is not always a big speech.'));
  assert.ok(html.includes('loose-tooth-brave-night-story'));
  assert.ok(html.includes('compass-needle-finds-north-story'));
  assert.ok(html.includes('grand-canal-grain-boat-story'));
  assert.ok(html.includes('thermos-keeps-winter-warm-story'));
  assert.ok(html.includes('The Apartment Garden After Rain'));
  assert.ok(html.includes('A city has big roads, but it also needs small quiet places that can breathe.'));
  assert.ok(html.includes('The Short Life of a Soap Bubble'));
  assert.ok(html.includes('Some beautiful things ask us to look gently, not grab quickly.'));
  assert.ok(html.includes('What an Old City Wall Sees at Dusk'));
  assert.ok(html.includes('History was not locked behind glass; it was standing beside the road.'));
  assert.ok(html.includes('The Bean Inside the Lunchbox'));
  assert.ok(html.includes('take what you can eat, and try not to waste what others worked for'));
  assert.ok(html.includes('apartment-garden-after-rain-story'));
  assert.ok(html.includes('soap-bubble-short-life-story'));
  assert.ok(html.includes('old-city-wall-evening-story'));
  assert.ok(html.includes('bean-in-lunchbox-story'));
});

test('page stays usable without external font cdn links', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.equal(html.includes('fonts.googleapis.com'), false);
  assert.equal(html.includes('fonts.gstatic.com'), false);
});

test('includes teacher tts controls and hard-item ear training drawer', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('teacherMode'));
  assert.ok(html.includes('teacherEndpoint'));
  assert.ok(html.includes("const DEFAULT_TEACHER_ENDPOINT='/tts'"));
  assert.ok(html.includes("const PRIVATE_SITE_HOST='home-english-private.cherryyijiatec.workers.dev'"));
  assert.ok(html.includes('OLD_TEACHER_ENDPOINT'));
  assert.ok(html.includes('if(isPrivateSite())return DEFAULT_TEACHER_ENDPOINT'));
  assert.ok(html.includes('teacherEndpoint.readOnly=true'));
  assert.ok(html.includes('if(!normalized)return DEFAULT_TEACHER_ENDPOINT'));
  assert.ok(html.includes('if(isPrivateSite())localStorage.removeItem(TEACHER_ENDPOINT_KEY)'));
  assert.ok(html.includes('localStorage.removeItem(TEACHER_ENDPOINT_KEY)'));
  assert.ok(html.includes('homeEnglishTeacherAudio'));
  assert.ok(html.includes('earDrawer'));
  assert.ok(html.includes('earPlaySelected'));
  assert.ok(html.includes('earPlayAll'));
  assert.ok(html.includes('earDictation'));
  assert.ok(html.includes('earSource'));
  assert.ok(html.includes('earCategory'));
  assert.ok(html.includes('earSkipRead'));
  assert.ok(html.includes('earClearRead'));
  assert.ok(html.includes('homeEnglishEarReadIds'));
  assert.ok(html.includes('homeEnglishEarCategory'));
  assert.ok(html.includes('getAllEarItems'));
  assert.ok(html.includes('getEarCategories'));
  assert.ok(html.includes('filterEarCategoryItems'));
  assert.ok(html.includes('currentEarItems'));
  assert.ok(html.includes('markEarRead(item.id)'));
  assert.ok(html.includes('中文，再英文'));
  assert.ok(html.includes('听写本组'));
  assert.ok(html.includes('dictationPanel'));
  assert.ok(html.includes('dictationSecondsLeft=60'));
  assert.ok(html.includes('正在报中文'));
  assert.ok(html.includes('makeLangUtter'));
  assert.ok(html.includes('speakFreeLang(item.zh'));
  assert.ok(html.includes('正在改用老师级中文朗读'));
  assert.ok(html.includes('显示答案'));
  assert.ok(html.includes('goNextDictationItem'));
  assert.ok(html.includes('跳过已读'));
});

test('public github pages host shows private entry instead of the study app', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes("location.hostname==='cherrywuma.github.io'"));
  assert.ok(html.includes('public-locked'));
  assert.ok(html.includes('https://home-english-private.cherryyijiatec.workers.dev/'));
});

test('opens with a study dashboard instead of only a long list', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(html.includes('class="home-mode"'));
  assert.ok(html.includes('studyDashboard'));
  assert.ok(html.includes('今日十句'));
  assert.ok(html.includes('继续上次场景'));
  assert.ok(html.includes('按场景学'));
  assert.ok(html.includes('enterListMode'));
});

test('cloudflare worker keeps the openai key off the static page', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const worker = fs.readFileSync(path.join(__dirname, '..', 'cloudflare-worker.js'), 'utf8');
  const protectedWorker = fs.readFileSync(path.join(__dirname, '..', 'protected-site-worker.js'), 'utf8');

  assert.equal(html.includes('OPENAI_API_KEY'), false);
  assert.ok(worker.includes('OPENAI_API_KEY'));
  assert.ok(worker.includes('https://api.openai.com/v1/audio/speech'));
  assert.ok(worker.includes('gpt-4o-mini-tts'));
  assert.ok(worker.includes('BUILT_IN_VOICES'));
  assert.ok(worker.includes('speechPayload.instructions = instructions'));
  assert.ok(worker.includes('body.voice'));
  assert.ok(worker.includes('body.instructions'));
  assert.ok(worker.includes('Access-Control-Allow-Origin'));
  assert.equal(worker.includes('https://cherrywuma.github.io'), false);
  assert.ok(worker.includes("return jsonResponse({ error: 'Origin not allowed' }, 403, origin);"));
  assert.ok(html.includes("throw new Error('tts-not-audio')"));
  assert.ok(html.includes("msg==='tts-401'"));
  assert.ok(protectedWorker.includes("if (url.pathname === '/tts') return proxyTts(request);"));
  assert.ok(protectedWorker.includes("if (url.pathname === '/tts') return jsonResponse({ error: 'login-required' }, 401);"));
  assert.ok(protectedWorker.includes("'Origin': 'https://home-english-private.cherryyijiatec.workers.dev'"));
  assert.ok(html.includes("credentials:'same-origin'"));
  assert.ok(html.includes('playTeacherBlobWithContext'));
  assert.ok(html.includes('unlockTeacherAudio'));
  assert.ok(html.includes('teacherErrorText'));
  assert.ok(html.includes('requestTeacherAudio'));
  assert.ok(html.includes('res.status===404&&isPrivateSite()&&endpoint===DEFAULT_TEACHER_ENDPOINT'));
  assert.ok(html.includes('fetch(OLD_TEACHER_ENDPOINT'));
  assert.ok(html.includes('playSingleRepeat'));
  assert.ok(html.includes('singleRepeatActive'));
  assert.ok(html.includes('while(singleRepeatActive'));
  assert.ok(html.includes('stopSingleRepeat'));
  assert.ok(html.includes('row.onclick=()=>playSingleRepeat'));
  assert.ok(html.includes("if(btn&&btn.classList.contains('playing')){stopAll();return;}"));
  assert.ok(html.includes('while(seqActive)'));
  assert.ok(html.includes('循环朗读本节'));
  assert.ok(html.includes('if(i>=items.length)'));
  assert.ok(html.includes('i=0;'));
  assert.ok(html.includes('setTimeout(next,650)'));
  assert.ok(html.includes("btn.classList.add('playing')"));
});

test('service worker version is bumped after section repeat reading', () => {
  const worker = fs.readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8');

  assert.ok(worker.includes('home-english-v141'));
});

test('service worker asks the network before falling back to old cache', () => {
  const worker = fs.readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8');
  const fetchIndex = worker.indexOf('fetch(e.request).then');
  const cacheIndex = worker.indexOf('caches.match(e.request)');

  assert.ok(fetchIndex >= 0);
  assert.ok(cacheIndex > fetchIndex);
});
