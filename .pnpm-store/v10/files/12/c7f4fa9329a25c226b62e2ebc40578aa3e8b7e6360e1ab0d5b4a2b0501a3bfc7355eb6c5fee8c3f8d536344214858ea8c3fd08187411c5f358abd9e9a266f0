"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

// seal-cjs-exports
(function () {
  var keys = Object.getOwnPropertyNames(exports);
  for (var i = 0; i < keys.length; i++) {
    var desc = Object.getOwnPropertyDescriptor(exports, keys[i]);
    if (!desc || !desc.get || !desc.configurable) continue;
    var value;
    try {
      value = desc.get();
    } catch (e) {
      continue;
    }
    // a circular require may not have settled this one yet, so leave it live
    if (value === undefined) continue;
    Object.defineProperty(exports, keys[i], { value: value, writable: false, enumerable: desc.enumerable, configurable: false });
  }
  Object.freeze(exports);
})();
