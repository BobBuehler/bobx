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

MobX.autorun(() => full.get());

printer();
printer();
watched.foo = 2;
printer();
watched.foo = 2;
printer();
watched.bar = 3;
printer();
watched.isFoo = false;
printer();
MobX.action(() => {
    watched.bar = 1;
    watched.baz = 9;
})();
printer();
watched.isFoo = true;
printer();
watched.isFoo = false;
printer();

//////

class Boo {
  v: number = 1;
}
const store = MobX.observable({
    boo: new Boo(),
    hoo: { v: 1 }
});
const booValue = MobX.computed(() => {
    return store.boo.v;
});
const hooValue = MobX.computed(() => {
    return store.hoo.v;
});

function booHoo() { console.log(`${store.boo.v}=${booValue.get()}, ${store.hoo.v}=${hooValue.get()}`); }
MobX.autorun(booHoo);
store.boo.v++;
store.hoo.v++;
store.boo.v++;
store.hoo.v++;
booHoo();