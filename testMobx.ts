import * as MobX from 'mobx';

const watched = MobX.observable({
    isFoo: true,
    foo: 1,
    bar: 2,
    baz: 3
});

const foo = MobX.computed(() => {
    console.log('computing foo');
    return watched.foo;
});
const barBaz = MobX.computed(() => {
    console.log('computing bar baz');
    return watched.bar * watched.baz;
});
const full = MobX.computed(() => {
    console.log('computing full');
    return watched.isFoo ? foo.get() : barBaz.get();
});

function printer() {
    console.log('printer', full.get(), watched.isFoo, watched.foo, watched.bar, watched.baz);
    console.log();
}

printer();
printer();
watched.foo = 2;
printer();
watched.bar = 3;
printer();
watched.isFoo = false;
printer();
watched.bar = 1;
watched.baz = 9;
printer();