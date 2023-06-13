/* -------------------------------------------------------------------------------------
 * Type Utils
 * -------------------------------------------------------------------------------------*/
type Identity<T> = T;
type Flatten<T> = Identity<{ [k in keyof T]: T[k] }>;
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
};

type ObjectOutput<S extends DoubleZeroShape> = Flatten<BaseObjectOutput<S>>;

class DoubleZeroObject<T extends DoubleZeroShape> extends DoubleZeroType<
  ObjectOutput<T>
> {
  constructor() {
    super();
  }
}

/* -------------------------------------------------------------------------------------
 * DoubleZeroNumber
 * -------------------------------------------------------------------------------------*/
class DoubleZeroNumber extends DoubleZeroType<number> {
  constructor() {
    super();
  }
}

function number(): DoubleZeroNumber {
  return new DoubleZeroNumber();
}

/* -------------------------------------------------------------------------------------
 * DoubleZeroString
 * -------------------------------------------------------------------------------------*/
class DoubleZeroString extends DoubleZeroType<string> {
  constructor() {
    super();
  }
}

function string(): DoubleZeroString {
  return new DoubleZeroString();
}

/* -------------------------------------------------------------------------------------
 * DoubleZeroStore
 * -------------------------------------------------------------------------------------*/
class DoubleZeroStore<T extends DoubleZeroShape> extends DoubleZeroObject<T> {
  private _name: string;
  private _fields: T;

  constructor(name: string, fields: T) {
    super();

    this._name = name;
    this._fields = fields;
  }
}

function store<T extends DoubleZeroShape>(
  name: string,
  fields: T
): DoubleZeroStore<T> {
  return new DoubleZeroStore(name, fields);
}

/* -------------------------------------------------------------------------------------
 * DoubleZeroSchema
 * -------------------------------------------------------------------------------------*/
type BaseDoubleZeroSchema<T extends DoubleZeroShape> = Record<
  string,
  DoubleZeroStore<T>
>;

class DoubleZeroSchema<
  T extends BaseDoubleZeroSchema<DoubleZeroShape>
> extends DoubleZeroObject<T> {
  private _stores: T;

  constructor(stores: T) {
    super();
    this._stores = stores;
  }
}

function schema<T extends BaseDoubleZeroSchema<DoubleZeroShape>>(
  fields: T
): DoubleZeroSchema<T> {
  return new DoubleZeroSchema(fields);
}

export { schema, store, number, string };
export type {
  BaseDoubleZeroSchema,
  DoubleZeroShape,
  InferDoubleZeroType,
  DoubleZeroSchema,
  DoubleZeroAnyType,
  DoubleZeroStore,
};
