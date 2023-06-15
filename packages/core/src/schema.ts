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
  private _options: IDBObjectStoreParameters | undefined;

  constructor(name: string, fields: T, options?: IDBObjectStoreParameters) {
    super();

    this._name = name;
    this._fields = fields;
    this._options = options;
  }

  get name(): string {
    return this._name;
  }

  get fields(): DoubleZeroShape {
    return this._fields;
  }

  get options(): IDBObjectStoreParameters | undefined {
    return this._options;
  }
}

function store<T extends DoubleZeroShape>(
  name: string,
  fields: T,
  options?: IDBObjectStoreParameters
): DoubleZeroStore<T> {
  return new DoubleZeroStore(name, fields, options);
}

type DoubleZeroSchema = Record<string, DoubleZeroStore<DoubleZeroShape>>;

export { store, number, string };
export type {
  DoubleZeroSchema,
  DoubleZeroShape,
  InferDoubleZeroType,
  DoubleZeroAnyType,
  DoubleZeroStore,
};
