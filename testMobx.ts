import * as mobx from 'mobx';

const obj = {
    isFoo: true,
    foo: 1,
    bar: 2,
    baz: 3
};
const watched = mobx.observable(obj);

const computer = {
    get value() {
        console.log('computing...');
        return watched.isFoo ? watched.foo : watched.bar * watched.baz;
    }
}

const computed = mobx.observable(computer);

function printer() {
    console.log(computed.value, watched.isFoo, watched.foo, watched.bar, watched.baz);
}
mobx.autorun(printer);

watched.foo = 2;
watched.bar = 3;
watched.isFoo = false;
watched.foo = 4;
watched.bar = 5;