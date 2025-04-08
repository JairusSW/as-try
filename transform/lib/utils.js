export function replaceRef(node, replacement, ref) {
  if (!node || !ref) return;
  const nodeExpr = stripExpr(node);
  if (Array.isArray(ref)) {
    for (let i = 0; i < ref.length; i++) {
      if (stripExpr(ref[i]) === nodeExpr) {
        if (Array.isArray(replacement)) ref.splice(i, 1, ...replacement);
        else ref[i] = replacement;
        return;
      }
    }
  } else if (typeof ref === "object") {
    for (const key of Object.keys(ref)) {
      const current = ref[key];
      if (Array.isArray(current)) {
        for (let i = 0; i < current.length; i++) {
          if (stripExpr(current[i]) === nodeExpr) {
            if (Array.isArray(replacement))
              current.splice(i, 1, ...replacement);
            else current[i] = replacement;
            return;
          }
        }
      } else if (stripExpr(current) === nodeExpr) {
        ref[key] = replacement;
        return;
      }
    }
  }
}
export function replaceAfter(node, replacement, ref) {
  if (!node || !ref) return;
  const nodeExpr = stripExpr(node);
  if (Array.isArray(ref)) {
    let found = false;
    for (let i = 0; i < ref.length; i++) {
      if (found || stripExpr(ref[i]) === nodeExpr) {
        ref.splice(
          i,
          ref.length - i,
          ...(Array.isArray(replacement) ? replacement : [replacement]),
        );
        return;
      }
    }
  } else if (typeof ref === "object") {
    for (const key of Object.keys(ref)) {
      const current = ref[key];
      if (Array.isArray(current)) {
        let found = false;
        for (let i = 0; i < current.length; i++) {
          if (found || stripExpr(current[i]) === nodeExpr) {
            current.splice(
              i,
              current.length - i,
              ...(Array.isArray(replacement) ? replacement : [replacement]),
            );
            return;
          }
        }
      } else if (stripExpr(current) === nodeExpr) {
        ref[key] = replacement;
        return;
      }
    }
  }
}
export function stripExpr(node) {
  if (!node) return node;
  if (node.kind == 38) return node["expression"];
  return node;
}
export function nodeEq(a, b) {
  if (!a || !b) return false;
  if (!a["kind"] || !b["kind"]) return false;
  if (a === b) return true;
  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  )
    return false;
  const keys1 = Object.keys(a);
  const keys2 = Object.keys(b);
  if (keys1 !== keys2) return false;
  for (let key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!nodeEq(a[key], b[key])) return false;
  }
  return true;
}
export function isPrimitive(type) {
  const primitiveTypes = [
    "u8",
    "u16",
    "u32",
    "u64",
    "i8",
    "i16",
    "i32",
    "i64",
    "f32",
    "f64",
    "bool",
    "boolean",
  ];
  return primitiveTypes.some((v) => type.startsWith(v));
}
//# sourceMappingURL=utils.js.map
