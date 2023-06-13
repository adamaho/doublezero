/* -------------------------------------------------------------------------------------
 * Type Utils 
 * -------------------------------------------------------------------------------------*/
type Identity<T> = T;
type Flatten<T> = Identity<{[k in keyof T]: T[k]}>;
type InferDoubleZeroType<T extends DoubleZeroAnyType> = T["_output"];

/* -------------------------------------------------------------------------------------
 * Common Types 
 * -------------------------------------------------------------------------------------*/
type DoubleZeroAnyType = DoubleZeroType<any>;
type DoubleZeroShape = Record<string, DoubleZeroAnyType>;

/* -------------------------------------------------------------------------------------
 * DoubleZeroType 
 * -------------------------------------------------------------------------------------*/
abstract class DoubleZeroType<T = any> {
  readonly _output!: T;
}

/* -------------------------------------------------------------------------------------
 * DoubleZeroObject
 * -------------------------------------------------------------------------------------*/
type BaseObjectOutput<S extends DoubleZeroShape> = {
  [k in keyof S]: S[k]["_output"]; 
} 

type ObjectOutput<S extends DoubleZeroShape> = Flatten<BaseObjectOutput<S>>;

class DoubleZeroObject<T extends DoubleZeroShape> extends DoubleZeroType<ObjectOutput<T>> {
  constructor() {
    super();
  }
}

function object<T extends DoubleZeroShape>(object: T): DoubleZeroObject<T> {
  return new DoubleZeroObject();
}

/* -------------------------------------------------------------------------------------
 * DoubleZeroNumber
 * -------------------------------------------------------------------------------------*/
class DoubleZeroNumber<T = number> extends DoubleZeroType<T> {
  constructor() {
    super();
  }
}

function number(): DoubleZeroNumber {
  return new DoubleZeroNumber();
}

/* -------------------------------------------------------------------------------------
 * Demo 
 * -------------------------------------------------------------------------------------*/
const foo = object({
  hello: number(),
  bar: number(),
  foo: object({
    bar: number(),
    thing: object({
      lol: number()
    })
  })
})

type Foo = InferDoubleZeroType<typeof foo>
