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
});

test('service worker version is bumped after teacher tts changes', () => {
  const worker = fs.readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8');

  assert.ok(worker.includes('home-english-v71'));
});

test('service worker asks the network before falling back to old cache', () => {
  const worker = fs.readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8');
  const fetchIndex = worker.indexOf('fetch(e.request).then');
  const cacheIndex = worker.indexOf('caches.match(e.request)');

  assert.ok(fetchIndex >= 0);
  assert.ok(cacheIndex > fetchIndex);
});
