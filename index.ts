interface Listener {
    (key: string): void
}

function remove<T>(arr: T[], val: T) {
    const index = arr.indexOf(val);
    if (index !== -1) {
        arr.splice(index, 1);
    }
}

class Notifier {
    globalListeners: Listener[] = [];
    keyListeners: {[index: string]: Listener[]} = {};

    addGlobalListener(listener: Listener): Function {
        this.globalListeners.push(listener);
        return () => remove(this.globalListeners, listener);
    }

    addKeyListener(key: string, listener: Listener): Function {
        let listeners = this.keyListeners[key];
        if (listeners === undefined) {
            listeners = this.keyListeners[key] = [listener];
        } else {
            listeners.push(listener);
        }
        return () => remove(listeners, listener);
    }

    notify(key: string): void {
        const listeners = this.keyListeners[key];
        if (listeners !== undefined) {
            listeners.slice().forEach(listener => listener(key));
        }
        this.globalListeners.slice().forEach(listener => listener(key));
    }
}

class KeyListenerTracker {
    notifier: Notifier;
    removers: {[index: string]: Function} = {};

    constructor(notifier: Notifier) {
        this.notifier = notifier;
    }

    add(key: string, listener: Listener): void {
        if (!this.removers[key]) {
            this.removers[key] = this.notifier.addKeyListener(key, listener)
        }
    }

    clear() {
        for (let key in this.removers) {
            this.removers[key]();
        }
        this.removers = {};
    }
}

let nextObjId = 0;
const changeNotifier = new Notifier();
const accessNotifier = new Notifier();

function getObjectId(): number {
    return nextObjId++;
}

function calcPropertyKey(objectId: number, propertyName: string): string {
    return `${objectId}#${propertyName}`;
}
export function watched<T extends Object>(obj: T): T {
    const newObj = {};
    const objectId = getObjectId();
    Object.keys(obj).forEach(propertyName => {
        const propertyKey = calcPropertyKey(objectId, propertyName);
        let propertyValue: T = obj[propertyName];
        Object.defineProperty(newObj, propertyName, {
            set: function(value) {
                propertyValue = value;
                changeNotifier.notify(propertyKey);
            },
            get: function() {
                accessNotifier.notify(propertyKey);
                return propertyValue;
            }
        });
    });

    return <T>newObj;
}

export function computed<T>(func: () => T): () => T {
    let isDirty = true;
    const changeListenerTracker = new KeyListenerTracker(changeNotifier)
    let value: T;

    return function() {
        if (isDirty){
            compute();
        }
        return value;
    };

    function compute() {
        isDirty = false;
        const accessListenerRemover = accessNotifier.addGlobalListener(onAccess);
        value = func();
        accessListenerRemover();
    }

    function onAccess(propertyKey: string) {
        changeListenerTracker.add(propertyKey, onDirty);
    }

    function onDirty() {
        isDirty = true;
        changeListenerTracker.clear();
    }
}

export function autorun(func: Function): Function {
    const changeListenerTracker = new KeyListenerTracker(changeNotifier);
    run();
    return () => changeListenerTracker.clear();

    function run() {
        const accessListenerRemover = accessNotifier.addGlobalListener(onAccess);
        func();
        accessListenerRemover();
    }

    function onAccess(propertyKey: string) {
        changeListenerTracker.add(propertyKey, onChange);
    }

    function onChange() {
        changeListenerTracker.clear();
        run();
    }
}
