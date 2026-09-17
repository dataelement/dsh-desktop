"use strict";
Object.defineProperty(exports, "__esModule", { value: !0 });
var index = require("./index.cjs");
class EventSourceParserStream extends TransformStream {
  constructor({ onError, onRetry, onComment, maxBufferSize } = {}) {
    let parser;
    super({
      start(controller) {
        parser = index.createParser({
          onEvent: (event) => {
            controller.enqueue(event);
          },
          onError(error) {
            typeof onError == "function" && onError(error), (onError === "terminate" || error.type === "max-buffer-size-exceeded") && controller.error(error);
          },
          onRetry,
          onComment,
          maxBufferSize
        });
      },
      transform(chunk) {
        parser.feed(chunk);
      }
    });
  }
}
exports.ParseError = index.ParseError;
exports.EventSourceParserStream = EventSourceParserStream;
//# sourceMappingURL=stream.cjs.map
