type MatrixInit = Iterable<number> | ArrayLike<number> | undefined;
type MatrixSource = MinimalDOMMatrix | MatrixInit | string;

function toNumberArray(init: MatrixInit): number[] {
  if (!init) {
    return [];
  }

  return Array.from(init, (value) => Number(value));
}

class MinimalDOMMatrix {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;
  m11 = 1;
  m12 = 0;
  m13 = 0;
  m14 = 0;
  m21 = 0;
  m22 = 1;
  m23 = 0;
  m24 = 0;
  m31 = 0;
  m32 = 0;
  m33 = 1;
  m34 = 0;
  m41 = 0;
  m42 = 0;
  m43 = 0;
  m44 = 1;
  is2D = true;
  isIdentity = true;

  constructor(init?: MatrixSource) {
    if (typeof init === 'string') {
      this.syncFields();
      return;
    }

    if (init instanceof MinimalDOMMatrix) {
      this.setMatrix(init);
      return;
    }

    this.applyValues(toNumberArray(init));
  }

  multiplySelf(other: MinimalDOMMatrix | MatrixInit) {
    return this.setMatrix(multiplyMatrices(this, new MinimalDOMMatrix(other)));
  }

  preMultiplySelf(other: MinimalDOMMatrix | MatrixInit) {
    return this.setMatrix(multiplyMatrices(new MinimalDOMMatrix(other), this));
  }

  translateSelf(tx = 0, ty = 0, _tz = 0) {
    return this.multiplySelf([1, 0, 0, 1, tx, ty]);
  }

  scaleSelf(scaleX = 1, scaleY = scaleX, _scaleZ = 1, originX = 0, originY = 0, _originZ = 0) {
    if (originX || originY) {
      this.translateSelf(originX, originY);
    }

    this.multiplySelf([scaleX, 0, 0, scaleY, 0, 0]);

    if (originX || originY) {
      this.translateSelf(-originX, -originY);
    }

    return this;
  }

  invertSelf() {
    const determinant = this.a * this.d - this.b * this.c;

    if (!Number.isFinite(determinant) || determinant === 0) {
      return this.setMatrix({
        a: Number.NaN,
        b: Number.NaN,
        c: Number.NaN,
        d: Number.NaN,
        e: Number.NaN,
        f: Number.NaN,
      });
    }

    const next = {
      a: this.d / determinant,
      b: -this.b / determinant,
      c: -this.c / determinant,
      d: this.a / determinant,
      e: (this.c * this.f - this.d * this.e) / determinant,
      f: (this.b * this.e - this.a * this.f) / determinant,
    };

    return this.setMatrix(next);
  }

  toFloat32Array() {
    return new Float32Array([
      this.m11, this.m12, this.m13, this.m14,
      this.m21, this.m22, this.m23, this.m24,
      this.m31, this.m32, this.m33, this.m34,
      this.m41, this.m42, this.m43, this.m44,
    ]);
  }

  toFloat64Array() {
    return new Float64Array(this.toFloat32Array());
  }

  private applyValues(values: number[]) {
    if (values.length >= 6) {
      if (values.length >= 16) {
        this.m11 = values[0] ?? 1;
        this.m12 = values[1] ?? 0;
        this.m13 = values[2] ?? 0;
        this.m14 = values[3] ?? 0;
        this.m21 = values[4] ?? 0;
        this.m22 = values[5] ?? 1;
        this.m23 = values[6] ?? 0;
        this.m24 = values[7] ?? 0;
        this.m31 = values[8] ?? 0;
        this.m32 = values[9] ?? 0;
        this.m33 = values[10] ?? 1;
        this.m34 = values[11] ?? 0;
        this.m41 = values[12] ?? 0;
        this.m42 = values[13] ?? 0;
        this.m43 = values[14] ?? 0;
        this.m44 = values[15] ?? 1;
      } else {
        this.m11 = values[0] ?? 1;
        this.m12 = values[1] ?? 0;
        this.m21 = values[2] ?? 0;
        this.m22 = values[3] ?? 1;
        this.m41 = values[4] ?? 0;
        this.m42 = values[5] ?? 0;
      }
    }

    this.syncFields();
  }

  private setMatrix(values: Pick<MinimalDOMMatrix, 'a' | 'b' | 'c' | 'd' | 'e' | 'f'>) {
    this.a = values.a;
    this.b = values.b;
    this.c = values.c;
    this.d = values.d;
    this.e = values.e;
    this.f = values.f;
    this.syncFields();
    return this;
  }

  private syncFields() {
    this.m11 = this.a;
    this.m12 = this.b;
    this.m13 = 0;
    this.m14 = 0;
    this.m21 = this.c;
    this.m22 = this.d;
    this.m23 = 0;
    this.m24 = 0;
    this.m31 = 0;
    this.m32 = 0;
    this.m33 = 1;
    this.m34 = 0;
    this.m41 = this.e;
    this.m42 = this.f;
    this.m43 = 0;
    this.m44 = 1;
    this.is2D = true;
    this.isIdentity =
      this.a === 1 &&
      this.b === 0 &&
      this.c === 0 &&
      this.d === 1 &&
      this.e === 0 &&
      this.f === 0;
  }
}

function multiplyMatrices(
  left: Pick<MinimalDOMMatrix, 'a' | 'b' | 'c' | 'd' | 'e' | 'f'>,
  right: Pick<MinimalDOMMatrix, 'a' | 'b' | 'c' | 'd' | 'e' | 'f'>
) {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

export function ensurePdfJsNodePolyfills() {
  if (typeof globalThis.DOMMatrix === 'undefined') {
    Object.assign(globalThis, { DOMMatrix: MinimalDOMMatrix });
  }
}
