import * as events from 'events';

const PROP_GET = 'prop-get';
const PROP_CHANGE = 'prop-change';
const METHOD_GET = 'method-get';
const METHOD_CHANGE = 'method-change';
const METHOD_START = 'method-start';
const METHOD_END = 'method-end';
const METHOD_INVALID = 'method-invalid';

class WatchableProp<T> {
    private value: T;
    emitter: events.EventEmitter;
    
    constructor(value: T) {
        this.value = value;
        this.emitter = new events.EventEmitter();
    }
    
    get = () => {
        this.emitter.emit(PROP_GET, this);
        return this.value;
    }
    
    set = (value: T) => {
        if (value !== this.value) {
            this.value = value;
            this.emitter.emit(PROP_CHANGE, this);
        }
    }
}

class CachedMethod<T> {
    private method: () => T;
    private value: T;
    emitter: events.EventEmitter;
    
    private needsRun: boolean;
    private isInvalid: boolean;
    private maybeChangedMethods: CachedMethod<any>[];
    private changeListenerUnsubs: Function[];
    
    private otherEvents: events.EventEmitter;
    private runListenerUnsubs: Function[];
    private runDepth: number;
    
    constructor(method: () => T, otherEvents: events.EventEmitter) {
        this.method = method;
        this.value = null;
        this.emitter = new events.EventEmitter();
        
        this.needsRun = true;
        this.maybeChangedMethods = [];
        this.changeListenerUnsubs = [];
        
        this.otherEvents = otherEvents;
    }
    
    getValue(): T {
        this.update();
        this.emitter.emit(METHOD_GET, this);
        return this.value;
    }
    
    update() {
        if (this.needsRun) {
            this.run();
            this.needsRun = false;
        } else if (this.isInvalid) {
            for(const method of this.maybeChangedMethods) {
                method.update();
                if (this.needsRun) {
                    this.run();
                    break;
                }
            }
            this.maybeChangedMethods = [];
            this.needsRun = false;
            this.isInvalid = false;
        }
    }
    
    private run() {
        const oldValue = this.value;
        
        this.preRun();
        this.value = this.method();
        this.postRun();
        
        if (oldValue !== this.value) {
            this.emitter.emit(METHOD_CHANGE, this);
        }
    }
    
    private preRun() {
        this.changeListenerUnsubs.forEach(unsub => unsub());
        this.changeListenerUnsubs = [];
        
        this.maybeChangedMethods = [];
        this.runDepth = 0;
        
        this.emitter.emit(METHOD_START, this);
        
        this.runListenerUnsubs = [
            subscribe(this.otherEvents, PROP_GET, this.propGetListener),
            subscribe(this.otherEvents, METHOD_GET, this.methodGetListener),
            subscribe(this.otherEvents, METHOD_START, () => this.runDepth++),
            subscribe(this.otherEvents, METHOD_END, () => this.runDepth--)
        ];
    }
    
    private postRun() {
        this.runListenerUnsubs.forEach(unsub => unsub());
        
        this.emitter.emit(METHOD_END, this);
    }
    
    private propGetListener = (prop: WatchableProp<any>) => {
        if (this.runDepth !== 0) {
            return;
        }

        this.changeListenerUnsubs.push(
            subscribe(prop.emitter, PROP_CHANGE, this.changeListener)
        );
    }
    
    private methodGetListener = (otherMethod: CachedMethod<any>) => {
        if (this.runDepth !== 0) {
            return;
        }
        
        this.changeListenerUnsubs.push(
            subscribe(otherMethod.emitter, METHOD_CHANGE, this.changeListener),
            subscribe(otherMethod.emitter, METHOD_INVALID, this.invalidListener)
        );
    }
    
    private changeListener = () => {
        this.needsRun = true;
        if (!this.isInvalid) {
            this.isInvalid = true;
            this.emitter.emit(METHOD_INVALID, this);
        }
    }
    
    private invalidListener = (otherMethod: CachedMethod<any>) => {
        this.maybeChangedMethods.push(otherMethod);
        if (!this.isInvalid) {
            this.isInvalid = true;
            this.emitter.emit(METHOD_INVALID, this);
        }
    }
}

class BobXInstance {
    emitter = new events.EventEmitter();
    
    watched<T>(object: T): T {
        const newObject = {};
        Object.keys(object).forEach(propertyName => {
            const prop = new WatchableProp<T>(object[propertyName]);
            connect(prop.emitter, this.emitter, [PROP_GET, PROP_CHANGE]);
            Object.defineProperty(newObject, propertyName, {
                set: prop.set,
                get: prop.get
            });
        });
    
        return <T>newObject;
    }
    
    cached<T>(method: () => T): () => T {
        const newMethod = new CachedMethod(method, this.emitter);
        connect(newMethod.emitter, this.emitter, [METHOD_GET, METHOD_CHANGE, METHOD_START, METHOD_END, METHOD_INVALID]);
        return () => newMethod.getValue();
    }
    
    autorun(func: () => void): () => void {
        return null;
    }
}

export default new BobXInstance();

function subscribe(emitter: events.EventEmitter, eventName: string, listener: Function): Function {
    emitter.on(eventName, listener);
    return () => emitter.removeListener(eventName, listener);
}

function connect(source: events.EventEmitter, sink: events.EventEmitter, eventNames: string[]): Function {
    const unsubs: Function[] = eventNames.map(eventName => {
        return subscribe(source, eventName, function() { sink.emit.call(sink, eventName, ...Array.prototype.slice.apply(arguments)); });
    });
    return () => { unsubs.forEach(unsub => unsub()) };
}
