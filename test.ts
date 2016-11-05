import BobX from './index';

const obj = {
    isFoo: true,
    foo: 1,
    bar: 2,
    baz: 3
};
const watched = BobX.watched(obj);

const foo = BobX.cached(() => {
    console.log('computing foo');
    return watched.foo;
});
const barBaz = BobX.cached(() => {
    console.log('computing bar baz');
    return watched.bar * watched.baz;
});
const full = BobX.cached(() => {
    console.log('computing full');
    return watched.isFoo ? foo() : barBaz();
});

function printer() {
    console.log('printer', full(), watched.isFoo, watched.foo, watched.bar, watched.baz);
    console.log();
}
BobX.autorun(printer);

printer();
watched.foo = 2;
printer();
watched.bar = 3;
printer();
watched.bar = 4;
printer();
watched.bar = 3;
printer();
watched.isFoo = false;
printer();
watched.foo = 4;
printer();
watched.bar = 5;
printer();