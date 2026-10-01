const assert = require('assert');
const { tokenize, cleanList, parseJson, scoreProduct } = require('../utils/aiText');

assert.deepStrictEqual(tokenize('Show me peaceful nature paintings'), ['me'].filter(() => false).concat(['peaceful', 'nature', 'paintings']));
assert.deepStrictEqual(tokenize('traditional coastal art'), ['traditional', 'coastal']);

assert.deepStrictEqual(cleanList(['Sea ', 'sea', 'SKY', '', 'x'.repeat(50)], 5), ['sea', 'sky']);
assert.deepStrictEqual(cleanList('nope', 5), []);

assert.deepStrictEqual(parseJson('```json\n{"a":1}\n```'), { a: 1 });
assert.deepStrictEqual(parseJson('Here you go: {"a":2} thanks'), { a: 2 });
assert.throws(() => parseJson('no json here'));

const coastal = { title: 'Coastal Memories', description: 'Fishing boats at a quiet shore', category: 'Painting', aiTags: ['coastal', 'boats'], aiKeywords: ['sea', 'harbour'], aiThemes: ['memory'], soldCount: 0 };
const urban = { title: 'The Last Monsoon', description: 'Rain-soaked streets', category: 'Illustration', aiTags: ['rain'], aiKeywords: ['street', 'city'], aiThemes: ['urban life'], soldCount: 0 };
const terms = [{ t: 'traditional coastal art', w: 2 }, { t: 'coastal', w: 2 }, { t: 'sea', w: 1 }, { t: 'harbour', w: 1 }];

const a = scoreProduct(coastal, terms);
const b = scoreProduct(urban, terms);
assert.ok(a.score > 0 && b.score === 0, 'coastal artwork matches, urban one does not');
assert.ok(a.matched.includes('coastal') && a.matched.includes('sea'));

// plurals match; substrings of other words do not ("sea" must not match "season")
assert.ok(scoreProduct({ title: 'x', aiTags: ['paintings'] }, [{ t: 'painting', w: 1 }]).score > 0);
assert.strictEqual(scoreProduct({ title: 'Season of change', aiTags: [] }, [{ t: 'sea', w: 1 }]).score, 0);

console.log('aiText tests passed');