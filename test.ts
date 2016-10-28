import * as bobx from './index';

const obj = {
    isFoo: true,
    foo: 1,
    bar: 2,
    baz: 3
};
const watched = bobx.watched(obj);

function computer() {
    console.log('computing...');
    return watched.isFoo ? watched.foo : watched.bar * watched.baz;
}
const computed = bobx.computed(computer);

function printer() {
    console.log(computed(), watched.isFoo, watched.foo, watched.bar, watched.baz);
}
bobx.autorun(printer);

watched.foo = 2;
watched.bar = 3;
watched.isFoo = false;
watched.foo = 4;
watched.bar = 5;